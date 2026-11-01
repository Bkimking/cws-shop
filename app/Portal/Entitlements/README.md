# CWS entitlements scaffold

## Responsibility

Cache the portal's signed entitlement and enforce it without blocking selling for the 14-day grace period.

## Suggested classes

```text
VerifyEntitlementSignature
StoreEntitlementSnapshot
CurrentEntitlement
EnsureEntitlement
```

## Statuses

```text
active
grace
suspended
maintenance
```

## Enforcement matrix

| Area | Active | Grace | Suspended |
|---|---|---|---|
| Login | yes | yes | yes |
| Billing/support | yes | yes | yes |
| Admin dashboard | yes | yes | read-only |
| New POS sales | yes | yes | blocked with warning |
| Public storefront | yes | yes | visible maintenance; no orders |
| Data export | yes | yes | yes |
| Portal link | yes | yes | Superadmin only |
| Announcements | yes | yes | yes |

## Offline rule

```text
last signed snapshot
  + period_end
  + 14 days
  = last allowed selling time
```

Never trust a locally edited status. Never fail open forever.
