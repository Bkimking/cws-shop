# 05 — UI Foundations: Principles, Shells, Components, Feedback

[← 04 Spatie playbook](./04-spatie-roles-permissions-guide.md) | [Index](./00-index.md) | [Next: 06 Back-office and terminal screens →](./06-ui-screens-backoffice-and-terminal.md)

Owner: Bkim. Companion file: [`app.css`](./app.css) holds every token named here.

## 5.1 Decisions locked

| Decision | Choice |
|---|---|
| Direction | **A** clean retail back-office, **B** dark terminal for the cashier, **C** receipt motif on cart, receipts and orders only |
| Mood | Dark is the default appearance app-wide (warm graphite, not blue-black). Light stays available in Settings → Appearance. Terminal is dark by default with two overrides: high contrast and daylight |
| Layout habit | Two-panel master-detail on every index page (list left, selected record with action buttons right). Forms use the same split |
| Memorable thing | The **paper receipt cart** on the terminal. Everything else stays quiet on purpose |
| Audience | Cashiers in shops and supermarkets on 10" Android tablets and desktops with barcode scanners. Owners and admins on laptops. Shoppers on phones, often on weak data |
| Primary job | Fast, error-proof checkout. Second job: numbers the owner trusts |

### Design plan (checked against the brief)

- **Color:** Graphite `#1f1e1b`, Counter `#2a2925`, Chalk `#f1eee6`, Sky `#5bbfe6` (brand, primary actions), Till green `#4fce8a` (charge, paid), Thermal paper `#f2eee2` (receipts only), AI violet `#a18cf0` (assistant only). One hue variable, `--brand-h`, retunes the brand.
- **Type:** Instrument Sans for all UI (already in the starter kit). DM Mono for money and paper only: receipts, cart lines, totals, stamps. Sentence case everywhere. Uppercase is reserved for ink stamps (PAID, VOID, REFUNDED).
- **Layout:** back-office is icon rail + context bar + master-detail. Terminal is three zones with the paper cart as the strongest shape on screen. Storefront is a mobile-first catalog with a bottom-sheet cart.
- **What was revised:** the first pass used a terracotta warm accent next to a cream light theme. That reads as a template, and it collides with the Claude look you want for the AI chat, so the brand is Sky (ties to CodeWithSky) and warmth lives only in the graphite base and the paper.

### Radius, motion, elevation

| Element | Rule |
|---|---|
| Inputs, small buttons | `rounded-md` (base radius minus 2px) |
| Cards, panels | `rounded-lg` |
| Terminal product tiles, gateway tiles | `rounded-xl` to `rounded-2xl`, bigger than everything else so they read as touch targets |
| Receipt | Nearly square top corners, perforated bottom edge |
| Motion | Only motion that answers an action: stamp lands on payment, scan flash on add, AI caret while streaming. No entrance animations on pages or cards |
| Elevation | Borders over shadows in dark mode. One shadow level for popovers and sheets |

## 5.2 Shells

| Shell | Layout file | Used by | Theme |
|---|---|---|---|
| Auth | `layouts/auth-layout.tsx` (existing) | everyone | dark default |
| Back-office | `layouts/app/app-sidebar-layout.tsx` (existing, upgraded: icon-collapsible sidebar + ContextBar replaces `app-sidebar-header`) | Superadmin, Region Admin, Branch Admin, Inventory Manager | dark default, light optional |
| Terminal | `layouts/app/app-terminal-layout.tsx` (**new**, lives next to the other app layouts) | Cashier, Branch Admin | `terminal dark` |
| Settings | `layouts/settings/*` (existing), nested inside back-office | all staff | inherits |
| Storefront | `layouts/shop/shop-layout.tsx` (**new**) | customers and guests | follows visitor's system setting, same tokens |
| AI surfaces | no layout of their own: a page and a slide-over inside back-office, a widget inside storefront | see doc 07 | inherits host |

Build the back-office icon rail from the existing `ui/sidebar.tsx` in `collapsible="icon"` mode. No new rail component needed.

Terminal root element carries `class="terminal dark"`. High contrast adds `data-contrast="high"`. Daylight drops `dark` and sets `data-contrast="daylight"`.

## 5.3 Who lands where after login

