# Windows POS Documentation

This directory contains documentation for building the Flutter Windows POS application.

## Documents

### [STRUCTURE.md](../STRUCTURE.md)
**Folder structure with file-by-file comments**

- Complete folder layout for the Flutter app
- Comments on what each file/folder should contain
- Architectural rules (platform abstraction, money handling, etc.)
- Organized by feature: splash, auth, till, sell, payment, receipt, orders, settings

### [WINDOWS_POS_BUILD_GUIDE.md](./WINDOWS_POS_BUILD_GUIDE.md)
**Complete build and integration guide**

- Architecture overview (web vs Windows POS)
- API integration requirements (endpoints, response format, Dio client)
- Building the Windows app (setup, window configuration, single instance)
- Authentication flow (login, idle lock, token storage, scope from token)
- Data synchronization (catalog caching, offline sales outbox, sync service)
- Printing integration (printer interface, Windows implementation, ESC/POS)
- Offline mode (offline selling, online detection, sync priority)
- Testing (unit, widget, integration tests)
- Deployment (MSIX/Inno Setup installers, code signing, auto-update)
- Troubleshooting guide

## Quick Start

### 1. Understand the Architecture

**Web POS (current state):**
- Uses Inertia.js for server-side rendering
- Session cookies for authentication
- Controllers return Inertia pages
- Full feature set (admin + terminal)

**Windows POS (to be built):**
- Flutter desktop app for Windows
- Requires `/api/v1` JSON endpoints
- Sanctum device tokens for authentication
- Terminal-only (cashier + Branch Admin selling)
- Offline selling capability
- Same UI/UX as web terminal

### 2. Key Dependencies

**Shared Backend Work (Laravel):**
1. Create `/api/v1` routes
2. Extract controller logic into Action/Service classes
3. Implement Sanctum authentication
4. Add idempotency key handling for sales

**Flutter App:**
- `go_router` - Navigation
- `dio` - HTTP client
- `flutter_riverpod` - State management
- `drift` - SQLite database
- `flutter_secure_storage` - Secure token storage
- `window_manager` - Window management
- `thermal_printer_flutter` or `windows_printer` - Printing
- `intl` - Internationalization

### 3. API Endpoints Required

The Windows POS needs these `/api/v1` endpoints:

**Auth:**
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/two-factor` - 2FA verification
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - User, permissions, branch, region

**Catalog:**
- `GET /api/v1/catalog/categories` - Categories list
- `GET /api/v1/catalog/products` - Products with variants
- `GET /api/v1/catalog/updated-since` - Delta updates

**Till:**
- `GET /api/v1/till/current` - Current till session
- `POST /api/v1/till/open` - Open till
- `POST /api/v1/till/close` - Close till
- `GET /api/v1/till/x-report` - X report

**Orders:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/today` - Today's orders
- `GET /api/v1/orders/{id}` - Order details
- `POST /api/v1/orders/{id}/refund` - Refund order

**Payments:**
- `POST /api/v1/payments/initiate` - Initiate payment
- `GET /api/v1/payments/{id}/status` - Check status
- `POST /api/v1/payments/{id}/cancel` - Cancel payment

**Sync:**
- `POST /api/v1/sync/upload` - Batch upload offline sales

**Misc:**
- `GET /api/v1/settings` - App settings
- `GET /api/v1/health` - Health check
- `GET /api/v1/min-version` - Minimum app version

### 4. Development Phases

**Phase 1: Foundation (1.5-2 weeks)**
- API v1 endpoints (auth, me, catalog)
- Flutter skeleton setup
- Theme implementation
- Splash screen
- Login and auth

**Phase 2: Core Selling (2 weeks)**
- Till open/close
- Catalog loading and caching
- Cart implementation
- Cash sale flow
- Receipt preview

**Phase 3: Payments & Printing (2 weeks)**
- Printing integration (spike thermal_printer_flutter)
- Scanner integration
- M-Pesa and Airtel payments
- Card payments
- Success screen

**Phase 4: Advanced Features (2 weeks)**
- Offline outbox and sync
- Hold and recall orders
- Refund flow
- Close till and Z report

**Phase 5: Polish & Deploy (1-2 weeks)**
- Settings screen
- Contrast modes
- Installer (MSIX or Inno Setup)
- Code signing
- Auto-update
- Pilot testing

### 5. Architecture Rules

**Platform Abstraction:**
- UI code never checks `Platform.isWindows`
- Only `core/platform` checks platform, behind interfaces
- This makes Android build cheap later

**Money Handling:**
- Money is **integer minor units** (cents) in Dart
- Never use `double` for money
- API sends decimal strings, convert on receipt

**Error Handling:**
- All API calls return `Result<T, Failure>`
- Controllers expose state, UI picks surface
- Global error hooks for crash reporting

