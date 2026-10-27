# Windows POS API v1

[← Index](./00-index.md)

The Windows Flutter POS uses a token-authenticated Laravel API. The API lives under `/api/v1`; the legacy M-Pesa callback remains under `/api/payments/mpesa/callback` and is also exposed at `/api/v1/payments/mpesa/callback`.

## Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "cashier@cws.com",
  "password": "password",
  "device_name": "Front desk Windows"
}
```

Response:

```json
{
  "message": "Signed in.",
  "data": {
    "token": "1|...",
    "token_type": "Bearer",
    "user": { "id": 1, "name": "Cashier", "email": "cashier@cws.com", "roles": [], "permissions": [] },
    "branch": { "id": 1, "name": "Ngong" },
    "region": { "currency_code": "KES", "timezone": "Africa/Nairobi" },
    "till": null
  }
}
```

Send `Authorization: Bearer <token>` on every protected request.

2FA-enabled users receive HTTP `202` with:

```json
{
  "data": {
    "two_factor_required": true,
    "challenge_token": "..."
  }
}
```

Then:

```http
POST /api/v1/auth/two-factor
{ "challenge_token": "...", "code": "123456", "device_name": "Front desk Windows" }
```

The Flutter client currently surfaces the 2FA-required message but does not yet render the code screen.

## Implemented endpoints

```text
GET    /api/v1/health
GET    /api/v1/min-version
POST   /api/v1/auth/login
POST   /api/v1/auth/two-factor
GET    /api/v1/auth/me
POST   /api/v1/auth/logout

GET    /api/v1/bootstrap
GET    /api/v1/settings
GET    /api/v1/catalog/categories
GET    /api/v1/catalog/products
GET    /api/v1/catalog/updated-since

GET    /api/v1/till/current
GET    /api/v1/till/x-report
POST   /api/v1/till/open
POST   /api/v1/till/close

GET    /api/v1/orders/today
GET    /api/v1/orders/{order}
POST   /api/v1/orders
GET    /api/v1/payments/{payment}/status
POST   /api/v1/payments/{payment}/cancel
```

`bootstrap` returns user/branch/region/till, products, categories, today's orders and enabled payment methods in one request.

## Flutter client

The Windows app is under `pos/`.

```bash
cd pos
flutter pub get
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

Current first slice:

- secure token storage
- login and session restore
- till open
- terminal bootstrap
- product/catalog/category/search
- cart
- cash sale
- product images
- dark terminal UI

Not in the first slice yet:

- M-Pesa payment sheet on Windows
- 2FA code screen in Flutter
- offline outbox/sync
- receipt printer integration
- full catalog delta sync
- refunds from Windows
- split payments

## API architecture

Shared backend services:

- `PosCatalogService` — web and API catalog
- `PosSaleService` — sale/payment/stock transaction
- `TillService` / `TillReportService` — opening, closing, X/Z
- `PaymentMethods` — regional gateway enable/disable
- `MpesaPaymentFinalizer` — callback/reconciliation completion

The API must not contain a second implementation of sale pricing, stock deduction or payment finalization.
