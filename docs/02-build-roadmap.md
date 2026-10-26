# 02 — Build Roadmap: How We're Building It

[← Product Overview](./01-product-overview.md) | [Next: Technical Blueprint →](./03-technical-blueprint.md)

Three phases. Durations are working estimates for one lead engineer (Bkim) with AI supervision handling review/bug-flagging/trend-checks in parallel — not separate calendar time.

## Phase 0 — Start / Foundation (≈ 1.5–2 weeks)

Goal: skeleton that everything else plugs into. Nothing customer-facing yet.

- Laravel 13.x project scaffolded with the React starter kit (Inertia)
- Auth (starter kit default) + Spatie roles/permissions wired to: Superadmin, Region Admin, Branch Admin, Cashier, Inventory Manager, Customer
- Core migrations: `regions`, `branches`, `users` (region/branch scoped), base `products`/`categories`
- Superadmin shell: region + branch CRUD, gateway-toggle UI stub (logic comes in MVP)
- CI basics: linting, migration checks, staging deploy target
- Decide and lock in design tokens (color/typography) for the React starter kit theme — see Doc 03

**Exit criteria:** superadmin can log in, create a region, create a branch under it, create a base user role. No payments, no POS screen yet.

## Phase 1 — MVP (≈ 4–6 weeks)

Goal: a branch can actually sell something and track stock.

- Product catalog CRUD (with variants), per-branch stock levels, manual stock adjustments
- POS terminal: cart, checkout, cash payment, receipt (screen + print-ready)
- M-Pesa integration: STK Push for in-store, basic C2B webhook handling
- Till/shift open-close with basic X/Z report
- Low-stock alert via **Laravel Notifications** (DB + email channel only — no Firebase yet)
- Superadmin: gateway on/off toggle now functional per region (cash + M-Pesa live)
- Basic reporting: daily sales per branch, stock-on-hand per branch

**Firebase Cloud Messaging is added at the close of this phase** — once MVP notification flows (low stock, sale confirmation) are proven on Laravel Notifications, wire FCM as an additional channel for real-time mobile push. This is the trigger point you specified, not a separate phase.

**Exit criteria:** a real branch can run a full day of sales on cash + M-Pesa, stock decrements correctly, superadmin sees daily numbers, push notifications work.

## Phase 2 — Final Build (≈ 6–9 weeks)

Goal: full spec from Doc 01 — every gateway, storefront, AI, and scale-readiness.

- Remaining gateways: Airtel Money, cards (Pesapal/Flutterwave), PayPal
- Public storefront: catalog browsing, cart, checkout (guest + registered), order tracking — sharing the same stock/order core as POS
- Per-region product pricing overrides
- AI layer via Laravel AI: storefront assistant, sales forecasting, anomaly detection, snap-to-inventory, promo suggestions, NL reporting
- Offline-first hardening for POS terminal (local cache + sync) for weak-connectivity branches
- Full reporting suite: region roll-ups, till reconciliation history, AI-generated summaries
- Flutter desktop/tablet client — **stays muted/documented only**, not built this phase unless explicitly greenlit

**Exit criteria:** system matches Doc 01 in full, multi-gateway checkout works online and in-store, AI features are live but non-blocking if disabled, region abstraction has been exercised with at least one second mock region to prove portability.

## Running throughout all phases (AI supervisory role)

- Code/logic review and bug-flagging on each phase's output before Bkim merges
- Watching for relevant Laravel/React/payment-API/AI-tooling changes that affect decisions already made in this doc
- Tracking actual time spent per phase against the estimates above, flagging drift early

[← Product Overview](./01-product-overview.md) | [Next: Technical Blueprint →](./03-technical-blueprint.md)