| Role | Lands on | Notes |
|---|---|---|
| Superadmin | `/admin` | full launcher |
| Region Admin | `/admin` | region locked in ContextBar |
| Branch Admin | `/admin` | also sees Sell tile (has `use pos terminal`) |
| Inventory Manager | `/admin` | filtered nav: Products, Stock. Needs `access admin panel` (see open decisions, doc 07) |
| Cashier | `/pos` | never sees back-office |
| Customer (own guard) | `/shop` or back to checkout | separate auth guard |
| Account with no role | friendly "no access yet" page | tells them to ask an admin |

Resolver order: `use pos terminal` without `access admin panel` → `/pos`; `access admin panel` → `/admin`; customer guard → `/shop`; otherwise no-access page.

## 5.4 Theme states

| State | Root classes | When |
|---|---|---|
| Dark (default) | `dark` on html | everyone unless changed |
| Light | none | Settings → Appearance |
| Terminal | `terminal dark` | always on `/pos` |
| Terminal high contrast | `terminal dark` + `data-contrast="high"` | glare, older screens. Toggle in terminal menu |
| Terminal daylight | `terminal` + `data-contrast="daylight"` | sunny shopfronts. Toggle in terminal menu |
| Storefront | follows system | public visitors expect their own setting |

To make dark the default, change the default in the appearance hook and the inline theme script in the blade layout from "system" to "dark".

## 5.5 Typography and numbers

| Use | Face | Size and weight |
|---|---|---|
| UI text | Instrument Sans | 14 body, 12 captions, 16 inputs (stops mobile zoom) |
| Page titles | Instrument Sans | 24 semibold |
| Terminal product name | Instrument Sans | 16–18 medium |
| Terminal price on tile | DM Mono | 18 |
| Cart lines, receipt | DM Mono | 15 |
| Grand total | DM Mono | 40–48 |
| Numpad keys | Instrument Sans | 24 |

Rules: every money value and quantity uses `tabular-nums` so columns align. Money is always rendered through one `Money` component, never string-built. Line length under 80 characters in prose (AI answers, help text).

Load DM Mono in weights 400 and 500 only, `display=swap`, in the same font link as Instrument Sans. Budget tablets pay for every extra font.

## 5.6 Component inventory

### A. Already in the project (from your screenshots)

| Component | Role in the new design | Change |
|---|---|---|
| `app-shell`, `app-content` | wrap back-office pages | keep |
| `app-sidebar`, `nav-main`, `nav-footer`, `nav-user` | icon-collapsible rail | switch to icon mode, permission-filtered items |
| `app-sidebar-header`, `app-header` | top bar | replace body with **ContextBar** |
| `app-logo`, `app-logo-icon` | brand mark | swap for POS mark, keep icon variant for the collapsed rail |
| `breadcrumbs` | page context | keep |
| `user-info`, `user-menu-content` | account menu | add Sell, Appearance, Sign out of till |
| `heading` | section heading | keep, used inside **PageHeader** |
| `alert-error`, `input-error` | form errors | keep, restyle with tokens automatically |
| `text-link`, `password-input` | auth forms | keep |
| `appearance-tabs` | light / dark / system | keep, default flips to dark |
| `manage-passkeys`, `passkey-*`, `manage-two-factor`, `two-factor-*`, `delete-user` | security settings | keep. Passkeys double as fast terminal unlock (doc 06) |
| `ui/*`: avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, icon, input-otp, input, label, navigation-menu, placeholder-pattern, select, separator, sheet, sidebar, skeleton, sonner, spinner, toggle-group, toggle, tooltip | primitives | keep. `sonner` gets the toast rules in 5.7 |

### B. shadcn primitives to add

