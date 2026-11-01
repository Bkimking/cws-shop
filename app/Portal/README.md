# CWS Portal integration scaffold

This folder is a **structure for the CWS tenant agent**. It is deliberately not wired into routes or middleware yet.

Read the full contract at:

```text
https://portal.codewithsky.co.ke/docs
```

Local source: `portal.codewithsky.co.ke/docs/`.

## Modules

```text
Connections      installation identity, handshake, heartbeat
Entitlements     signed snapshot cache and enforcement
Support          local mirror + outbox + polling
Announcements    Office dashboard cache + read receipts
```

## Build order

1. config/env and signed request verification
2. entitlement cache + middleware
3. portal footer link (Superadmin only)
4. suspended page
5. support
6. announcements
7. operational read-only API
8. Reverb (optional, not on critical path)

## Rules

- no shared DB
- no direct portal writes
- no API key in React/Flutter
- always verify signatures
- 14-day offline grace
- block POS sales when suspended
- public storefront visible but ordering disabled
- Superadmin retains dashboard/support/announcements/billing
- announcements only on Office dashboard

## Current checkpoint

Implemented:

- `PortalClient` handshake/status client
- `PortalEntitlement` local cache
- HMAC signature verification
- `portal:sync` scheduled every five minutes
- `portal.entitlement` middleware
- POS sales/till and public checkout blocking
- grace and suspended states
- Superadmin exception for Office routes
- Office dashboard/POS warning banner
- `/system/suspended` placeholder page

Still to build:

- support ticket mirror/outbox
- announcements cache
- operational read-only endpoints
- Reverb live chat
- billing/invoice screens

## Native Office pages (current checkpoint)

The footer now links internally:

- `/admin/support` — CWS Superadmin support thread
- `/admin/announcements` — Office announcements
- `/admin/billing` — subscription and invoices

The portal is the backend/source of truth. CWS renders and syncs the content.

Portal support API:

```text
GET  /api/control/v1/tickets
POST /api/control/v1/tickets
POST /api/control/v1/tickets/{ticket}/messages
```

Portal announcements API:

```text
GET /api/control/v1/announcements
```

Billing/invoice data comes through the signed `/api/control/v1/status` response.
