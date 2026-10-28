# M-Pesa operations and queue runbook

[← Index](./00-index.md)

## The callback must hit the API route

The public callback route is:

```text
POST /api/payments/mpesa/callback
```

The production value must be:

```dotenv
MPESA_CALLBACK_URL=https://cws.shop.codewithsky.co.ke/api/payments/mpesa/callback
APP_URL=https://cws.shop.codewithsky.co.ke
```

Safaricom uses exactly the URL sent in the STK request. A wrong host, a missing `/api`, or a URL containing the wrong domain means the customer can receive the M-Pesa SMS while the POS never receives the completion callback.

Check it with:

```bash
php artisan mpesa:doctor
```

## Payment lifecycle

```text
STK request
  → payment row = pending
  → customer receives M-Pesa prompt/SMS
  → Safaricom callback
  → payment = completed / failed
  → order completed / cancelled
  → till and POS receive the new state
```

If the callback is delayed, POS and customer pages now query Safaricom themselves:

- web POS: `GET /pos/sales/{order}/status`
- Windows POS: `GET /api/v1/payments/{payment}/status`
- customer order page: **Refresh status**

The query is locked and throttled so several open terminals do not hammer Safaricom.

## Queue worker

The queue is database-backed:

```dotenv
QUEUE_CONNECTION=database
```

Create/migrate the tables before starting:

```bash
php artisan migrate --force
```

Run a worker for M-Pesa and normal jobs:

```bash
php artisan queue:work --queue=mpesa,default --tries=3 --timeout=90
```

In production, supervise it with systemd or Supervisor. Example program:

```ini
[program:cwspos-queue]
command=php /var/www/cwspos/artisan queue:work --queue=mpesa,default --tries=3 --timeout=90
directory=/var/www/cwspos
autostart=true
autorestart=true
numprocs=1
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/cwspos-queue.log
```

Restart workers after deployments:

```bash
php artisan queue:restart
```

## Optional queued callbacks

Inline callback processing is the default and is the safest option if no worker is running:

```dotenv
MPESA_QUEUE_CALLBACKS=false
```

After the worker is verified, callback processing can be moved to the `mpesa` queue:

```dotenv
MPESA_QUEUE_CALLBACKS=true
```

If queue dispatch fails, the callback falls back to inline processing and logs the queue failure.

## Reconciliation

The scheduler runs:

```bash
php artisan mpesa:reconcile
```

It queries stale pending M-Pesa payments, completes successful ones, or releases stock after a hard timeout.

Run the scheduler with cron:

```cron
* * * * * cd /var/www/cwspos && php artisan schedule:run >> /dev/null 2>&1
```

For a queue-based reconciliation:

```bash
php artisan mpesa:reconcile --queue
```

This dispatches one `ReconcileMpesaPaymentJob` per stale payment.

## Triage when M-Pesa SMS arrives but POS stays pending

1. `php artisan mpesa:doctor`
2. Confirm `MPESA_CALLBACK_URL` is the public HTTPS host and `/api/payments/mpesa/callback`.
3. Confirm the callback is not blocked by WAF/CSRF/auth middleware.
4. Check `storage/logs/laravel.log` for `M-Pesa callback for unknown payment` or signature failures.
5. Press **Refresh status** on the customer/order page, or let the POS poll.
6. Run `php artisan mpesa:reconcile` to resolve stale pending rows.
7. Check queue workers if `MPESA_QUEUE_CALLBACKS=true`.
