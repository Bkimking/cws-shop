# Flutter Windows POS - Folder Structure

This document outlines the folder structure for the Flutter Windows POS application.
Each folder and file includes comments on what should exist in that section.

```
pos/
├── lib/
│   ├── main.dart
│   │   # App entry point - initializes app, sets up error zones, runs bootstrap
│   │
│   ├── app/
│   │   ├── app.dart
│   │   │   # Root app widget - wraps app with theme, toast overlay, error boundaries
│   │   │
│   │   ├── bootstrap.dart
│   │   │   # Bootstrap logic - window_manager setup, dependency injection container initialization,
│   │   │   # error zone setup, local DB initialization, service registration
│   │   │
│   │   └── router/
│   │       ├── routes.dart
│   │       │   # Route definitions using go_router - all app routes (splash, login, unlock, sell, etc.)
│   │       │
│   │       └── guards.dart
│   │           # Route guards - auth state checks, permission checks, till state checks,
│   │           # offline mode handling, redirect logic
│   │
│   ├── core/
│   │   ├── config/
│   │   │   ├── env.dart
│   │   │   │   # Environment configuration - base URL, environment badge (Sandbox/Live),
│   │   │   │   # API timeout values, feature flags
│   │   │   │
│   │   │   └── constants.dart
│   │   │       # App constants - min app version, splash duration, idle timeout (5 min),
│   │   │       # PIN retry limit (3), polling intervals
│   │   │
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   │   # Dio client setup - base URL, timeouts (5s connect, 15s receive),
│   │   │   │   # Bearer token from secure storage, headers configuration
│   │   │   │
│   │   │   ├── interceptors/
│   │   │   │   ├── auth_interceptor.dart
│   │   │   │   │   # Adds Bearer token to requests, handles 401 by triggering lock screen
│   │   │   │   │
│   │   │   │   ├── idempotency_interceptor.dart
│   │   │   │   │   # Adds client-generated UUID as idempotency key for sales
│   │   │   │   │
│   │   │   │   ├── error_mapper_interceptor.dart
│   │   │   │   │   # Maps HTTP errors to typed Failure objects (offline, timeout, validation, etc.)
│   │   │   │   │
│   │   │   │   └── retry_interceptor.dart
│   │   │   │       # Retries GET requests only, with exponential backoff
│   │   │   │
│   │   │   └── endpoints.dart
│   │   │       # API endpoint paths - all /api/v1 routes (auth, catalog, till, orders, payments, sync)
│   │   │
│   │   ├── error/
│   │   │   ├── failure.dart
│   │   │   │   # Failure type definitions - offline, timeout, unauthorized, forbidden, validation,
│   │   │   │   # conflict (stock sold out), rate-limited, maintenance, server, unknown
│   │   │   │
│   │   │   ├── error_mapper.dart
│   │   │   │   # Maps Dio errors to Failure types, extracts validation errors from 422 responses
│   │   │   │
│   │   │   └── error_reporter.dart
│   │   │       # Error reporting - logs to rotating local file, redacts tokens/PINs,
│   │   │       # ships logs to server when online
│   │   │
│   │   ├── storage/
│   │   │   ├── secure_storage.dart
│   │   │   │   # Wrapper around flutter_secure_storage - stores auth token, PIN, device ID
│   │   │   │
│   │   │   ├── prefs.dart
│   │   │   │   # Shared preferences wrapper - stores settings (base URL, contrast mode, window size/position)
│   │   │   │
│   │   │   └── local_db/
│   │   │       ├── database.dart
│   │   │       │   # Drift database setup - defines SQLite schema, migration logic
│   │   │       │
│   │   │       ├── tables.dart
│   │   │       │   # Drift table definitions - products, categories, variants, outbox (offline sales)
│   │   │       │
│   │   │       └── daos.dart
│   │   │           # Data access objects - queries for catalog, outbox operations, sync operations
│   │   │
│   │   ├── platform/
│   │   │   ├── window_service.dart
│   │   │   │   # Window management interface - methods for size, position, fullscreen, single-instance guard
│   │   │   │
│   │   │   ├── printer/
│   │   │   │   ├── printer_service.dart
│   │   │   │   │   # Printer interface - printReceipt(), checkPrinterStatus(), getAvailablePrinters()
│   │   │   │   │
│   │   │   │   ├── windows_printer_service.dart
│   │   │   │   │   # Windows implementation using thermal_printer_flutter or windows_printer
│   │   │   │   │
│   │   │   │   └── android_printer_service.dart
│   │   │   │       # Android implementation (for future Android build)
│   │   │   │
│   │   │   ├── scanner/
│   │   │   │   ├── scanner_service.dart
│   │   │   │   │   # Scanner interface - initialize(), listenToScans(), dispose()
│   │   │   │   │
│   │   │   │   ├── windows_scanner_service.dart
│   │   │   │   │   # Windows implementation - USB/COM port barcode scanner
│   │   │   │   │
│   │   │   │   └── android_scanner_service.dart
│   │   │   │       # Android implementation (for future Android build)
│   │   │   │
│   │   │   └── connectivity_service.dart
│   │   │       # Connectivity monitoring - checks online/offline status, notifies listeners
│   │   │
│   │   ├── sync/
│   │   │   ├── outbox.dart
│   │   │   │   # Outbox model - stores offline sales for sync, includes idempotency key
│   │   │   │
│   │   │   └── sync_service.dart
│   │   │       # Sync logic - batch upload of offline sales, conflict resolution, retry logic
│   │   │
│   │   └── utils/
│   │       ├── money.dart
│   │       │   # Money utilities - works with integer minor units (cents), formatting with currency code
│   │       │
│   │       ├── date.dart
│   │       │   # Date utilities - timezone handling (from user's region), formatting
│   │       │
│   │       └── result.dart
│   │           # Result type - success/failure wrapper for repository operations
│   │
│   ├── design/
│   │   ├── theme/
│   │   │   ├── app_theme.dart
│   │   │   │   # ThemeData (dark) - app-wide theme configuration
│   │   │   │
│   │   │   ├── pos_colors.dart
│   │   │   │   # Theme extension - custom color tokens matching web app.css:
│   │   │   │   # tile, key, pay (till green), hold, void, paper, ink, stamps, gateway dots
│   │   │   │
│   │   │   ├── typography.dart
│   │   │   │   # Font configuration - Instrument Sans for UI, DM Mono for money/cart/receipts
│   │   │   │
│   │   │   ├── radii.dart
│   │   │   │   # Border radius tokens - inputs (8px), cards (10-12px), tiles (16-20px), receipt (square)
│   │   │   │
│   │   │   └── contrast_mode.dart
│   │   │       # Contrast mode definitions - normal, high, daylight color palettes
│   │   │
│   │   ├── motion/
│   │   │   ├── durations.dart
│   │   │   │   # Animation durations - page fade (180ms), sheets (220ms), PAID stamp (280ms),
│   │   │   │   # scan flash (420ms), login shake (200ms)
│   │   │   │
│   │   │   ├── curves.dart
│   │   │   │   # Animation curves - ease-out, ease-in-out, standard easing functions
│   │   │   │
│   │   │   └── transitions.dart
│   │   │       # Transition widgets - fade, slide, scale transitions for page navigation
│   │   │
│   │   └── widgets/
│   │       ├── app_button.dart
│   │       │   # Primary button component - variants (primary, secondary, ghost), loading state, disabled state
│   │       │
│   │       ├── app_text_field.dart
│   │       │   # Text input component - show/hide password, validation error display, autofocus
│   │       │
│   │       ├── status_badge.dart
│   │       │   # Status indicator - online/offline, till state, connection status
│   │       │
│   │       ├── money_text.dart
│   │       │   # Money display - DM Mono font, tabular figures, currency symbol, aligned digits
│   │       │
│   │       ├── stamp.dart
│   │       │   # PAID stamp widget - rotated, scaled, ink texture effect
│   │       │
│   │       ├── receipt_paper.dart
│   │       │   # Receipt widget - custom painter for paper texture, dashed rules, perforated edge
│   │       │
│   │       ├── numpad.dart
│   │       │   # Cash numpad - numeric input grid for tendered amount
│   │       │
│   │       ├── pin_pad.dart
│   │       │   # PIN entry - 4-digit numeric grid, dots for entered digits, error shake
│   │       │
│   │       ├── toast.dart
│   │       │   # Toast notification - top-centre position, auto-dismiss, stacked toasts
│   │       │
│   │       ├── confirm_dialog.dart
│   │       │   # Confirmation dialog - title, message, confirm/cancel buttons
│   │       │
│   │       ├── page_banner.dart
│   │       │   # Full-screen banner - update required, server unreachable, maintenance mode
│   │       │
│   │       └── empty_state.dart
│   │           # Empty state illustration - no products, no orders, cart empty
│   │
│   ├── features/
│   │   ├── splash/
│   │   │   ├── splash_page.dart
│   │   │   │   # Splash screen - logo animation, receipt boot strip, progress indicators
│   │   │   │
│   │   │   ├── receipt_boot_strip.dart
│   │   │   │   # Boot animation widget - receipt strip printing under logo with step ticks
│   │   │   │
│   │   │   └── startup_controller.dart
│   │   │       # Startup logic - parallel tasks (storage, settings, token, health check, me endpoint),
│   │   │       # minimum 3s duration, 5s hard cap, crash recovery
│   │   │
│   │   ├── auth/
│   │   │   ├── login_page.dart
│   │   │   │   # Login screen - centered card, logo, email/password fields, sign in button,
│   │   │   │   # version/environment badge, connection pill
│   │   │   │
│   │   │   ├── two_factor_page.dart
│   │   │   │   # 2FA code entry - 6-digit code input, recovery code link, wrong code shake
│   │   │   │
│   │   │   ├── unlock_page.dart
│   │   │   │   # PIN unlock screen - PIN pad, cash-only badge, offline support
│   │   │   │
│   │   │   ├── auth_controller.dart
│   │   │   │   # Auth state management - login, 2FA, logout, PIN verification, idle lock logic
│   │   │   │
│   │   │   ├── auth_repository.dart
│   │   │   │   # Auth API calls - login, two-factor, logout, me endpoint, token refresh
│   │   │   │
│   │   │   └── token_store.dart
│   │   │       # Token management - save/load/delete token from secure storage
│   │   │
│   │   ├── till/
│   │   │   ├── open_till_dialog.dart
│   │   │   │   # Open till dialog - opening cash input, validation, success animation
│   │   │   │
│   │   │   ├── close_till_wizard.dart
│   │   │   │   # Close till wizard - closing cash input, variance calculation, variance reason,
│   │   │   │   # Z report display
│   │   │   │
│   │   │   ├── till_repository.dart
│   │   │   │   # Till API calls - open, close, current status, X report, Z report
│   │   │   │
│   │   │   └── till_report_dialog.dart
│   │   │       # X/Z report display - sales summary, cash totals, payment breakdown
│   │   │
│   │   ├── sell/
│   │   │   ├── sell_page.dart
│   │   │   │   # Main sell screen - terminal bar, product area (62%), cart receipt (38%),
│   │   │   │   # adaptive layout (1100px+ two-pane, <700px cart bottom bar)
│   │   │   │
│   │   │   ├── terminal_bar.dart
│   │   │   │   # Top bar - branch name, cashier, till state, printer status, connection pill, clock,
│   │   │   │   # orders button, menu dropdown (contrast, X report, close till, sign out)
│   │   │   │
│   │   │   ├── scan_field.dart
│   │   │   │   # Always-focused scan input - handles barcode scanner input, keyboard search,
│   │   │   │   # product lookup by SKU
│   │   │   │
│   │   │   ├── category_chips.dart
│   │   │   │   # Category filter - horizontal scrollable chips, "All" option, active state
│   │   │   │
│   │   │   ├── product_grid.dart
│   │   │   │   # Product display - grid of big product tiles, image, name, price, stock badge,
│   │   │   │   # click to add to cart
│   │   │   │
│   │   │   ├── product_tile.dart
│   │   │   │   # Individual product tile - hover/touch states, out of stock visual, price display
│   │   │   │
│   │   │   ├── variant_picker.dart
│   │   │   │   # Variant selection dialog - list of variants for multi-variant products,
│   │   │   │   # price, stock, select button
│   │   │   │
│   │   │   ├── cart_receipt.dart
│   │   │   │   # Cart as paper receipt - perforated edge, cart lines with dashed separators,
│   │   │   │   # totals block, large green Charge button
│   │   │   │
│   │   │   ├── cart_line.dart
│   │   │   │   # Cart line item - product name, variant, quantity, price, line total,
│   │   │   │   # increment/decrement buttons, remove button
│   │   │   │
│   │   │   ├── totals_block.dart
│   │   │   │   # Receipt totals - subtotal, tax, total with DM Mono, aligned digits
│   │   │   │
│   │   │   ├── pay_bar.dart
│   │   │   │   # Payment trigger - large green Charge button, total amount, F2 shortcut hint
│   │   │   │
│   │   │   ├── customer_picker.dart
│   │   │   │   # Customer selection - search customer, select from list, or skip
│   │   │   │
│   │   │   ├── discount_dialog.dart
│   │   │   │   # Discount application - percent or fixed amount, permission check (apply discounts)
│   │   │   │
│   │   │   ├── held_orders_drawer.dart
│   │   │   │   # Held orders - slide-out drawer showing held orders, recall, delete
│   │   │   │
│   │   │   ├── cart_controller.dart
│   │   │   │   # Cart state management - add/remove items, quantity changes, discounts,
│   │   │   │   # totals calculation, stock validation
│   │   │   │
│   │   │   └── catalog_repository.dart
│   │   │       # Catalog API calls - products, categories, variants, updated_since delta,
│   │   │       # local cache refresh
│   │   │
│   │   ├── payment/
│   │   │   ├── payment_sheet.dart
│   │   │   │   # Payment modal - slides over right pane, gateway tiles (cash, M-Pesa, Airtel, card),
│   │   │   │   # method-specific panels
│   │   │   │
│   │   │   ├── gateway_tile.dart
│   │   │   │   # Payment method tile - icon, name, selection state, enabled/disabled state
│   │   │   │
│   │   │   ├── cash_panel.dart
│   │   │   │   # Cash payment - numpad for tendered amount, change calculation, complete button
│   │   │   │
│   │   │   ├── mpesa_waiting.dart
│   │   │   │   # M-Pesa waiting state - animation, phone number display, instructions,
│   │   │   │   # polling every 2s for up to 60s
│   │   │   │
│   │   │   ├── card_panel.dart
│   │   │   │   # Card payment - card terminal integration, amount display, processing state
│   │   │   │
│   │   │   ├── sale_success.dart
│   │   │   │   # Success screen - PAID stamp animation, receipt preview, print button,
│   │   │   │   # new sale button, orders today button
│   │   │   │
│   │   │   ├── payment_controller.dart
│   │   │   │   # Payment state management - method selection, payment initiation, status polling,
│   │   │   │   # error handling, completion
│   │   │   │
│   │   │   └── payment_repository.dart
│   │   │       # Payment API calls - initiate (M-Pesa, Airtel, card), status check, cancel
│   │   │
│   │   ├── receipt/
│   │   │   ├── receipt_preview.dart
│   │   │   │   # Receipt preview - full receipt display, PAID stamp, order details, totals
│   │   │   │
│   │   │   └── print_receipt.dart
│   │   │       # Print logic - ESC/POS receipt generation, printer service call, error handling
│   │   │
│   │   ├── orders/
│   │   │   ├── orders_today.dart
│   │   │   │   # Orders list - today's orders dialog, order number, total, items count, status, time
│   │   │   │
│   │   │   └── refund_flow.dart
│   │   │       # Refund dialog - order selection, refund reason, manager approval (if required)
│   │   │
│   │   └── settings/
│   │       ├── terminal_settings.dart
│   │       │   # Settings screen - server URL, printer selection, contrast mode toggle,
│   │       │   # connection diagnostics
│   │       │
│   │       └── shortcut_help.dart
│   │           # Keyboard shortcuts help - F2 Charge, F4 Hold, / Scan, etc.
│   │
│   └── assets/
│       ├── fonts/
│       │   ├── InstrumentSans-Regular.ttf
│       │   ├── InstrumentSans-Medium.ttf
│       │   ├── InstrumentSans-SemiBold.ttf
│       │   ├── InstrumentSans-Bold.ttf
│       │   ├── DMMono-Regular.ttf
│       │   └── DMMono-Medium.ttf
│       │
│       ├── images/
│       │   ├── logo.png
│       │   ├── logo_light.png
│       │   └── placeholder-product.png
│       │
│       └── sounds/
│           ├── scan.wav
│           ├── success.wav
│           ├── error.wav
│           └── print.wav
│
├── test/
│   ├── widget_test.dart
│   │   # Example widget test - remove or replace with actual tests
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   └── auth_controller_test.dart
│   │   │       # Auth controller tests - login, logout, PIN verification
│   │   │
│   │   ├── sell/
│   │   │   └── cart_controller_test.dart
│   │   │       # Cart controller tests - add/remove items, totals calculation
│   │   │
│   │   └── payment/
│   │       └── payment_controller_test.dart
│   │           # Payment controller tests - payment initiation, status handling
│   │
│   └── utils/
│       └── money_test.dart
│           # Money utility tests - formatting, minor unit conversion
│
├── windows/
│   ├── runner/
│   │   ├── main.dart
│   │   │   # Windows entry point - window configuration, single-instance guard
│   │   │
│   │   └── win32_window.dart
│   │       # Win32 window setup - window class registration, window procedure
│   │
│   └── CMakeLists.txt
│       # Windows build configuration
│
├── pubspec.yaml
│   # Dependencies: go_router, dio, flutter_riverpod, drift, flutter_secure_storage,
│   # window_manager, intl, plus printer package (thermal_printer_flutter or windows_printer)
│
└── README.md
    # Project description, setup instructions, build commands
```

## Key Architectural Rules

1. **Platform Abstraction**: UI code never checks `Platform.isWindows`. Only `core/platform` does, behind interfaces (printer, scanner, window). This makes the Android build cheap.

2. **Money Handling**: Money in Dart is **integer minor units** (cents), never `double`. The API sends decimal strings, convert to minor units on receipt.

3. **Single Responsibility**: Each feature folder contains page, controller, repository, and related widgets. Controllers hold state, repositories handle API calls, widgets are UI-only.

4. **Error Handling**: All API calls return `Result<T, Failure>`. Controllers expose state, UI picks surface based on failure type.

5. **Offline Safety**: Sales write to local outbox before API call. Unsynced sales survive auth failure, crash, or logout. Sync happens after sign-in.
