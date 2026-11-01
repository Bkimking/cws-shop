# CWS connections scaffold

## Responsibility

Identify this installation to the portal, handshake, heartbeat and keep credentials server-side.

## Suggested classes

```text
PortalConnection
HandshakeWithPortal
SendHeartbeat
VerifyPortalRequest
```

## Configuration

```dotenv
PORTAL_ENABLED=true
PORTAL_URL=https://portal.codewithsky.co.ke
PORTAL_INSTALLATION_ID=ins_...
PORTAL_API_KEY=pk_live_...
PORTAL_API_SECRET=sk_live_...
PORTAL_SIGNING_PUBLIC_KEY="..."
```

## Handshake

```text
CWS -> POST {portal}/api/control/v1/connect
headers: X-Installation-Id, X-Timestamp, X-Nonce, X-Signature
body: version, environment, url
portal returns first signed entitlement
```

## Heartbeat

Send every 5 minutes via scheduler:

```json
{
  "version": "1.4.0",
  "health": "ok",
  "metrics": { "orders_today": 42 }
}
```

Do not send customer/payment secrets.
