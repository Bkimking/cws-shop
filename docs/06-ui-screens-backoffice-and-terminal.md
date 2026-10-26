# 06 — Screens: Auth, Back-office, Terminal

[← 05 UI foundations](./05-ui-foundations.md) | [Index](./00-index.md) | [Next: 07 Storefront, AI, messages →](./07-ui-screens-storefront-and-ai.md)

Read doc 05 first: tokens, shells and component names used below are defined there.

## 6.1 How each screen is specified

Every screen lists: **Route**, **Permission**, **Layout** (what sits where), **Actions**, **States** (loading, empty, error, denied), **Responsive**. If a line is missing, the default in doc 05 §5.8 applies.

Page files follow the controllers you already have: `pages/admin/regions/index.tsx`, `create.tsx`, `edit.tsx`, and so on.

## 6.2 Auth and entry

### Login (`/login`)
- **Layout:** `auth-layout`, dark. Centered card on graphite. Logo above, one card, no side art.
- **Fields:** email, password, "Sign in". Under it: "Sign in with a passkey" (existing passkey flow), "Forgot password".
- **States:** wrong credentials show one `alert-error` above the fields: "Email or password is wrong." Locked after too many tries: "Too many attempts. Try again in 60 seconds." with a live countdown.
- **After login:** the resolver in doc 05 §5.3 sends people to `/admin`, `/pos` or `/shop`.

### Two-factor and recovery
Existing `two-factor-*` screens. Restyle only via tokens.

### Terminal unlock (cashiers, shared tablet)
- Idle lock after 5 minutes (setting). Lock screen shows branch, till state and the last cashier's name.
- Unlock with passkey (existing) or a 4–6 digit PIN on `PinPad`. Three wrong PINs sign the cashier out.
- The PIN needs a small backend piece (hashed, per user, rate limited). Flagged in doc 07 open decisions.

## 6.3 Back-office chrome (every `/admin/*` page)

```
┌────┬────────────────────────────────────────────────────────────────┐
│    │ Kajiado ▾ › Ngong ▾   [ Search or jump… ⌘K ]   ● Online  Till ● │  ← ContextBar
│ ▣  │        ⟳ 3 waiting            🔔 2    ✦ AI    (BK) ▾           │
│ ◫  ├────────────────────────────────────────────────────────────────┤
│ ▤  │ Breadcrumbs                                                     │
│ ▥  │ Page title                                          [Primary]   │  ← PageHeader
│ ⌂  ├───────────────────────────┬────────────────────────────────────┤
│ …  │  List pane                │  Detail pane                        │
│    │                           │                                     │
└────┴───────────────────────────┴────────────────────────────────────┘
 rail (icons, expands on hover)
```

### Icon rail items (permission filtered, in this order)

| Item | Icon | Needs permission | Route |
|---|---|---|---|
| Home | LayoutDashboard | `access admin panel` | `/admin` |
| Sell | ScanBarcode | `use pos terminal` | `/pos` |
| Orders | Receipt | `view orders` | `/admin/orders` |
| Products | Package | `view products` | `/admin/products` |
| Categories | Tags | `manage categories` | `/admin/categories` |
| Stock | Warehouse | `view stock` | `/admin/stock` |
| Reports | BarChart3 | `view branch reports` or `view region reports` | `/admin/reports` |
| Regions | Globe | `manage regions` | `/admin/regions` |
| Branches | Store | `manage branches` | `/admin/branches` |
| Users | Users | `manage users` | `/admin/users` |
| Roles | ShieldCheck | `manage roles` | `/admin/roles` |
| Payment gateways | Wallet | `manage payment gateways` | `/admin/payment-gateways` |
| Activity log | History | `view activity log` | `/admin/activity` |
| AI assistant | Sparkles | `use ai assistant` | `/admin/ai` |
| Settings | Settings | signed in | `/settings/profile` |

Rail groups with thin separators: **Sales** (Home, Sell, Orders), **Catalog** (Products, Categories, Stock), **Insight** (Reports, AI), **Organisation** (Regions, Branches, Users, Roles), **System** (Gateways, Activity, Settings).

### ContextBar rules

