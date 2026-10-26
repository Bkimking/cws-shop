<?php

namespace App\Services;

use App\Mail\OrderConfirmed;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MpesaPaymentFinalizer
{
    public function __construct(private readonly OrderStockService $stock) {}

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function complete(Payment $payment, array $metadata = []): void
    {
        if ($payment->status !== 'pending') {
            return;
        }

        $order = null;

        DB::transaction(function () use ($payment, $metadata, &$order): void {
            $payment->update([
                'status' => 'completed',
                'failure_reason' => null,
                'last_checked_at' => now(),
                'raw_response' => array_merge((array) $payment->raw_response, $metadata),
            ]);

            $order = $payment->order;

            $order->update([
                'status' => 'completed',
                'pickup_status' => $order->pickup_warehouse_id ? 'pending' : 'not_applicable',
                'pickup_ready_at' => null,
            ]);
        });

        if ($order !== null && $order->customer_email !== null) {
            $this->notifyConfirmation($order);
        }
    }

    private function notifyConfirmation(Order $order): void
    {
        if (blank($order->customer_email) || $order->confirmation_notified_at !== null) {
            return;
        }

        try {
            $order->load(['items.productVariant.product', 'pickupWarehouse.branch', 'branch']);

            Mail::to($order->customer_email)->send(new OrderConfirmed($order));

            $order->update(['confirmation_notified_at' => now()]);
        } catch (Throwable $exception) {
            Log::warning('Order confirmation email could not be sent.', [
                'order_id' => $order->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function fail(Payment $payment, string $reason, array $metadata = []): void
    {
        if ($payment->status !== 'pending') {
            return;
        }

        DB::transaction(function () use ($payment, $reason, $metadata): void {
            $payment->update([
                'status' => 'failed',
                'failure_reason' => $reason,
                'last_checked_at' => now(),
                'raw_response' => array_merge((array) $payment->raw_response, $metadata, [
                    'failure_reason' => $reason,
                ]),
            ]);

            $order = $payment->order;

            if ($order->status !== 'cancelled') {
                $order->update([
                    'status' => 'cancelled',
                    'pickup_status' => 'cancelled',
                ]);

                $this->stock->restock($order);
            }
        });
    }
}
