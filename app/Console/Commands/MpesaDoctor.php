<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class MpesaDoctor extends Command
{
    protected $signature = 'mpesa:doctor';

    protected $description = 'Check M-Pesa callback, queue and pending payment health';

    public function handle(): int
    {
        $callback = (string) config('mpesa.callback_url');
        $route = route('payments.mpesa.callback');
        $queue = (string) config('queue.default');
        $jobs = Schema::hasTable('jobs');
        $pending = Payment::query()->where('gateway', 'mpesa')->where('status', 'pending')->count();

        $this->table(['Check', 'Value'], [
            ['Callback URL', $callback !== '' ? $callback : '(route fallback)'],
            ['Route URL', $route],
            ['Callback secret', filled(config('mpesa.callback_secret')) ? 'configured' : 'not set'],
            ['Queue connection', $queue],
            ['Queue callback mode', config('mpesa.queue_callbacks') ? 'queued' : 'inline'],
            ['Jobs table', $jobs ? 'present' : 'MISSING'],
            ['Pending M-Pesa payments', (string) $pending],
        ]);

        $errors = [];

        if ($callback !== '' && parse_url($callback, PHP_URL_PATH) !== parse_url($route, PHP_URL_PATH)) {
            $errors[] = 'MPESA_CALLBACK_URL path does not match the callback route path.';
        }

        if ($callback !== '' && parse_url($callback, PHP_URL_HOST) !== parse_url($route, PHP_URL_HOST)) {
            $errors[] = 'MPESA_CALLBACK_URL host differs from APP_URL. Use the public HTTPS host.';
        }

        if ($queue === 'database' && ! $jobs) {
            $errors[] = 'QUEUE_CONNECTION=database but the jobs table is missing. Run php artisan migrate.';
        }

        if ($pending > 0) {
            $errors[] = "{$pending} M-Pesa payment(s) are pending. Run php artisan mpesa:reconcile or inspect the callback logs.";
        }

        if ($errors !== []) {
            foreach ($errors as $error) {
                $this->warn('⚠ '.$error);
            }

            return self::FAILURE;
        }

        $this->info('M-Pesa checks passed.');

        return self::SUCCESS;
    }
}
