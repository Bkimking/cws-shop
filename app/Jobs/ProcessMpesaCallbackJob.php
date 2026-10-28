<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\MpesaPaymentFinalizer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessMpesaCallbackJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $backoff = 10;

    /**
     * @param  array<string, mixed>  $callback
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public readonly string $checkoutRequestId,
        public readonly int $resultCode,
        public readonly array $callback,
        public readonly array $metadata,
    ) {
        $this->onQueue('mpesa');
    }

    public function handle(MpesaPaymentFinalizer $finalizer): void
    {
        $payment = Payment::query()
            ->where('gateway', 'mpesa')
            ->where('gateway_reference', $this->checkoutRequestId)
            ->first();

        if ($payment === null || $payment->status !== 'pending') {
            return;
        }

        if ($this->resultCode === 0) {
            $finalizer->complete($payment, [
                'callback' => $this->callback,
                'receipt' => $this->metadata['MpesaReceiptNumber'] ?? null,
                'phone' => $this->metadata['PhoneNumber'] ?? null,
            ]);

            return;
        }

        $finalizer->fail(
            $payment,
            (string) ($this->callback['ResultDesc'] ?? 'Payment failed.'),
            ['callback' => $this->callback],
        );
    }
}
