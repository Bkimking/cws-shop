# Windows POS Build Guide

This document explains how to build the Flutter Windows POS application, how it connects to the Laravel API, and how it mirrors the web POS functionality.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Integration](#api-integration)
3. [Building the Windows App](#building-the-windows-app)
4. [Authentication Flow](#authentication-flow)
5. [Data Synchronization](#data-synchronization)
6. [Printing Integration](#printing-integration)
7. [Offline Mode](#offline-mode)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## Architecture Overview

### Web POS vs Windows POS

The Windows POS app is a **terminal-only** version of the web POS. It includes:

**Web POS (full):**
- Back-office (admin dashboard)
- Terminal (cashier interface)
- All roles (Admin, Branch Admin, Cashier)

**Windows POS (terminal only):**
- Terminal interface only (cashier + Branch Admin selling)
- Admin roles use web dashboard
- Same UI/UX as web terminal
- Native Windows performance
- Offline selling capability

### Shared Backend Logic

Both web and Windows POS share the same Laravel backend. The key is **reusing controller logic**:

1. **Current state (Inertia-only):**
   - Controllers return Inertia pages
   - Session cookies handle auth
   - Web POS works perfectly

2. **Required for Windows POS:**
   - Create `/api/v1` JSON endpoints
   - Extract controller logic into Action/Service classes
   - Both web controllers and API call the same services
   - Sanctum device tokens for API auth

### Example: Refactoring Pattern

**Before (Inertia-only):**
```php
// PosController.php
public function index(Request $request): Response
{
    $branch = $this->terminalBranch($request);
    $products = Product::query()->where('is_active', true)->get();
    // ... more logic

    return Inertia::render('pos/index', [
        'products' => $products,
        // ...
    ]);
}
```

**After (Shared Logic):**
```php
// App/Actions/Pos/LoadTerminalData.php
class LoadTerminalData
{
    public function execute(User $user, Branch $branch): array
    {
        $till = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        $products = Product::query()
            ->where('is_active', true)
            ->with(['category', 'variants'])
            ->get()
            ->map(fn ($product) => /* transformation */);

        $categories = Category::query()
            ->whereIn('id', $products->pluck('category_id'))
            ->get();

        return [
            'till' => $till,
            'products' => $products,
            'categories' => $categories,
        ];
    }
}

// PosController.php (web)
public function index(Request $request): Response
{
    $branch = $this->terminalBranch($request);
    $data = app(LoadTerminalData::class)->execute($request->user(), $branch);

    return Inertia::render('pos/index', $data);
}

// Api/V1/PosController.php (API)
public function index(Request $request): JsonResponse
{
    $branch = $this->terminalBranchFromToken($request); // From Sanctum token
    $data = app(LoadTerminalData::class)->execute($request->user(), $branch);

    return response()->json($data);
}
```

---

## API Integration

### Required API Endpoints

The Windows POS needs `/api/v1` endpoints with Sanctum authentication:

| Group | Endpoints | Method | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth/login` | POST | Email/password login, returns token |
| | `/api/v1/auth/two-factor` | POST | 2FA code verification |
| | `/api/v1/auth/logout` | POST | Invalidate token |
| | `/api/v1/auth/me` | GET | User, permissions, branch, region, currency, till state |
| **Catalog** | `/api/v1/catalog/categories` | GET | Categories list |
| | `/api/v1/catalog/products` | GET | Products with variants, prices, stock |
| | `/api/v1/catalog/updated-since` | GET | Delta updates since timestamp |
| **Till** | `/api/v1/till/current` | GET | Current till session summary |
| | `/api/v1/till/open` | POST | Open till with opening cash |
| | `/api/v1/till/close` | POST | Close till with closing cash |
| | `/api/v1/till/x-report` | GET | X report data |
| **Orders** | `/api/v1/orders` | POST | Create new order |
| | `/api/v1/orders/today` | GET | Today's orders for branch |
| | `/api/v1/orders/{id}` | GET | Order details |
| | `/api/v1/orders/{id}/refund` | POST | Refund order |
| **Payments** | `/api/v1/payments/initiate` | POST | Initiate payment (M-Pesa, Airtel, card) |
| | `/api/v1/payments/{id}/status` | GET | Check payment status |
| | `/api/v1/payments/{id}/cancel` | POST | Cancel pending payment |
| **Sync** | `/api/v1/sync/upload` | POST | Batch upload offline sales |
| **Misc** | `/api/v1/settings` | GET | Receipt footer, tax label, discount limit |
| | `/api/v1/customers` | GET/POST | Customer search/create |
| | `/api/v1/health` | GET | Health check |
| | `/api/v1/min-version` | GET | Minimum app version |

### API Response Format

All API responses follow this JSON shape:

```json
{
  "message": "Success message",
  "data": { /* response data */ },
  "errors": {
    "field": ["Validation error"]
  },
  "retry_after": 60
}
```

**Business error codes:**
- `account_inactive` - Account, branch, or region turned off
- `till_closed` - Till must be open to sell
- `out_of_stock` - Product variant sold out
- `payment_declined` - Payment gateway declined
- `permission_denied` - User lacks required permission

### Dio Client Configuration

```dart
// core/network/api_client.dart
final dio = Dio(BaseOptions(
  baseUrl: env.baseUrl,
  connectTimeout: const Duration(seconds: 5),
  receiveTimeout: const Duration(seconds: 15),
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
));

// Add Bearer token from secure storage
dio.interceptors.add(AuthInterceptor());

// Add idempotency key for sales
dio.interceptors.add(IdempotencyInterceptor());

// Map errors to Failure types
dio.interceptors.add(ErrorMapperInterceptor());

// Retry GET requests
dio.interceptors.add(RetryInterceptor());
```

---

## Building the Windows App

### Prerequisites

1. **Flutter SDK** (3.13.2 or higher)
2. **Visual Studio 2022** with C++ desktop development workload
3. **Windows 10/11** for development and testing

### Setup

```bash
# Navigate to pos directory
cd pos

# Install dependencies
flutter pub get

# Verify Windows build tools
flutter doctor

# Run in development
flutter run -d windows

# Build release
flutter build windows --release
```

### Window Configuration

The app uses `window_manager` for window control:

```dart
// app/bootstrap.dart
await windowManager.ensureInitialized();

WindowOptions windowOptions = const WindowOptions(
  size: Size(1280, 800),
  minimumSize: Size(1024, 680),
  center: true,
  backgroundColor: Colors.transparent,
  skipTaskbar: false,
  titleBarStyle: TitleBarStyle.normal,
);

await windowManager.waitUntilReady(windowOptions, () async {
  await windowManager.show();
  await windowManager.focus();
  await windowManager.setMaximizable(true);
  await windowManager.setResizable(true);
});
```

### Single Instance Guard

Prevent multiple POS windows:

```dart
// windows/runner/main.dart
import 'package:window_manager/window_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Check if already running
  final windowManager = WindowManager();
  if (await windowManager.isFocused()) {
    // Already running, focus existing window
    exit(0);
  }

  // Initialize app
  runApp(const MyApp());
}
```

---

## Authentication Flow

### Login Flow

```
Splash Screen (3-5s)
    ↓
No token? → Login Page
    ↓
Email/Password → POST /api/v1/auth/login
    ↓
Token returned → Save to secure storage
    ↓
2FA required? → 2FA Page → POST /api/v1/auth/two-factor
    ↓
GET /api/v1/auth/me → Load user, permissions, branch, region
    ↓
Check permission 'use pos terminal' → Deny if missing
    ↓
Till open? → No → Open Till Dialog → Sell Page
              Yes → Sell Page
```

### Idle Lock

- Idle for 5 minutes → Lock screen (PIN entry)
- 3 wrong PINs → Sign out, clear token
- PIN unlock success → Return to sell page

### Token Storage

```dart
// core/storage/secure_storage.dart
class SecureStorage {
  final _storage = FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: 'auth_token');
  }
}
```

### Scope from Token

**Never trust branch/region from client.** The Sanctum token includes:

```php
// Laravel backend
$token = $user->createToken('pos-device', ['use pos terminal']);
$token->token->branch_id = $user->branch_id;
$token->token->region_id = $user->region_id;
$token->token->save();
```

Flutter always calls endpoints with Bearer token, server scopes by branch/region from token.

---

## Data Synchronization

### Catalog Caching

Products and categories are cached in SQLite (Drift):

```dart
// core/storage/local_db/tables.dart
@DataClassName('Product')
class Products extends Table {
  IntColumn get id => integer()();
  TextColumn get name => text()();
  TextColumn get sku => text()();
  IntColumn get categoryId => integer().references(Categories, #id)();
  DateTimeColumn get updatedAt => dateTime()();
}
```

**Delta updates:**
```dart
// GET /api/v1/catalog/updated-since?timestamp=2024-01-01T00:00:00Z
// Returns only products/variants changed since timestamp
```

### Offline Sales (Outbox)

Sales are saved locally before API call:

```dart
// core/sync/outbox.dart
class Outbox extends Table {
  TextColumn get id => text().withLength(min: 36)(); // UUID
  TextColumn get idempotencyKey => text().withLength(min: 36)();
  TextColumn get payload => text()(); // JSON sale data
  TextColumn get status => text()(); // pending, synced, failed
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get syncedAt => dateTime().nullable()();
}
```

**Sync flow:**
1. User completes sale → Write to outbox → Attempt API call
2. Online → Sync immediately, mark as synced
3. Offline → Mark as pending, show "Unsynced sales" banner
4. Back online → Batch upload pending sales
5. Conflict → Server is authority, go to manager review list

### Sync Service

```dart
// core/sync/sync_service.dart
class SyncService {
  Future<void> syncPendingSales() async {
    final pending = await db.outbox
        .filter((outbox) => outbox.status.equals('pending'))
        .get();

    for (final sale in pending) {
      try {
        await apiClient.post('/api/v1/sync/upload', data: sale.payload);
        await db.updateOutbox(sale.id, status: 'synced');
      } catch (e) {
        await db.updateOutbox(sale.id, status: 'failed');
      }
    }
  }
}
```

---

## Printing Integration

### Printer Interface

Abstract printer service for platform independence:

```dart
// core/platform/printer/printer_service.dart
abstract class PrinterService {
  Future<List<Printer>> getAvailablePrinters();
  Future<bool> printReceipt(Receipt receipt);
  Future<bool> checkPrinterStatus(String printerId);
}
```

### Windows Implementation

Using `thermal_printer_flutter` (or `windows_printer`):

```dart
// core/platform/printer/windows_printer_service.dart
class WindowsPrinterService implements PrinterService {
  @override
  Future<List<Printer>> getAvailablePrinters() async {
    // Use thermal_printer_flutter to list USB/Bluetooth printers
  }

  @override
  Future<bool> printReceipt(Receipt receipt) async {
    // Generate ESC/POS commands
    final commands = generateEscPosCommands(receipt);

    // Send to printer
    await printer.connect(printerId);
    await printer.sendCommands(commands);
    await printer.disconnect();

    return true;
  }
}
```

### ESC/POS Receipt Generation

```dart
// features/receipt/print_receipt.dart
List<int> generateEscPosCommands(Receipt receipt) {
  final generator = Generator(
    receipt.width,
    CapabilityProfile.get('POS-5890'),
  );

  generator.text(receipt.header, styles: PosStyles.align(PosAlign.center));
  generator.hr();
  for (final line in receipt.lines) {
    generator.text(line.product);
    generator.text('${line.qty} x ${line.price} = ${line.total}');
  }
  generator.hr();
  generator.text('TOTAL: ${receipt.total}', styles: PosStyles.bold());
  generator.feed(2);
  generator.cut();

  return generator.bytes;
}
```

---

## Offline Mode

### Offline Selling

When offline:
1. Catalog loaded from SQLite cache
2. Sales written to outbox (pending)
3. Cash payments only (no M-Pesa/Airtel)
4. "Offline" badge in terminal bar
5. Sync happens when back online

### Online Detection

```dart
// core/platform/connectivity_service.dart
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();

  Stream<bool> get onConnectivityChanged async* {
    await for (final result in _connectivity.onConnectivityChanged) {
      yield result != ConnectivityResult.none;
    }
  }
}
```

### Sync Priority

1. On sign-in → Sync all pending sales
2. After each sale → Sync immediately if online
3. Background sync → Every 30 seconds if pending sales exist
4. Manual sync → User-triggered from settings

---

## Testing

### Unit Tests

Test business logic without UI:

```dart
// test/features/sell/cart_controller_test.dart
test('add variant to cart increments quantity if exists', () {
  final controller = CartController();
  controller.addVariant(product, variant);

  controller.addVariant(product, variant);

  expect(controller.cart.first.quantity, 2);
});
```

### Widget Tests

Test UI components:

```dart
// test/features/sell/product_tile_test.dart
testWidgets('product tile shows price and stock', (tester) async {
  await tester.pumpWidget(ProductTile(product: testProduct));

  expect(find.text('KES 150.00'), findsOneWidget);
  expect(find.text('5 in stock'), findsOneWidget);
});
```

### Integration Tests

Test full flows:

```dart
// test/integration/sale_flow_test.dart
testWidgets('complete sale flow', (tester) async {
  // 1. Login
  // 2. Open till
  // 3. Add product to cart
  // 4. Charge with cash
  // 5. Verify success screen
});
```

### Run Tests

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/features/sell/cart_controller_test.dart

# Run with coverage
flutter test --coverage
```

---

## Deployment

### Build for Distribution

```bash
# Release build
flutter build windows --release

# Output: build/windows/runner/Release/
```

### Installer Creation

**Option 1: MSIX (Microsoft Store style)**

```yaml
# pubspec.yaml
msix_config:
  display_name: Kenya POS
  publisher_display_name: Your Company
  identity_name: com.yourcompany.kenyapos
  msix_version: 1.0.0.0
  description: Point of Sale system for retail
  publisher: CN=Your Company
  capabilities: 'internetClient, usb, bluetooth'
```

```bash
# Build MSIX
flutter pub run msix:create
```

**Option 2: Inno Setup (traditional installer)**

1. Download Inno Setup
2. Create installer script:

```iss
[Setup]
AppName=Kenya POS
AppVersion=1.0.0
DefaultDirName={commonpf}\KenyaPOS
OutputBaseFilename=KenyaPOS-Setup

[Files]
Source: "build\windows\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commondesktop}\Kenya POS"; Filename: "{app}\kenyapos.exe"
```

3. Compile with Inno Setup Compiler

### Code Signing

To avoid Windows SmartScreen warnings:

```bash
# Sign with certificate
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com build/windows/runner/Release/kenyapos.exe
```

### Auto-Update

Implement in-app updater:

```dart
// features/settings/auto_update.dart
class AutoUpdateService {
  Future<void> checkForUpdates() async {
    final response = await apiClient.get('/api/v1/min-version');
    final minVersion = response.data['min_version'];

    if (currentVersion < minVersion) {
      // Show update required dialog
      // Download and install new version
    }
  }
}
```

---

## Development Workflow

### 1. API First

1. Create Laravel Action/Service classes
2. Add API endpoints in `routes/api.php`
3. Test with Postman/Insomnia
4. Implement Flutter repository

### 2. Feature Development

1. Create feature folder under `lib/features/`
2. Implement repository (API calls)
3. Implement controller (state management)
4. Implement widgets (UI)
5. Add tests
6. Run `flutter analyze` and `flutter test`

### 3. Verification

```bash
# Lint
flutter analyze

# Format
dart format .

# Test
flutter test

# Build check
flutter build windows --debug
```

---

## Troubleshooting

### Build Errors

**Visual Studio missing C++ workload:**
- Install Visual Studio 2022
- Check "Desktop development with C++" workload

**Window size issues:**
- Check `window_manager` configuration in `app/bootstrap.dart`
- Verify minimum size constraints

### API Connection Issues

**CORS errors:**
- Add CORS middleware to Laravel for API routes
- Configure allowed origins in `config/cors.php`

**401 Unauthorized:**
- Check token storage in secure storage
- Verify Sanctum token is valid on server
- Check token expiration logic

### Printing Issues

**Printer not found:**
- Verify printer is USB-connected
- Check printer driver installation
- Test with `thermal_printer_flutter` example app

**Receipt formatting:**
- Adjust ESC/POS commands for paper width (58mm vs 80mm)
- Test with printer-specific commands

### Offline Sync Issues

**Sales not syncing:**
- Check outbox table in SQLite
- Verify API endpoint `/api/v1/sync/upload` exists
- Check network connectivity

**Stock conflicts:**
- Review manager review list on server
- Resolve conflicts manually or via admin panel

---

## Resources

- [Flutter Windows documentation](https://flutter.dev/docs/development/platform-integration/windows)
- [Dio HTTP client](https://pub.dev/packages/dio)
- [Drift SQLite database](https://drift.simonbinder.eu/)
- [Flutter Secure Storage](https://pub.dev/packages/flutter_secure_storage)
- [Window Manager](https://pub.dev/packages/window_manager)
- [Thermal Printer Flutter](https://pub.dev/packages/thermal_printer_flutter)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)
- [ESC/POS commands](https://github.com/gabrielbull/escpos)

---

## Next Steps

1. **API Development**: Create `/api/v1` endpoints in Laravel
2. **Shared Logic**: Extract controller logic into Action/Service classes
3. **Flutter Skeleton**: Set up project structure, add dependencies
4. **Theme**: Implement design system (colors, fonts, motion)
5. **Auth**: Implement login, 2FA, token management
6. **Catalog**: Implement product/category loading and caching
7. **Till**: Implement open/close till flows
8. **Sell**: Implement main sell screen with cart
9. **Payment**: Implement payment sheets and gateway integration
10. **Printing**: Implement ESC/POS receipt printing
11. **Offline**: Implement outbox and sync
12. **Testing**: Add comprehensive test coverage
13. **Deployment**: Create installer and code signing
