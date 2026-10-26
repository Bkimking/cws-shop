<?php

namespace App\Services;

use App\Mail\OrderReadyForPickup;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PickupService
{
    public function markReady(Order $order, User $staff): Order
    {
        if ($order->pickup_warehouse_id === null) {
            throw ValidationException::withMessages([
                'pickup' => 'This order is not a storefront pickup order.',
            ]);
        }

        if ($order->status !== 'completed') {
            throw ValidationException::withMessages([
                'pickup' => 'Payment must be confirmed before this order can be marked ready.',
            ]);
        }

        if ($order->pickup_status === 'collected') {
            throw ValidationException::withMessages([
                'pickup' => 'This order has already been collected.',
            ]);
        }

        $order->forceFill([
            'pickup_status' => 'ready',
            'pickup_ready_at' => $order->pickup_ready_at ?? now(),
        ])->save();

        $this->notifyCustomer($order);

        return $order->refresh();
    }

    public function markCollected(Order $order, User $staff): Order
    {
        if ($order->pickup_warehouse_id === null) {
            throw ValidationException::withMessages([
                'pickup' => 'This order is not a storefront pickup order.',
            ]);
        }

        if ($order->pickup_status !== 'ready') {
            throw ValidationException::withMessages([
                'pickup' => 'Only an order that is ready can be marked collected.',
            ]);
        }

        $order->forceFill([
            'pickup_status' => 'collected',
            'collected_at' => now(),
            'collected_by' => $staff->id,
        ])->save();

        return $order->refresh();
    }

    private function notifyCustomer(Order $order): void
    {
        if (blank($order->customer_email) || $order->pickup_notified_at !== null) {
            return;
        }

        try {
            $order->load(['items.productVariant.product', 'pickupWarehouse.branch', 'branch']);

            Mail::to($order->customer_email)->send(new OrderReadyForPickup($order));

            $order->update(['pickup_notified_at' => now()]);
        } catch (Throwable $exception) {
            Log::warning('Pickup email could not be sent.', [
                'order_id' => $order->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