| Primitive | Used for | Phase |
|---|---|---|
| `table` | every list that needs columns, reports | 1 |
| `tabs` | detail pane tabs (Overview / Permissions / Activity) | 1 |
| `textarea`, `switch`, `radio-group`, `alert` | forms, gateway toggles, inline notices | 1 |
| `scroll-area` | list panes, cart, chat thread | 1 |
| `popover`, `command` | ContextBar switchers, ⌘K palette, customer and product pickers | 1 |
| `alert-dialog` | destructive confirms | 1 |
| `drawer` | bottom sheets on tablet and phone (payment sheet, cart) | 2 |
| `empty`, `kbd`, `field`, `button-group`, `input-group`, `item` | empty states, shortcut hints, scan and search inputs, list rows | 1 |
| `progress`, `pagination`, `calendar` | uploads and imports, tables, date ranges | 2 |
| `chart` (recharts wrapper) | dashboard, reports | 2 |
| `resizable` | optional draggable split in master-detail | 3 |
| `carousel`, `accordion`, `slider`, `aspect-ratio` | storefront gallery, FAQ, price filter, product images | 3 |

### C. New custom components

Use subfolders so `components/` does not become 100 flat files.

**`components/data`** (shared everywhere)
- `Money`: formats by the region's currency and locale, `tabular-nums`. Terminal and receipts use the mono face.
- `StatusBadge`: Active, Inactive, Open, Closed, Low, Out, Pending, Failed. Always icon + text, never color alone.
- `Stamp`: the ink stamp for PAID, VOID, REFUNDED. Receipts and order detail only.
- `StatCard` with `Sparkline`: KPI value, delta, small trend.
- `EmptyState`: icon, one line of what is missing, one primary action.
- `DataTable`: sortable, sticky header, row actions, CSV export.
- `RoleChip`, `BranchChip`, `RegionChip`: small labeled chips with icons.
- `CopyButton`, `Kbd`: order numbers, references, shortcut hints.
- `DateRangePicker`: presets Today, Yesterday, 7 days, Month, Custom.

**`components/admin`**
- `PageHeader`: title, subtitle, primary action, secondary actions.
- `MasterDetail`: the two-panel wrapper. Left `ListPane`, right `DetailPane`. Below the tablet breakpoint the detail becomes a slide-over.
- `ListPane`: search, filter chips, grouped rows, keyboard up/down, loading skeleton rows.
- `DetailPane`: header (avatar or icon, title, chips), action toolbar, tabs, body.
- `TreeList`: region → branches, collapsible, counts.
- `FormSplit`: form version of the split. Left = section list with completion ticks, right = fields, sticky save bar.
- `PermissionMatrix`: role permissions as checkboxes grouped by resource, with unsaved changes highlighted and a summary before saving.
- `ActivityTimeline`: who changed what, from your activity log.
- `ContextBar`: region → branch switcher, ⌘K search, status pills, notifications bell, AI button, account menu.
- `StatusPills`: Online/Offline, Sync queue count, Till state.
- `CommandPalette`: ⌘K. Jump to pages, records, actions, filtered by permission.
- `LauncherTile`: big home tile, rendered only when the user has the permission.
- `KpiRow`, `TillStatusCard`, `LowStockStrip`, `LiveSalesFeed`: dashboard pieces.

**`components/feedback`**
- `toast` helpers: `notify.success|info|warning|error|loading(promise)` wrapping sonner.
- `PageBanner`: full-width strip for offline, sync pending, till closed, session expiring.
- `ConfirmDialog`: two tiers. Simple confirm, and typed confirm for dangerous actions (delete role, deactivate region).
- `ManagerOverrideDialog`: asks for a manager's PIN or passkey for discounts over the limit, voids, refunds.
- `NotificationCenter`: bell popover on desktop, sheet on tablet. Grouped, read and unread.
- `PermissionDenied`: in-page 403 state, plus full-page variant.
- `OfflinePill`, `SyncQueueSheet`: shown in ContextBar and terminal bar.

**`components/pos`** (terminal, everything the `app-terminal-layout` mounts)
- `TerminalBar`: branch, cashier, till state, printer, connection, clock, menu.
- `ScanField`: always-focused. Detects barcode-scanner bursts and adds instantly. Manual typing searches by name or SKU.
- `CategoryChips`, `ProductGrid`, `ProductTile` (image, name, mono price, stock badge), `VariantPicker`.
- `CartReceipt` (paper), `CartLine` (qty stepper, remove, note), `TotalsBlock`, `PayBar` (huge total + Charge button).
- `CustomerChip`, `CustomerPicker`, `DiscountDialog`, `HeldOrdersDrawer`.
- `PaymentSheet`, `GatewayTile`, `SplitPaymentList`.
- `NumPad`, `CashPanel` with note shortcuts 50 / 100 / 200 / 500 / 1000, `ChangeDue`.
- `MpesaWaiting` (phone confirm, countdown, resend prompt, cancel), `CardPanel`, `PaymentFailed`.
- `SaleSuccess` (stamp, change due, print / SMS / email), `ReceiptPreview` (paper tone).
- `RefundFlow`, `OrdersToday`.
- `OpenTillDialog`, `CloseTillWizard` (count by note, variance, Z report).
- `PinPad`, `LockScreen` (idle lock, passkey or PIN).
- `PrinterStatus`, `ShortcutHelp`.

