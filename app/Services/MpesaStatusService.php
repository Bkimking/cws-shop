<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class MpesaStatusService
{
    public function __construct(
        private readonly MpesaStkService $mpesa,
        private readonly MpesaPaymentFinalizer $finalizer,
    ) {}

    /**
     * Refresh a pending M-Pesa payment from Safaricom, at most once every
     * few seconds. This makes the POS and public order page self-healing
     * when a callback is delayed or never reaches the server.
     */
    public function refresh(Payment $payment, int $minimumSeconds = 4): Payment
    {
        if ($payment->status !== 'pending' || $payment->gateway !== 'mpesa') {
            return $payment;
        }

        if (blank($payment->gateway_reference)) {
            if ($payment->expires_at !== null && $payment->expires_at->isPast()) {
                $this->finalizer->fail($payment, 'No M-Pesa checkout request was recorded before the payment expired.');
            }

            return $payment->fresh();
        }

        if ($payment->last_checked_at !== null && $payment->last_checked_at->gt(now()->subSeconds($minimumSeconds))) {
            return $payment;
        }

        $lock = Cache::lock('mpesa-status:'.$payment->id, 10);

        if (! $lock->get()) {
            return $payment;
        }

        try {
            $payment->refresh();

            if ($payment->status !== 'pending') {
                return $payment;
            }

            $result = $this->mpesa->queryStatus((string) $payment->gateway_reference);
            $code = (string) ($result['ResultCode'] ?? '');
            $payment->update(['last_checked_at' => now()]);

            if ($code === '0') {
                $this->finalizer->complete($payment, ['reconciliation' => $result]);
            } elseif (in_array($code, ['1', '1032', '1037', '2001'], true)) {
                $this->finalizer->fail(
                    $payment,
                    (string) ($result['ResultDesc'] ?? 'M-Pesa payment did not complete.'),
                    ['reconciliation' => $result],
                );
            }
        } catch (Throwable $exception) {
            $payment->update(['last_checked_at' => now()]);

            Log::warning('M-Pesa status refresh failed.', [
                'payment_id' => $payment->id,
                'message' => $exception->getMessage(),
            ]);

            if ($payment->expires_at !== null && $payment->expires_at->isPast()) {
                $this->finalizer->fail($payment, 'M-Pesa did not confirm before the payment expired.');
            }
        } finally {
            $lock->release();
        }

        return $payment->fresh();
    }
}
