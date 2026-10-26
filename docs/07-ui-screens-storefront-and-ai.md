# 07 — Screens: Storefront, AI, Messages, Build Order

[← 06 Back-office and terminal](./06-ui-screens-backoffice-and-terminal.md) | [Index](./00-index.md)

Same screen format as doc 06. Tokens and component names come from doc 05.

## 7.1 Storefront (public)

`layouts/shop/shop-layout.tsx`. Mobile first (360px), follows the visitor's system light or dark setting, same Sky brand. Mounted only for regions and branches that have the storefront switched on.

### Shell
- **ShopHeader:** logo, search (always visible on desktop, icon that expands on phone), region and currency switcher (only if more than one region is live), account, cart with count. Sticky.
- **ShopFooter:** branch or business details, payment methods accepted (names, no logos until permission), contact, policies.
- **Cart** is a `CartDrawer` (bottom sheet on phone, right drawer on desktop) so shoppers never lose their place.
- **Data-light rules:** images lazy load and use small sizes on phones, skeletons instead of spinners, no autoplay media.

### Pages

| Page | Route | What is on it |
|---|---|---|
| Home | `/shop` | `HeroBanner` (one promotion or the store's own product photo), `CategoryRail` (horizontal chips), "Popular" and "New" product rows, assistant widget |
| Category | `/shop/c/{slug}` | title, product count, filter drawer (price slider, in stock), sort, `ProductCard` grid (2 columns phone, 4 desktop), Load more |
| Search | `/shop/search?q=` | same grid, "N results for …", no-results state: "Nothing matches 'xyz'. Try fewer words or browse categories." with category chips |
| Product | `/shop/p/{slug}` | `ProductGallery` (swipe on phone), name, price in the visitor's region currency (mono), `VariantSelector`, `StockNote` ("Only 3 left", "Out of stock" with a "Tell me when back" only if you choose to build it), Add to cart, description, related products |
| Cart | drawer, or `/shop/cart` on desktop | lines with qty steppers, remove, subtotal, tax line, Checkout button. Empty: "Your cart is empty. Browse products." |
| Checkout | `/shop/checkout` | `CheckoutStepper`: **Contact** (guest email and phone, or sign in), **Fulfilment** (`FulfilmentPicker`: pickup at a branch by default, delivery only if you decide to build it), **Payment** (`PaymentMethodPicker`), **Review**. Order summary sticks below on phone, right column on desktop |
| Payment waiting | `/shop/pay/{order}` | M-Pesa or Airtel: "Check your phone and enter your PIN" with countdown, Resend, Change method. Card: redirects to the aggregator's hosted page and returns here. PayPal: the PayPal button on the Payment step |
| Confirmation | `/shop/orders/{ref}/done` | `Stamp` PAID, order number with copy button, summary, "Track your order", receipt sent by email or SMS |
| Order tracking | `/shop/track` and `/shop/orders/{ref}` | guests enter order number + phone or email. `OrderTracker` timeline: Received, Paid, Being prepared, Ready for pickup, Collected |
| Account | `/shop/account` | orders list (master-detail on desktop, list then page on phone), profile, saved phone, sign out |
| Sign in / register | `/shop/login` | short forms, guest checkout always offered |
| Info pages | `/shop/about`, `/shop/contact`, `/shop/policies` | plain content |

### Payment method picker

| Method | Shows for | Behavior |
|---|---|---|
| M-Pesa | regions with it enabled | phone number field, "Send M-Pesa request", waiting page |
| Airtel Money | regions with it enabled | same pattern |
| Card | regions with the aggregator enabled | hosted page via Pesapal or Flutterwave |
| PayPal | regions with it enabled, non-KES buyers surfaced first | PayPal button, shows converted amount and currency clearly |

Amounts always show the currency code. If a PayPal buyer sees a different currency than the shelf price, show both: "KES 4,000 ≈ USD 31".

### Storefront states

| State | Copy and behavior |
|---|---|
| Out of stock while checking out | "Milk 1L just sold out. Remove it to continue." with Remove and Keep shopping |
| Price changed | "Sugar 2kg is now KES 220 (was 210). Review your cart." before payment |
| Payment failed | "Payment didn't go through. Your cart is saved. Try again or pick another method." |
| Offline | banner "You're offline. Reconnect to place your order." Browsing cached pages still works |
| Store closed or storefront off | "This shop isn't taking online orders right now." |

## 7.2 AI surfaces

Built on Laravel AI. Four surfaces, one visual language: **AI violet** (`ai` tokens) appears only here, so the assistant is recognisable without being loud.

| Surface | Where | Who |
|---|---|---|
| **AI Center** | page `/admin/ai`, full chat | `use ai assistant` |
| **AI Panel** | right slide-over on any back-office page, ⌘J or the ✦ button in the ContextBar | `use ai assistant` |
| **Insight cards** | dashboard, stock, orders, reports | `view ai insights` |
| **Shop assistant** | floating widget on storefront | anyone, product and order questions only |

### AI Center layout (the general AI chat structure)

```
┌────────────────┬─────────────────────────────────────────────────────┐
│ ✦ New chat     │                                                     │
│ [ Search… ]    │        How did Ngong do last week?          ← user  │
│                │        (soft rounded card, right side)              │
│ Today          │                                                     │
│  Ngong last…   │  ✦  Ngong sold KES 482,300 across 1,204 orders,     │
│  Low stock…    │     up 9% on the week before. Most of the growth    │
│ Yesterday      │     came from Drinks and Bread.        ← assistant  │
│  Refund audit  │                                        (plain text)  │
│ Last 7 days    │     ▸ Looked up sales for Ngong, 7 days · 1,204 rows │
│  …             │     ┌ table / chart result block ─────────────────┐ │
│                │     └──────────────────────────────────────────────┘ │
│ (BK) Settings  │     [Orders in Ngong] [Sales report]  sources       │
│                │     ⧉ Copy   ↻ Regenerate   👍 👎                    │
│                ├─────────────────────────────────────────────────────┤
│                │  ┌───────────────────────────────────────────────┐  │
│                │  │ Ask about sales, stock or orders…             │  │
│                │  │ ＋  /report  /stock                     [ ↑ ] │  │
│                │  └───────────────────────────────────────────────┘  │
│                │  AI can make mistakes. Check figures before acting. │
└────────────────┴─────────────────────────────────────────────────────┘
```

- **History rail (left, collapsible):** New chat, search, conversations grouped Today / Yesterday / Last 7 days / Older. Rename and delete on hover. Hidden on tablet behind a menu button.
- **Thread (center):** `max-w-chat` (46rem) centered. Assistant messages are **plain text on the page** with a small ✦ mark, no bubble, rendered with `.chat-prose`. User messages are a soft rounded card (`chat-user`) aligned right.
- **Composer (bottom):** rounded box (`composer` token), auto-growing textarea, `＋` for attachments (CSV, images for snap-to-inventory), slash commands (`/report`, `/stock`, `/orders`, `/branch`), Send button that becomes Stop while streaming. Enter sends, Shift+Enter adds a line. Disclaimer line under it.
- **Streaming:** text appears progressively with the `ai-caret`. `ThinkingIndicator` (three soft dots + "Looking up sales…") before the first token.
- **Tool call cards:** collapsed one-liner "Looked up sales for Ngong, 7 days · 1,204 rows". Expand shows the filters used (branch, dates) so anyone can see what the answer is based on. No raw SQL.
- **Result blocks:** `ResultTable` (mono numbers, sortable, "Open in Reports"), `ResultChart` (uses chart tokens). Downloadable as CSV.
- **Source chips:** links to real records (an order, a product, a report) so figures can be checked.
- **Message actions:** Copy, Regenerate, Helpful / Not helpful. Feedback writes to `ai_interactions`.
- **Empty state:** greeting by first name, then role-aware `SuggestionChips`:

| Role | Starter prompts |
|---|---|
| Superadmin | "Compare sales across regions this month", "Which branches have unusual refunds?" |
| Region Admin | "Which branch in my region is slowest this week?", "Stock at risk of running out" |
| Branch Admin | "How did today go?", "Who had till shortages this week?" |
| Inventory Manager | "What should I reorder?", "Slow-moving items in the last 30 days" |

### AI Panel (slide-over)
Same thread and composer, narrower (about 420px). Opens with **page context attached** as a removable chip ("Context: Orders · Ngong · Today"). "Open in AI Center" moves the chat to the full page.

### Insight cards
Small cards with a violet edge (`ai-glow`): headline in plain words, one supporting line, and three actions: **Accept**, **Dismiss**, **Why?** (expands the reasoning and the data used).
- Forecast: "Milk 1L will run out in 3 days at Ngong. Suggested reorder: 120."
- Anomaly: "4 refunds by one cashier on Tuesday, above the branch average."
- Promo: "Sugar 1kg has barely moved in 30 days. A 10% discount is suggested."
Accepting never changes data silently: it opens the normal form prefilled (purchase order, discount) for a human to confirm.

### Natural-language reports
Ask in chat, get a `ResultTable` or `ResultChart` with the scope stated in the first line ("Ngong, 21–27 Sep, KES"). Scope is never implied.

### Shop assistant widget
Round button bottom-right, opens a compact chat (same anatomy, smaller, no history rail, no slash commands). Answers product and order-status questions only, and order status needs the order number plus phone or email. Never shows stock counts beyond "In stock / Only a few left / Out of stock".

### AI rules (safety, non-negotiable)

1. **The assistant runs with the signed-in user's permissions and scope.** Every AI data tool goes through the same policies and region and branch scoping as the UI. A Branch Admin's assistant cannot see another branch. This is enforced on the server, not in the prompt.
2. **The shop assistant is read-only and sees only public catalog data plus the one order the customer proves ownership of.**
3. **AI never writes data itself.** It suggests. A person confirms in the normal form.
4. **Every interaction is stored** in `ai_interactions` with user, scope, tools used and the response, and important accept actions also go to the activity log.
5. **Figures show their scope and source** (branch, dates, currency) and link to records.
6. **Switching AI off must not break anything.** `manage ai settings` can disable each surface, and spending caps stop new requests with a clear message.

### AI states

| State | Copy |
|---|---|
| Disabled by admin | "AI assistant is turned off for your organisation." (no chat UI, nav item hidden) |
| No permission | `PermissionDenied` |
| Rate or spend cap reached | "Today's AI limit is used up. It resets at midnight." |
| Model error | "That didn't work. Try again." with Retry, the user's message stays in the composer |
| Data lookup empty | "No sales found for Ngong on those dates." never invented numbers |
| Long answer cut by Stop | keeps what was generated, marks "Stopped" |

## 7.3 System messages catalog

Every event, where it appears and the words. Use these strings, do not invent variants.

| Event | Channel | Where it shows | Copy |
|---|---|---|---|
| Record saved | toast success | any form | "Changes saved." / "Region created." |
| Record deactivated | toast success | lists | "Branch deactivated." |
| Validation failed | inline + focus first field | forms | field-specific plain text |
| Server error on save | toast error, stays | any | "Couldn't save. Check your connection and try again." + Retry |
| Permission missing | `PermissionDenied` | page | "You don't have access to this. Ask an admin if you need it." |
| Low stock | notification + insight card | bell, dashboard | "Milk 1L is low at Ngong (4 left)." |
| Stock out | notification | bell | "Bread is out of stock at Ngong." |
| Till opened | notification (branch admin) | bell | "Wanjiku opened the till at Ngong (KES 2,000 float)." |
| Till variance | notification | bell | "Till at Ngong closed short by KES 50." |
| Payment received | toast on terminal, notification online | terminal, bell | "M-Pesa payment received. KES 325." |
| Payment failed | terminal state / toast error | terminal | see doc 06 |
| Refund made | notification | bell (approvers) | "Order 0142 refunded by Wanjiku. Approved by Peter." |
| Went offline | banner | terminal | "Offline. Sales are saved on this device and will sync." |
| Back online | toast info | terminal | "Back online. Synced 3 sales." |
| Sync conflict | banner + sheet | terminal | "1 sale needs a manager's review." |
| Session expiring | banner | back-office | "You'll be signed out in 2 minutes. Stay signed in" |
| Role changed | notification | that user | "Your role changed to Branch Admin." |
| Gateway toggled | toast + activity | gateways | "M-Pesa turned off for Kajiado." |
| AI insight ready | notification | bell | "New suggestion: reorder Milk 1L." |

Delivery: Laravel Notifications (database) now, drives the bell and `NotificationCenter`. Firebase push is added at the end of MVP for the same events, so this table stays the single source of wording.

## 7.4 Error and status pages

All use the shell they occur in, one heading, one sentence, one action.

| Page | Heading | Line | Action |
|---|---|---|---|
| 403 | You don't have access | "Your role doesn't include this page." | Back to home |
| 404 | Page not found | "The link may be old or mistyped." | Back to home |
| 419 | Your session expired | "Sign in again to continue. Your work on this page wasn't saved." | Sign in |
| 429 | Slow down a little | "Too many requests. Try again in a minute." | Try again |
| 500 | Something broke on our side | "It's been logged. Try again, and tell an admin if it keeps happening." | Try again |
| 503 | Back in a few minutes | "We're updating the system." | none |
| No role yet | Your account isn't set up yet | "An admin needs to give you a role." | Sign out |
| Terminal offline first load | Can't reach the server | "No saved catalog on this device yet. Connect once to download it." | Retry |

## 7.5 Printed and exported output

- **Receipt (58mm / 80mm thermal):** same `receipt` component in print mode, mono face, no tokens beyond black on white, max 32 or 48 characters per line. Same data as the screen preview.
- **Z and X reports:** receipt-styled, one page.
- **PDF and CSV exports:** reports and orders. Currency code in headers, timezone stated.
- **Invoices for online orders:** email body uses the receipt layout, not marketing HTML.

## 7.6 Build order (hand this to the next agent)

1. **Tokens:** drop in `app.css`, load DM Mono, set dark as the default appearance, confirm existing pages still look right.
2. **Primitives:** add the shadcn set marked phase 1 in doc 05 §5.6B.
3. **Shell:** upgrade `app-sidebar-layout` to icon-collapsible, build `ContextBar`, `StatusPills`, rail items with the permission filter, `can()` helper, shared props, flash → toast.
4. **Shared building blocks:** `Money`, `StatusBadge`, `EmptyState`, `PageHeader`, `MasterDetail`, `ListPane`, `DetailPane`, `FormSplit`, `ConfirmDialog`.
5. **Back-office pages, in this order:** Home, Regions, Branches, Users, Roles (with `PermissionMatrix`), then Products, Categories, Stock, Orders, Gateways, Reports, Activity.
6. **Terminal:** `app-terminal-layout`, lock and till flow, Sell screen with `ScanField` and `CartReceipt`, Cash payment, success and receipt, then M-Pesa, Airtel, card, split, hold, refund, offline queue.
7. **Firebase push:** end of MVP, same events as §7.3.
8. **Storefront:** shell, catalog, product, cart, checkout, payment waiting, tracking.
9. **AI:** AI Center and panel with the safety rules in §7.2 first, then insight cards, then the shop assistant.

## 7.7 Open decisions (defaults chosen, change if wrong)

| Decision | Default used in these docs | Why it matters |
|---|---|---|
| Inventory Manager entry | uses the back-office shell, so they need `access admin panel`. Nav filtered to Products and Stock | current `routes/admin.php` puts stock inside the admin group, and the seeded Inventory Manager cannot enter it |
| Region Admin scoping | `users.region_id` column (from the phase 3 discussion) | not yet confirmed. Affects Users form and ContextBar locking |
| Terminal PIN | per-user hashed PIN plus passkey unlock | needs a small backend table or column and rate limiting |
| Storefront fulfilment | pickup at branch only | delivery adds addresses, fees and driver status. Decide before building checkout |
| Storefront theme | follows visitor's system setting | you said keep a dark mood: set to dark default if you want the public shop dark too |
| Cash discount limit | configurable per region, manager override above it | needs a settings field |
| Card in-store | via aggregator hosted flow | a paired card reader is a separate hardware decision |

[← 06 Back-office and terminal](./06-ui-screens-backoffice-and-terminal.md) | [Index](./00-index.md)