**`components/shop`**
- `ShopHeader` (search, region and currency, account, cart), `ShopFooter`.
- `HeroBanner`, `CategoryRail`, `ProductCard`, `ProductGallery`, `VariantSelector`, `StockNote`.
- `CartDrawer`, `CheckoutStepper`, `FulfilmentPicker`, `PaymentMethodPicker`.
- `PaymentWaitingPage` (M-Pesa, Airtel), `OrderSummary`, `OrderTracker`.
- `ShopAssistantWidget`.

**`components/ai`**
- `AiChatShell`: history rail + thread + composer, the general AI chat structure.
- `ConversationList`, `ChatThread`, `MessageUser`, `MessageAssistant`, `ThinkingIndicator`, `StreamCaret`.
- `Composer`: auto-growing, attach, slash commands, send and stop.
- `SuggestionChips`: role-aware starter prompts.
- `ToolCallCard`: collapsible line showing what data the assistant looked up.
- `ResultTable`, `ResultChart`, `SourceChips`: answers that link back to real records.
- `AiPanel`: right slide-over on every back-office page (⌘J).
- `InsightCard`: forecast, anomaly, promo suggestions with Accept, Dismiss, Why.
- `MessageActions`: copy, regenerate, helpful / not helpful.

## 5.7 Feedback and messaging system

### Toasts (sonner)

| Level | Duration | Use | Position |
|---|---|---|---|
| success | 3s | saved, created, deactivated | top right; **top center on the terminal** so the Charge button is never covered |
| info | 4s | sync finished, background news | same |
| warning | 6s | low stock, till nearly closing | same |
| error | stays until dismissed | failed payment, save failed | same, with a Retry action when one exists |
| loading | until promise settles | M-Pesa request sent, report generating | same |

On phones the toast stack sits at the bottom, above the safe area.

Backend flash messages (`->with('success', …)`) reach the UI through one shared `flash` prop, and one effect in the layout turns them into toasts. Pages never call `notify` for flash messages themselves.

### Other message surfaces

| Surface | Use |
|---|---|
| Inline field error (`input-error`) | validation, under the field, plain words |
| `alert-error` / `Alert` | errors that belong to a whole form or panel |
| `PageBanner` | conditions that last: offline, sync waiting, till closed, session about to expire |
| `ConfirmDialog` simple | deactivate a user, discard changes |
| `ConfirmDialog` typed | delete a role, deactivate a region. Type the name to confirm |
| `ManagerOverrideDialog` | terminal discounts over the limit, voids, refunds |
| Blocking modal | payment in progress. Cannot be dismissed by backdrop or Escape, only Cancel payment |
| `NotificationCenter` | everything that happened while away: low stock, till reports, failed payments, role changes |
| Push (Firebase) | same events as the center, added at the end of MVP |

### Sound and touch feedback (terminal, on by default, switch in terminal menu)

Short tick on scan add, soft chime on paid, low buzz on error. Vibration on Android for the same three. Never sound on the back-office or storefront.

### Copy rules

- Sentence case. Plain verbs. The button and the toast use the same word: the button says "Deactivate", the toast says "Deactivated".
- Buttons say what happens: "Charge KES 1,250", "Save changes", "Send M-Pesa request". Never "Submit" or "OK".
- Errors say what went wrong and how to fix it, without apologizing: "M-Pesa request timed out. Ask the customer to check their phone, then resend."
- Empty screens are an invitation to act: "No products yet. Add your first product."
- Amounts always carry the region currency code: "KES 1,250". Never a bare number.
- No system words in front of users. A cashier sees "Sync waiting (3 sales)", not "queue".