| User | Region control | Branch control |
|---|---|---|
| Superadmin | switcher: All regions or one | switcher: All branches in region or one |
| Region Admin | locked chip | switcher inside their region |
| Branch Admin, Inventory Manager | locked chip | locked chip |

The selection filters dashboards, reports and lists. It never widens permissions: policies still decide what a user may open.

Status pills: **Online** (green dot) or **Offline** (amber, with "Sales saved on device" on terminal only), **Sync** count opens `SyncQueueSheet`, **Till** shows Open with time or Closed.

## 6.4 Back-office screens

### Home (`/admin`)
- **Permission:** `access admin panel`.
- **Layout:** row one, `LauncherTile`s for every permission the user holds (Sell, Orders, Products, Stock, Reports, Users…). Row two, `KpiRow`: sales today, orders today, average basket, low-stock count. Row three, left `TillStatusCard` per branch (dot green open, grey closed, cashier, cash in till), right `LiveSalesFeed` (last 20 sales, live). Bottom: payment-method split and `LowStockStrip`. `InsightCard`s from AI sit under the KPI row when enabled.
- **Superadmin extra:** region cards (sales, branches active, currency) above the KPI row when ContextBar is on All regions.
- **States:** loading = skeleton tiles. No sales yet = "No sales today. Open a till to start selling." with Open till.
- **Responsive:** tiles wrap to 2 columns on tablet, 1 on phone. Feed hides under the tills on narrow screens.

### Regions (`/admin/regions`) — `manage regions`
- **List pane:** search, `TreeList` with each region and its branches nested, count badge, status dot. "New region" in the PageHeader.
- **Detail pane:** header (name, country flag text, currency, status). Toolbar: Edit, Deactivate. Tabs: **Overview** (country, currency, tax rate, timezone), **Gateways** (switch per gateway: Cash, M-Pesa, Airtel, Card, PayPal), **Branches** (table), **Activity**.
- **Create/edit:** `FormSplit`. Sections: Basics (name), Money and tax (currency, tax rate, tax label), Locale (country, timezone). Sticky bar: Save changes / Cancel.
- **Deactivate:** typed `ConfirmDialog`. Copy: "Deactivating Kajiado hides it from switchers and stops new sales in its branches. Existing orders stay."
- **Denied:** `PermissionDenied` page-level.