**Offline Safety:**
- Sales write to outbox before API call
- Unsynced sales survive auth failure, crash, logout
- Sync happens after sign-in

### 6. Current Web POS Structure

The web POS is located at:
- **Routes:** `routes/pos.php`
- **Controllers:** `app/Http/Controllers/Pos/`
- **Pages:** `resources/js/pages/pos/index.tsx`
- **Components:** `resources/js/components/pos/`

**Key files to understand:**
- `PosController.php` - Terminal data loading, sale creation
- `TillController.php` - Till open/close logic
- `pos/index.tsx` - Main sell page React component
- `terminal-bar.tsx` - Top bar component
- `cart-panel.tsx` - Cart as receipt
- `payment-sheet.tsx` - Payment modal

### 7. Current Flutter State

The Flutter project currently has:
- Basic Flutter template (`lib/main.dart`)
- Windows platform support
- No POS-specific code yet

**Next steps:**
1. Update `pubspec.yaml` with required dependencies
2. Create folder structure per `STRUCTURE.md`
3. Implement theme and design system
4. Build splash and auth flow
5. Connect to API once endpoints are ready

## Questions to Answer

Before starting development, confirm:

1. **Does `/api/v1` already exist?**
   - Currently: Only M-Pesa callback exists at `/api/v1/payments/mpesa/callback`
   - Need: Full API v1 implementation

2. **Riverpod OK for state management?**
   - Or match what you use in other Flutter apps?

3. **App scope: Cashier and Branch Admin only?**
   - Admin stays on web dashboard?

4. **Printer model and connection?**
   - USB, LAN, or Bluetooth?
   - Which thermal printer models?

5. **Offline selling in first release?**
   - Or add after online-only version works?

## How This Connects to Web POS

### Shared Backend Logic

**Current web POS flow:**
```
User visits /pos → Auth middleware → PosController@index
  → Load terminal data → Inertia::render('pos/index')
```

**Windows POS flow:**
```
User opens app → Splash → Login → POST /api/v1/auth/login
  → GET /api/v1/auth/me → Check permissions
  → Till open? → No → POST /api/v1/till/open
  → GET /api/v1/catalog/products → Cache in SQLite
  → Sell screen → POST /api/v1/orders → Payment → Success
```

**Shared logic:**
Both call the same Action/Service classes:
- `LoadTerminalData` - Load products, categories, till
- `CreateOrder` - Create order with items
- `OpenTill` - Open till session
- `CloseTill` - Close till with Z report
- `InitiatePayment` - Start M-Pesa/Airtel/card payment

### UI Parity

The Windows POS should match the web POS UI exactly:

**Terminal bar:**
- Branch name, cashier name
- Till state (open/closed)
- Connection status (online/offline)
- Clock
- Orders button with count
- Menu dropdown (contrast, X report, close till, sign out)

**Product area (62%):**
- Scan field (always focused)
- Category chips
- Product grid with tiles
- Product tile: image, name, price, stock badge

**Cart area (38%):**
- Paper receipt with perforated edge
- Cart lines with dashed separators
- Totals block (subtotal, tax, total)
- Large green Charge button

**Payment sheet:**
- Gateway tiles (cash, M-Pesa, Airtel, card)
- Cash numpad
- M-Pesa waiting state
- Card panel

**Success screen:**
- PAID stamp animation
- Receipt preview
- Print button
- New sale button

### Theme Matching

Colors from web `app.css`:
- Background: Dark warm graphite (not blue-black)
- Primary: Sky blue
- Action/Success: Till green
- Text: Chalk-white
- Fonts: Instrument Sans (UI), DM Mono (money/cart/receipts)

## Getting Started

### For Backend Developer (Laravel)

1. Read `WINDOWS_POS_BUILD_GUIDE.md` - "API Integration" section
2. Create Action/Service classes for POS logic
3. Add `/api/v1` routes in `routes/api.php`
4. Implement Sanctum authentication
5. Test endpoints with Postman
6. Document API contract

### For Frontend Developer (Flutter)

1. Read `STRUCTURE.md` - Understand folder layout
2. Read `WINDOWS_POS_BUILD_GUIDE.md` - Full build guide
3. Update `pubspec.yaml` with dependencies
4. Create folder structure
5. Implement theme (colors, fonts, motion)
6. Build splash screen
7. Implement auth flow (login, 2FA, token)
8. Wait for API endpoints, then connect

### For Both

1. Coordinate on API contract (endpoints, request/response format)
2. Agree on error handling strategy
3. Test integration early (auth + me endpoint)
4. Share Action/Service classes between web and API controllers
5. Maintain UI parity between web and Windows

## Support

For questions or issues:
- Backend: Laravel documentation, Sanctum docs
- Frontend: Flutter docs, package docs (Dio, Drift, etc.)
- Architecture: This documentation
- UI design: Web POS components in `resources/js/components/pos/`
