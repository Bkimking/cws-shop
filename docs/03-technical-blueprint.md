# 03 — Technical Blueprint: DB, Routes, Design

[← Build Roadmap](./02-build-roadmap.md) | [Index](./00-index.md)

This doc is the reference layer. Bkim owns implementation detail; this lists the shape everything else in the two prior docs depends on.

## 3.1 Database Schema (core tables)

**Region & Org structure**
- `regions` — id, name, country_code, currency_code, tax_rate, timezone, is_active
- `branches` — id, region_id (FK), name, address, phone, is_active
- `users` — id, branch_id (nullable, FK), name, email, password, role (via Spatie pivot)
- `roles`, `permissions`, `model_has_roles`, `role_has_permissions` (Spatie standard)

**Catalog & Inventory**
- `categories` — id, name, parent_id (self-referencing, nullable)
- `products` — id, category_id (FK), name, sku, description, base_price, is_active
- `product_variants` — id, product_id (FK), variant_name (e.g. "Size L / Red"), sku_suffix, price_delta
- `product_region_prices` — id, product_id (FK), region_id (FK), price_override
- `warehouses` — id, branch_id (FK), name (a branch can have >1 stock point, e.g. shop floor + back store)
- `stock_levels` — id, warehouse_id (FK), product_variant_id (FK), quantity_on_hand, reorder_point
- `stock_movements` — id, warehouse_id (FK), product_variant_id (FK), type (purchase/transfer/adjustment/return/wastage), quantity, reference_id, created_by (FK users)

**Sales / POS**
- `till_sessions` — id, branch_id (FK), user_id (FK cashier), opened_at, closed_at, opening_cash, closing_cash, status
- `orders` — id, branch_id (FK, nullable for online-only), customer_id (FK, nullable for walk-in), source (pos/storefront), status, subtotal, tax, total, currency_code
- `order_items` — id, order_id (FK), product_variant_id (FK), quantity, unit_price, discount
- `payments` — id, order_id (FK), gateway (cash/mpesa/airtel/card/paypal), amount, status, gateway_reference, raw_response (json)
- `payment_gateway_configs` — id, region_id (FK), gateway, is_enabled, credentials (encrypted json)

**Storefront**
- `customers` — id, name, email, phone, password (nullable for guest), region_id (FK)
- `carts` — id, customer_id (FK, nullable — session-based for guests), status
- `cart_items` — id, cart_id (FK), product_variant_id (FK), quantity

**Notifications**
- `notifications` — Laravel default table (polymorphic)
- `fcm_tokens` — id, user_id (FK, nullable), customer_id (FK, nullable), token, platform — added at the Firebase integration point (end of MVP)

**AI**
- `ai_interactions` — id, type (forecast/chat/anomaly/promo/report), context_id (polymorphic-ish reference), input, output, created_by

**Future / Muted**
- No Flutter-specific tables needed now — a future desktop/tablet client reuses the same API, so no schema changes anticipated when it's revisited.

## 3.2 Route Structure (web.php groups)

```
/admin/*        → superadmin + region/branch admin (region-branch CRUD, gateway config, reporting roll-ups)
/pos/*          → branch-scoped POS terminal (cart, checkout, till open/close)
/inventory/*    → stock levels, movements, transfers, alerts
/shop/*         → public storefront (catalog, cart, checkout, order tracking) — mounted only if region/branch has it enabled
/api/webhooks/* → mpesa-callback, airtel-callback, pesapal-callback, paypal-webhook
/api/ai/*       → forecast, assistant-chat, anomaly-check, nl-report (internal, called by Inertia pages via Laravel AI)
```

Region/branch scoping is enforced via middleware reading the authenticated user's `branch_id` → `region_id`, not passed client-side.

## 3.3 Payment Driver Contract

```php
interface PaymentGateway
{
    public function charge(Order $order, array $meta = []): PaymentResult;
    public function verify(string $gatewayReference): PaymentResult;
    public function refund(Payment $payment, ?int $amount = null): PaymentResult;
}
```

One implementation per gateway (`MpesaDriver`, `AirtelDriver`, `PesapalDriver`, `PaypalDriver`, `CashDriver`), resolved at runtime from `payment_gateway_configs` for the order's region. Checkout code never references a specific gateway directly.

## 3.4 Design System Notes

- Base: React starter kit's default Tailwind setup — lock color tokens and typography scale in Phase 0 before any screen is built, so POS, admin, and storefront stay visually consistent.
- POS terminal screens optimize for tablet/touch target sizes even though Flutter itself is muted — the web POS should still be usable on a tablet browser.
- Storefront and admin share the same component library; storefront gets its own public-facing layout wrapper only.

## 3.5 Future Reference — Flutter (muted)

If/when revisited: Flutter client (desktop or tablet) consumes the same `/pos/*` and `/inventory/*` API surface used by the web app — no parallel backend logic. Offline sync approach from the web POS (Phase 2 hardening) should be reused rather than re-designed.

[← Build Roadmap](./02-build-roadmap.md) | [Index](./00-index.md)
