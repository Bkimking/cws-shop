<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\MpesaStatusService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ReconcileMpesaPaymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 15;

    public function __construct(public readonly int $paymentId)
    {
        $this->onQueue('mpesa');
    }

    public function handle(MpesaStatusService $statuses): void
    {
        $payment = Payment::query()->find($this->paymentId);

        if ($payment !== null) {
            $statuses->refresh($payment, 0);
        }
    }
}
