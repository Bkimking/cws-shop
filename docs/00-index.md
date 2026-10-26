# POS System — Technical Specification (Kenya, Multi-Region Ready)

**Owner / Lead Engineer / Sole Handler:** Brian Muriungi Kimathi (Bkim), CodeWithSky (CWS) IT Solutions
**Supervision:** Claude (and any other AI assisting) acts in a supervisory/QA capacity only — reviewing logic, flagging bugs, tracking build time against estimates, and surfacing relevant tech-trend shifts (new Laravel/React/AI tooling) during the build. No AI is listed as a document owner or decision-maker; Bkim approves and merges everything.

## Document set

| Doc | Contents |
|---|---|
| [01 — Product Overview](./01-product-overview.md) | What is being built: modules, deployment modes, roles, payments, AI touchpoints, fixed stack |
| [02 — Build Roadmap](./02-build-roadmap.md) | How it's being built: Start → MVP → Final phases, with durations and what ships in each |
| [03 — Technical Blueprint](./03-technical-blueprint.md) | DB schema, route structure, design system notes, API contracts |
| [04 — Spatie Roles & Permissions Playbook](./04-spatie-roles-permissions-guide.md) | Permission-first rules, naming, seeding, policies, caching. Read before touching roles or permissions |
| [05 — UI Foundations](./05-ui-foundations.md) | Design decisions (A+B+C, dark mood), shells, component inventory, feedback system, permissions the UI adds |
| [06 — Screens: Back-office & Terminal](./06-ui-screens-backoffice-and-terminal.md) | Auth, admin pages, cashier terminal flow, payment sheet, till, offline behavior |
| [07 — Screens: Storefront, AI & Messages](./07-ui-screens-storefront-and-ai.md) | Public shop, AI chat and insight surfaces, message catalog, error pages, build order, open decisions |
| [08 — Payments & Fulfilment](./08-payments-and-fulfilment-mvp.md) | M-Pesa deployment decision, reconciliation, pickup workflow and inventory receiving |
| [`app.css`](./app.css) | Design tokens: dark-first brand, terminal, receipt, AI, status, gateway |

## Fixed stack (do not deviate without updating this doc)

- **Backend:** Laravel 13.x
- **Frontend:** React starter kit (Inertia.js)
- **Mobile/Desktop:** Flutter — present in docs but **muted**; revisit only for a future tablet/desktop POS client
- **DB:** MySQL
- **Notifications:** Laravel Notifications (DB/mail/SMS channel) now, **Firebase Cloud Messaging added once MVP is complete**
- **AI:** Laravel AI (native integration layer) for in-app AI features

Read the three docs in order — each assumes the previous one's decisions.