### Branches (`/admin/branches`) — `manage branches`
- **List pane:** grouped by region (Superadmin) or flat (Region Admin). Row: name, staff count, till dot.
- **Detail pane:** Overview (address, phone, region), **Staff** (users at this branch with role chips), **Warehouses**, **Till** (today's sessions), **Activity**. Toolbar: Edit, Deactivate.
- **Create/edit:** `FormSplit`: Basics, Contact, Region (locked for Region Admin).
- **Scoping:** Region Admin only sees branches in their region (policy). Empty state for a Region Admin with no branches: "No branches in this region yet. Add the first one."

### Users (`/admin/users`) — `manage users`
- **List pane:** search, filter chips by role and branch, row = avatar, name, role chip, branch, status dot.
- **Detail pane:** header avatar + name + role chip + branch chip. Toolbar: **Edit**, **Reset password**, **Change role**, **Deactivate**. Tabs: **Overview** (email, branch, region, last sign-in), **Permissions** (read-only list inherited from the role, grouped by resource, so nobody hand-assigns direct permissions), **Activity** (their actions from the activity log).
- **Create/edit:** `FormSplit`: Identity (name, email, password on create), Access (role, then a branch picker for branch roles or a region picker for Region Admin, hidden for Superadmin), Status.
- **Guard rails:** Branch Admin only sees their branch. Nobody can deactivate themselves. Last Superadmin cannot be deactivated. Both show inline explanations instead of disabled buttons with no reason.

### Roles (`/admin/roles`) — `manage roles`, Superadmin only
- **List pane:** roles with user counts. "New role" (rare, the copy says so).
- **Detail pane:** role name, user count. `PermissionMatrix` grouped by resource (Catalog, Stock, Orders, Till and POS, Organisation, Reports, AI, System). A "N changes not saved" bar appears when anything changes with a summary: "+ refund orders, − adjust stock". Save button: "Save permissions".
- **Rules on screen:** Superadmin row is locked with the note "Superadmin always has every permission." Delete of a role in use opens the typed confirm and shows how many users will lose access.
- **Note under the matrix:** "Permission names are set by developers. You can change which role has them, not create new ones." (matches doc 04.)

### Categories (`/admin/categories`) — `manage categories`
- **List pane:** tree, drag to reorder, product count. **Detail:** name, parent, products in it, Edit, Delete (blocked with reason if products exist).

### Products (`/admin/products`) — `view products`
- **List pane:** search by name, SKU, barcode. Filters: category, stock state, active. Row: thumbnail, name, SKU (mono), price, stock badge for the current branch.
- **Detail pane:** image gallery, name, category chip. Tabs: **Details** (description, base price), **Variants** (table, add row inline), **Stock** (per warehouse, quick adjust stepper), **Prices by region** (table: region, currency, price override), **Activity**.
- **Toolbar (by permission):** Edit (`edit products`), Duplicate, Deactivate, Delete (`delete products`).
- **Create/edit:** `FormSplit`: Basics, Pricing, Variants, Images, Stock. Barcode field accepts a scan.
- **Bulk:** select rows → Change category, Deactivate, Export CSV. Import CSV is Phase 2.

### Stock (`/admin/stock`) — `view stock`
- **List pane:** items with on-hand, reorder point, badge (OK, Low, Out). Filters: warehouse, state.
- **Detail pane:** item header + on-hand per warehouse. **Movement timeline** (purchase, transfer, adjustment, return, wastage with who and when). Toolbar: **Adjust stock** (`adjust stock`), **Transfer** (`transfer stock`).
- **Adjust:** dialog. Quantity change, reason (required), note. Copy on save: "Stock adjusted."
- **Transfer:** split dialog, From warehouse → To warehouse, quantity, both live counts shown. Cannot exceed source stock.

### Orders (`/admin/orders`) — `view orders`
- **List pane:** grouped Today / Yesterday / date. Row: order number (mono), time, total, payment dots, `Stamp` state.
- **Detail pane:** the **receipt** (paper, mono) with lines, tax, payments, cashier, till. Toolbar: **Reprint**, **Email or SMS receipt**, **Refund** (`refund orders`, over the limit asks `ManagerOverrideDialog`). Tabs: Receipt, Payments (gateway, reference, status), Activity.
- **Refund flow:** pick lines and quantities, reason, method (back to original method by default). Result stamps the receipt REFUNDED.

### Payment gateways (`/admin/payment-gateways`) — `manage payment gateways`
- **List pane:** Cash, M-Pesa, Airtel Money, Card (Pesapal or Flutterwave), PayPal, each with a coloured dot and state.
- **Detail pane:** enable switch per region, credentials form (secret values masked, "Replace key"), **Test connection** button with a result line, environment badge (Sandbox / Live). Turning a gateway off asks confirm: "Cashiers in Kajiado will no longer see M-Pesa."

### Reports (`/admin/reports`) — `view branch reports` / `view region reports`
- **Layout:** DateRangePicker + scope chips at the top. Tabs: Sales, Payments, Stock, Cashiers, Tills. Each tab: KPI row, chart, `DataTable` with CSV export. AI summary card on top when enabled ("Sales are up 12% on last week, driven by …").
- **States:** no data in range = "No sales in this range. Try a wider range."

### Activity log (`/admin/activity`) — `view activity log`
- Filter by user, model, action, date. Row: who, what, when, expand for changed fields (old → new). Scoped by region and branch by policy.

### Settings (`/settings/*`)
Existing profile, password, two-factor, passkeys, appearance. Add: **Appearance** default dark, **Terminal** (sounds, haptics, shortcut help) for users with `use pos terminal`.

## 6.5 Terminal POS (`/pos`)

`layouts/app/app-terminal-layout.tsx`. Full screen, no sidebar, no breadcrumbs. Fixed regions so nothing jumps.

### Sell screen anatomy (10" landscape)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Ngong · Kajiado   Wanjiku (Cashier)   Till ● open 08:02   🖨   ● Online   ⋮ │ TerminalBar
├───────────────────────────────────────────────┬──────────────────────────┤
│ [ ▮▮▮ Scan or search product…          ]  ⌫   │  ┌────────────────────┐  │
│ [All] [Drinks] [Bread] [Dairy] [Cleaning] › │  │ Order #0142         │  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │ Customer: Walk-in ▸ │  │
│ │  img   │ │  img   │ │  img   │ │  img   │ │  │ - - - - - - - - - - │  │
│ │ Milk 1L│ │ Bread  │ │ Sugar  │ │ Soda   │ │  │ Milk 1L   2 × 130   │  │
│ │ 130.00 │ │ 65.00  │ │ 210.00 │ │ 60.00  │ │  │           260.00    │  │
│ │ ● 24   │ │ ● 8    │ │ ● Low  │ │ ● 40   │ │  │ Bread     1 ×  65   │  │
│ └────────┘ └────────┘ └────────┘ └────────┘ │  │            65.00    │  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │ - - - - - - - - - - │  │
│ │  …     │ │  …     │ │  …     │ │  …     │ │  │ Subtotal    325.00  │  │
│ └────────┘ └────────┘ └────────┘ └────────┘ │  │ VAT 16%      44.83  │  │
│                                               │  │ TOTAL   KES 325.00  │  │
│ [Hold] [Recall 2] [Discount] [Customer]      │  └▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾▾┘  │
│                                               │  [   Charge KES 325   ]  │
└───────────────────────────────────────────────┴──────────────────────────┘
```

- **Left (about 62%):** `ScanField` (always focused), `CategoryChips` (horizontal scroll), `ProductGrid` of `ProductTile`s (4 columns on 10", 3 on 8"). Action row under the grid: Hold, Recall (count badge), Discount, Customer.
- **Right (about 38%):** `CartReceipt`, the paper strip with perforated bottom edge. Lines show name, quantity × unit price, line total in DM Mono. Rules are dashed. Under the paper: `PayBar` with the Charge button in Till green, 56px high, full width.
- **Tap a tile:** adds 1, plays scan flash and tick. Tap a line: opens qty stepper and note. Swipe a line left (touch) or press the ✕ (mouse): remove with undo toast.
- **Product with variants:** tile opens `VariantPicker` (bottom sheet, size and colour chips with stock per variant).
- **Out of stock tile:** dimmed with "Out". Tap shows "Out of stock at Ngong. Check another branch?" only for users with `view stock`.
- **Tile stock badge:** green dot with count, amber "Low", red "Out".
- **Barcode scan:** the field detects fast keystroke bursts ending in Enter and adds instantly. Unknown barcode: shake, buzz, toast error "Barcode 616… is not in this branch's catalog."
- **8" portrait:** grid takes the full width, cart is a bottom bar (item count + total + Charge) that expands into the receipt sheet.

### Customer, discount, hold

- **Customer:** `CustomerPicker` (search by phone or name, or "Add customer" with name and phone only). Chip on the cart shows "Walk-in" or the name.
- **Discount:** `DiscountDialog` with percent or amount, applies to line or whole order. Limit comes from settings. Above the limit or without `apply discounts`: `ManagerOverrideDialog` (manager PIN or passkey, shows who approved).
- **Hold / Recall:** Hold saves the cart with a label (time, or customer) and clears the screen. `HeldOrdersDrawer` lists held carts with time and total, tap to recall. Held carts older than the shift are flagged.

### Payment sheet

Tap Charge. `PaymentSheet` slides up over the cart (right side on desktop, bottom sheet on tablet).

```
┌──────────────────────────────────────────────┐
│ Charge                             KES 325.00 │
│ Paid 0.00        Remaining 325.00             │
│ ┌────────────┐ ┌────────────┐                 │
│ │ ● Cash     │ │ ● M-Pesa   │                 │
│ └────────────┘ └────────────┘                 │
│ ┌────────────┐ ┌────────────┐                 │
│ │ ● Airtel   │ │ ● Card     │                 │
│ └────────────┘ └────────────┘                 │
│ Split payments                                │
│  (none yet)                                   │
└──────────────────────────────────────────────┘
```

- `GatewayTile`s are `rounded-2xl`, 56px+ tall, with a coloured dot (from `gw-*` tokens) and the method name. Only gateways the region has enabled appear. PayPal is storefront only and never shows here.
- Amount defaults to the remaining balance and can be edited for split payments. Added payments list under "Split payments" with remove.

#### Cash panel
- `NumPad` with amount tendered, note shortcuts **50 / 100 / 200 / 500 / 1000** and "Exact".
- `ChangeDue` shows in large mono the moment tendered ≥ due: "Change KES 175.00".
- Confirm button: "Take cash KES 500".

#### M-Pesa panel
- Phone field prefilled from the customer, `254…` format check, "Send M-Pesa request".
- **Waiting state (blocking):** "Request sent to 0712 … Ask the customer to enter their PIN." Countdown from 60s. Buttons: **Resend**, **Cancel payment**. Updates live when the callback lands (Reverb), no manual refresh.
- **Outcomes:** success → stamp and success screen. Cancelled by customer → "Customer cancelled the request." with Resend or Choose another method. Timeout → "M-Pesa request timed out. Ask the customer to check their phone, then resend." Insufficient funds → "The customer's balance is too low."
- **Offline:** tile disabled with "Needs internet".

#### Airtel Money panel
Same layout and states as M-Pesa with its own copy ("Send Airtel Money request").

#### Card panel
Depends on the aggregator: hosted flow or a paired card reader. Spec: "Waiting for card" blocking state with Cancel, outcomes Approved, Declined ("Card declined. Try another card or method."), Cancelled.

### Success screen
- Big check, `Stamp` PAID lands with `animate-stamp`. Change due if any.
- Buttons: **Print receipt** (primary), **SMS receipt**, **Email receipt**, **New sale**. New sale also fires automatically after 20 seconds if nothing is tapped, with a visible countdown that can be paused.
- Printer missing or offline: "Printer not connected. Send the receipt by SMS or email instead." Print button becomes Retry.

### Receipt preview
Paper tone, DM Mono, branch name and address, order number, date and time (region timezone), lines, tax line with label, total, payments, change, cashier, footer text from settings, KRA or tax pin when configured. Same component prints and exports.

### Orders today
Drawer from the TerminalBar menu: today's sales at this till, tap to open receipt preview, Reprint, and Refund (with `ManagerOverrideDialog` when required).

### Till open and close
- **Open till** (dialog on first entry of the day): count opening cash (by note or total), Open till. No selling before it.
- **Close till** (`CloseTillWizard`, 3 steps): 1) count cash by note with running total, 2) variance shown against expected ("Short by KES 50" in amber, "Over" in blue, "Balanced" in green), reason required when off, 3) Z report preview and Print / Close till. After close: lock screen.
- **X report** (mid-shift snapshot) from the TerminalBar menu, no closing.

### Offline behavior (terminal)
- Banner: "Offline. Sales are saved on this device and will sync." Pill in TerminalBar shows waiting count.
- Cash sales continue. Digital payments are disabled. Held carts keep working.
- On reconnect: "Synced 3 sales." toast. Conflicts (item sold out elsewhere) go to `SyncQueueSheet` with per-sale Resolve actions for a manager.

### TerminalBar menu (⋮)
Orders today, X report, Hold list, Contrast (Normal / High / Daylight), Sounds, Shortcut help, Lock, Close till, Sign out.

### Terminal error moments

| Moment | Message | Recovery |
|---|---|---|
| Product lookup fails | "Couldn't load products. Showing saved items." | Retry, works from cache |
| Payment gateway down | "M-Pesa isn't responding. Try Airtel, cash or card." | choose another tile |
| Printer error | "Receipt didn't print." | Retry, SMS, email |
| Session expired | lock screen, not a login redirect | PIN or passkey |
| Till closed while selling | "Till is closed. Open the till to sell." | Open till |

[← 05 UI foundations](./05-ui-foundations.md) | [Index](./00-index.md) | [Next: 07 Storefront, AI, messages →](./07-ui-screens-storefront-and-ai.md)
