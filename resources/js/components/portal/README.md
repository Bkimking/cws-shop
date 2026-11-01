# CWS portal UI scaffold

Suggested components (not wired):

```text
PortalFooterNav        only rendered for is_superadmin
PortalLink             portal deep link, target=_blank
EntitlementBanner      active/grace/suspended warning
SupportLauncher        Superadmin-only support entry
AnnouncementList       Office dashboard only
SuspendedNotice        uses pages/system/suspended
```

Backend must expose a shared portal prop:

```ts
portal: {
  enabled: boolean;
  url: string;
  isSuperadmin: boolean;
}
```

No API key or secret may be sent to the frontend.
