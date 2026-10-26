# Payments and fulfilment — MVP deployment notes

[← Index](./00-index.md)

## M-Pesa deployment decision

CWSPOS currently uses **one deployment-wide M-Pesa account**, configured through environment variables:

```env
MPESA_ENABLED=true
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://your-public-host/api/payments/mpesa/callback
MPESA_CALLBACK_SECRET=...
MPESA_PENDING_TIMEOUT_MINUTES=5
MPESA_HARD_TIMEOUT_MINUTES=30
```

This is intentional for the MVP. Payment methods are still enabled or disabled **per region** through `payment_gateway_configs`, which Region Admin and Superadmin can change from Admin → Payment Gateways.

Per-region M-Pesa credentials are not active yet. The `encrypted_credentials` field exists, but the M-Pesa driver currently reads the deployment-wide `.env` account. A future version can load credentials from the selected region’s gateway record without changing the checkout API.

## Seeded payment defaults

`PaymentGatewaySeeder` creates one record per region and gateway:

| Method | Default |
|---|---|
| Cash | enabled |
| M-Pesa | enabled for Kenya |
| PayPal | disabled/muted |
| Airtel Money | disabled |
| Card | disabled |

Re-running the seeder does not overwrite an existing enable/disable choice.

## Payment lifecycle

1. A pending order and payment are created.
2. Stock is reserved from the selected pickup warehouse.
3. M-Pesa STK is sent.
4. A successful callback marks the payment and order completed.
5. A failed callback marks the payment failed, cancels the order and releases stock.
6. The scheduled `mpesa:reconcile` command queries stale pending payments:
   - successful query → complete
   - known failure → fail and restock
   - hard timeout → fail and restock
7. A failed public order can be retried from the order page; retry creates a fresh order and stock reservation.

Run the scheduler in production:

For local browser/E2E runs only, `MPESA_FAKE=true` makes the driver return a deterministic `FAKE-...` checkout reference without calling Safaricom. Never enable it in production.

```bash
php artisan schedule:work
# or configure cron for schedule:run
```

The command is registered every minute with `withoutOverlapping()`.

## Pickup workflow

Storefront payment completion does **not** immediately mark an order ready. The sequence is:

```text
paid / preparing → ready for pickup → collected
```

Staff with `manage pickups` can mark the order ready on the admin order page. That action sends the pickup email and stamps `pickup_ready_at`. Staff then mark the order collected, recording who collected it and when.

POS orders are not pickup orders and are marked `not_applicable`.

## Email

SMTP is configured in `.env` (`MAIL_MAILER=smtp`). Confirm the provider before launch:

```bash
php artisan config:clear
php artisan tinker --execute 'dump(config("mail.default"));'
```

The pickup email is sent only when staff mark the order ready.

## Inventory receiving and transfers

- **Receive stock** creates a stock level and a `PURCHASE` movement when a supplier name is supplied.
- **Transfer stock** uses the existing transfer endpoint and records `TRANSFER_OUT` and `TRANSFER_IN` movements.
- Both actions are permission-gated and branch/region scoped.

## Known MVP limits

- No gateway-level M-Pesa refund/reversal; admin refunds are local records and restock only.
- PayPal remains muted and has no driver.
- No split payments, offline POS queue, suppliers master, purchase orders or stocktake yet.
