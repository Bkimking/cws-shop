# 01 — Product Overview: What We're Building

[← Index](./00-index.md) | [Next: Build Roadmap →](./02-build-roadmap.md)

## 1.1 Vision

A single Laravel/Inertia codebase that can run as:

1. **Standalone POS** — in-store checkout only, no public storefront.
2. **POS + Public Storefront** — same product/stock data powers an online shop.
3. **POS + Inventory Hub** — multi-branch stock control is the primary value, POS/storefront are consumers of that stock.

All three modes share one product/stock/order core. Which modes are active is a **superadmin toggle per region/branch**, not a separate build.

## 1.2 Core Modules

- **Auth & Roles** — Superadmin, Region Admin, Branch/Store Admin, Cashier, Inventory Manager, Customer (storefront). Spatie permissions.
- **Region & Branch Management** — Superadmin creates/edits regions (country, currency, tax rate, timezone, active payment gateways) and branches under each region. This is what makes the system portable outside Kenya later without a rewrite.
- **Product Catalog** — products, variants (size/color/etc.), categories, per-region price overrides, images.
- **Inventory** — per-branch stock levels, stock movements (purchase/transfer/adjustment/return/wastage), low-stock alerts, batch/expiry tracking.
- **POS Terminal** — cart/checkout UI, barcode scan, split payment, discounts, receipt printing, offline-cache-then-sync for weak-connectivity branches, till/shift open-close with X/Z reports.
- **Public Storefront** — product browsing, cart, guest + registered checkout, order tracking. Optional per region/branch.
- **Payments** — see 1.3.
- **Notifications** — Laravel Notifications first (low stock, order confirmation, shift reports); Firebase push added post-MVP for real-time mobile alerts.
- **AI Layer** — see 1.4, built through Laravel AI.
- **Reporting** — sales, stock, till reconciliation, per-branch and roll-up-by-region views for superadmin.

## 1.3 Payment Gateways (all region-toggleable)

| Gateway | Use case | Notes |
|---|---|---|
| Cash | In-store | Manual entry, reconciled at till close |
| M-Pesa | In-store + online | Daraja API — STK Push (customer-initiated), C2B (storefront), B2C (refunds) |
| Airtel Money | In-store + online | Airtel Money OpenAPI — collections + disbursements |
| Cards | Online + optionally in-store | Via Pesapal or Flutterwave (both cover Visa/Mastercard in Kenya and act as a fallback aggregator) |
| PayPal | Online (diaspora/international) | PayPal Checkout SDK, storefront only |

Every gateway implements one shared contract (`charge`, `refund`, `verify`) so superadmin can turn any of them on/off per region without touching checkout logic. Full contract in Doc 03.

## 1.4 AI Touchpoints (via Laravel AI)

- **Sales forecasting** — restock suggestions per branch from historical sales.
- **Storefront AI assistant** — answers product/order questions, function-calls into order/product data.
- **Anomaly/fraud detection** — flags unusual refunds, till shortages, discrepancy patterns.
- **Snap-to-inventory** — photo-based product identification for fast onboarding (useful for informal retail stock).
- **Promo/pricing suggestions** — flags slow-moving stock, suggests discounts based on velocity.
- **Natural-language reporting** — "how did Nakuru do last week?" answered from live DB data via LLM summarization.

AI features are additive — the POS/inventory/storefront core must work fully with AI switched off.

## 1.5 Explicitly Muted for Now

- **Flutter app** (desktop or tablet POS client) — documented in the blueprint for future reference only. Not built in Start/MVP/Final phases below.
- Multi-country rollout beyond Kenya — the region abstraction supports it, but no second country is configured until asked for.

[← Index](./00-index.md) | [Next: Build Roadmap →](./02-build-roadmap.md)
