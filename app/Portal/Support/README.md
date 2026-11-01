# CWS support scaffold

## Responsibility

Local mirror and outbox for the portal-owned support thread.

## Suggested classes

```text
CreateLocalTicket
AppendSupportMessage
PushSupportOutbox
PollSupportTickets
MarkTicketRead
```

## Rules

- only CWS Superadmin can access
- local ticket/message cache
- queue replies when portal is down
- idempotency key per message
- attachments private
- email remains a first-class channel
- polling first; Reverb optional later

## Suggested tables

```text
support_tickets
support_messages
support_attachments
portal_outbox
```
