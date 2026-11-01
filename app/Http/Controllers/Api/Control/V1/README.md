# CWS control API scaffold

This folder is intentionally empty of controllers until the signed contract is implemented.

Planned controllers:

```text
HealthController
EntitlementController
HeartbeatController
EventController
OperationsController
TicketController
AnnouncementController
```

## Required middleware

```text
portal.signature   verify HMAC/JWT, timestamp, nonce, event id
portal.entitlement enforce status on privileged routes
```

## Rules

- read-only operational endpoints
- no direct DB writes from portal
- every request audited
- idempotency keys required
- signatures verified before any business logic
- response shape versioned
