<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\MpesaPaymentFinalizer;
use App\Services\MpesaStkService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReconcileMpesaPayments extends Command
{
    protected $signature = 'mpesa:reconcile {--limit= : Maximum payments to inspect}';

    protected $description = 'Query stale pending M-Pesa payments and close or release them safely';

    public function handle(MpesaStkService $mpesa, MpesaPaymentFinalizer $finalizer): int
    {
        $timeout = max(1, (int) config('mpesa.pending_timeout_minutes', 5));
        $hardTimeout = max($timeout, (int) config('mpesa.hard_timeout_minutes', 30));
        $limit = max(1, (int) ($this->option('limit') ?: config('mpesa.reconcile_limit', 50)));

        $payments = Payment::query()
            ->with('order')
            ->where('gateway', 'mpesa')
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subMinutes($timeout))
            ->oldest('created_at')
            ->limit($limit)
            ->get();

        $checked = 0;
        $closed = 0;
        $released = 0;

        foreach ($payments as $payment) {
            $checked++;

            if (blank($payment->gateway_reference)) {
                if ($payment->created_at !== null && $payment->created_at->lte(now()->subMinutes($hardTimeout))) {
                    $finalizer->fail($payment, 'No checkout request was recorded.');
                    $released++;
                }

                continue;
            }

            try {
                $result = $mpesa->queryStatus((string) $payment->gateway_reference);
                $resultCode = (string) ($result['ResultCode'] ?? '');

                $payment->update(['last_checked_at' => now()]);

                if ($resultCode === '0') {
                    $finalizer->complete($payment, ['reconciliation' => $result]);
                    $closed++;
                } elseif (in_array($resultCode, ['1', '1032', '1037', '2001'], true)) {
                    $finalizer->fail($payment, (string) ($result['ResultDesc'] ?? 'M-Pesa payment did not complete.'), [
                        'reconciliation' => $result,
                    ]);
                    $released++;
                }
            } catch (Throwable $exception) {
                $payment->update(['last_checked_at' => now()]);

                Log::warning('M-Pesa reconciliation query failed.', [
                    'payment_id' => $payment->id,
                    'message' => $exception->getMessage(),
                ]);

                if ($payment->created_at !== null && $payment->created_at->lte(now()->subMinutes($hardTimeout))) {
                    $finalizer->fail($payment, 'M-Pesa callback was not received before the hard timeout.');
                    $released++;
                }
            }
        }

        $this->info("Checked {$checked} pending M-Pesa payment(s); completed {$closed}, released {$released}.");

        return self::SUCCESS;
    }
}