## 5.8 State patterns

| State | Pattern |
|---|---|
| Loading | skeleton rows in the list pane, skeleton card in the detail pane. Spinner only inside buttons |
| Empty | `EmptyState` with icon, one line, one action. In a filtered list: "No matches" with Clear filters |
| Error | inline panel with what failed and a Retry. Page-level errors use the error pages in doc 07 |
| No permission | `PermissionDenied` inside the page frame. Nav hides what users cannot open, but the backend still enforces |
| Offline (terminal) | banner "Offline. Sales are saved on this device and will sync." Charge stays enabled for Cash, disabled for M-Pesa, Airtel, card |
| Stale data | subtle "Updated 2 min ago" with Refresh in list headers that use Reverb-less polling |

## 5.9 Responsive, input and accessibility

| Surface | Primary target | Also works on |
|---|---|---|
| Terminal | 10" tablet landscape (1280×800), desktop with scanner | 8" tablet portrait: cart becomes a bottom sheet |
| Back-office | laptop 1366×768 and up | tablet: detail becomes slide-over. Phone: single pane |
| Storefront | phone first (360px), then desktop | any |

- Touch targets: 48px minimum, 56px on the terminal.
- Terminal shortcuts (desktop): `/` focus scan field, `F2` Charge, `F4` Hold, `F6` Discount, `F8` Customer, `Esc` close sheet, `?` shortcut help.
- Focus rings are always visible. Status never depends on color alone. Reduced motion is respected globally (in `app.css`).
- Contrast: body text meets WCAG AA in every theme. The terminal `high` and `daylight` states exist for the bad-light cases.
- Region drives currency, number and date formatting, timezone and tax label. Strings live in one place so Swahili can be added later without a rewrite.

## 5.10 Permissions the UI introduces (add to `PermissionSeeder`)

Follow doc 04: permissions live in the seeder, the app checks permissions, roles are assignment bundles.

| Permission | Why the UI needs it | Suggested roles |
|---|---|---|
| `use pos terminal` | can open `/pos` | Cashier, Branch Admin, Superadmin |
| `create orders` | can complete a sale | Cashier, Branch Admin, Superadmin |
| `manage till` | open and close a till | Cashier, Branch Admin, Superadmin |
| `apply discounts` | discount button, up to the configured limit | Cashier, Branch Admin, Superadmin |
| `approve overrides` | can enter a manager PIN for big discounts, voids, refunds | Branch Admin, Region Admin, Superadmin |
| `manage categories` | category CRUD (today it is wrongly tied to `create products`) | Branch Admin, Inventory Manager, Superadmin |
| `view activity log` | Activity tab and log page | Branch Admin, Region Admin, Superadmin |
| `use ai assistant` | AI chat and panel | Branch Admin, Region Admin, Superadmin, Inventory Manager |
| `view ai insights` | insight cards on dashboard, stock, orders | same as above |
| `manage ai settings` | enable or disable AI features, spending caps | Superadmin |
| `manage settings` | receipt footer, tax label, region defaults | Superadmin, Region Admin |

## 5.11 Frontend conventions

- **Folders:** `pages/admin/*`, `pages/pos/*`, `pages/shop/*`, `pages/admin/ai/*`. Page names are lowercase paths, matching how your controllers render them (`admin/roles/index`).
- **Shared Inertia props:** `auth.user`, `auth.permissions` (array of names), `context` (region, branch, currency code, locale, timezone, tax label and rate), `flash`, `notifications` (unread count).
- **`can('permission name')` helper** reads `auth.permissions`. It hides UI only. Every route and policy still enforces on the server.
- **Routes:** use the Wayfinder-generated functions in components. No hardcoded URLs.
- **Money:** only through `Money`. Never format currency in a page.
- **Icons:** lucide only, through the existing `ui/icon.tsx` wrapper.
- **New components:** one component per file, kebab-case file names like the existing ones, props typed.

[← 04 Spatie playbook](./04-spatie-roles-permissions-guide.md) | [Index](./00-index.md) | [Next: 06 Back-office and terminal screens →](./06-ui-screens-backoffice-and-terminal.md)
