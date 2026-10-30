# CWSPOS Windows POS (Flutter)

This is the Windows POS client for CWSPOS. It talks to the Laravel `/api/v1` API using a Sanctum bearer token.

## Status

Foundation / first vertical slice:

- secure API token storage
- login and session restore
- terminal bootstrap
- product catalog, categories and search
- cart
- till open
- cash sale
- product images
- dark terminal UI

M-Pesa on the Windows client, offline outbox/sync, receipt printing and full payment sheets are the next phases.

## Run

Start the Laravel API and Vite app, then:

```bash
flutter pub get
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

The API must be reachable from the Windows machine. Use a deployed HTTPS URL for production.

## API contract

See [Windows POS build guide](docs/WINDOWS_POS_BUILD_GUIDE.md) and the Laravel routes:

```bash
php artisan route:list --path=api/v1
```

## Current API endpoints used

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/bootstrap
GET  /api/v1/catalog/products
POST /api/v1/till/open
POST /api/v1/orders
```

## Mobile barcode and printer support

Android/iOS can use the camera barcode button in the POS search field. Windows keeps the hardware/keyboard scanner path.

Receipt printer modes (printer icon in the terminal top bar):

- **System print** — Windows/Android print dialog
- **Network ESC/POS** — printer IP + port (normally `9100`)
- **Bluetooth ESC/POS** — paired printer, using `print_bluetooth_thermal`

Android permissions include camera, Bluetooth connect/scan, and legacy Bluetooth/location access. Pair the printer in Android/Windows Bluetooth settings before selecting it in the app.
