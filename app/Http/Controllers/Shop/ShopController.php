<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Mail\OrderConfirmed;
use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\MpesaPaymentFinalizer;
use App\Services\MpesaStkService;
use App\Services\NotificationService;
use App\Services\OrderStockService;
use App\Services\PaymentMethods;
use App\Services\ShopCartService;
use App\Services\ShopCatalogService;
use App\Services\ShopGuestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ShopController extends Controller
{
    public function landing(ShopCatalogService $catalog): Response
    {
        $branch = $catalog->branch((int) session('shop_branch_id', 0) ?: null);
        $products = $catalog->products($branch)->take(6)->values();

        return Inertia::render('shop/landing', [
            'branch' => $this->branchData($branch),
            'products' => $products,
            'categories' => $products->pluck('category')->filter()->unique()->values(),
            ...$this->paymentFlags($branch),
        ]);
    }

    public function index(Request $request, ShopCatalogService $catalog): Response
    {
        $branch = $this->branch($request, $catalog);
        $products = $catalog->products($branch);
        $search = trim((string) $request->query('q', ''));
        $category = $request->query('category');

        $filtered = $products
            ->when($category, fn ($items) => $items->where('category', $category))
            ->when($search !== '', fn ($items) => $items->filter(
                fn (array $product) => str_contains(strtolower($product['name']), strtolower($search))
                    || str_contains(strtolower((string) $product['sku']), strtolower($search))
                    || str_contains(strtolower((string) ($product['barcode'] ?? '')), strtolower($search))
            ))
            ->values();

        return Inertia::render('shop/index', [
            'branch' => $this->branchData($branch),
            'products' => $filtered,
            'categories' => $products->pluck('category')->filter()->unique()->values(),
            'filters' => ['q' => $search, 'category' => $category],
            ...$this->paymentFlags($branch),
        ]);
    }

    public function show(Request $request, int $product, ShopCatalogService $catalog): Response
    {
        $branch = $this->branch($request, $catalog);
        $model = Product::query()->findOrFail($product);

        return Inertia::render('shop/show', [
            'branch' => $this->branchData($branch),
            'product' => $catalog->product($branch, $model),
            ...$this->paymentFlags($branch),
        ]);
    }

    public function cart(Request $request, ShopCartService $cart, ShopCatalogService $catalog): Response
    {
        $branch = $this->branch($request, $catalog);
        $lines = $cart->lines($branch);

        return Inertia::render('shop/cart', [
            'branch' => $this->branchData($branch),
            'lines' => $lines,
            'totals' => $this->totals($lines, $branch),
            ...$this->paymentFlags($branch),
        ]);
    }

    public function add(Request $request, ShopCartService $cart, ShopCatalogService $catalog): RedirectResponse
    {
        $validated = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $branch = $this->branch($request, $catalog);
        $cart->add((int) $validated['variant_id'], (int) ($validated['quantity'] ?? 1), $branch);

        return back()->with('success', 'Added to cart.');
    }

    public function update(Request $request, int $variant, ShopCartService $cart, ShopCatalogService $catalog): RedirectResponse
    {
        $validated = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:99']]);
        $branch = $this->branch($request, $catalog);
        $cart->update($variant, (int) $validated['quantity'], $branch);

        return back()->with('success', 'Cart updated.');
    }

    public function remove(int $variant, ShopCartService $cart): RedirectResponse
    {
        $cart->remove($variant);

        return back()->with('success', 'Removed from cart.');
    }

    public function checkout(Request $request, ShopCartService $cart, ShopCatalogService $catalog): Response|RedirectResponse
    {
        $branch = $this->branch($request, $catalog);
        $lines = $cart->lines($branch);

        if ($lines === []) {
            return redirect()->route('shop.index')->with('error', 'Your cart is empty.');
        }

        $pickups = $this->pickupWarehouses($branch);
        $selectedPickupId = (int) $request->session()->get('shop_pickup_warehouse_id', 0)
            ?: (int) ($pickups[0]['id'] ?? 0);

        return Inertia::render('shop/checkout', [
            'branch' => $this->branchData($branch),
            'lines' => $lines,
            'totals' => $this->totals($lines, $branch),
            'pickups' => $pickups,
            'selectedPickupId' => $selectedPickupId,
            ...$this->paymentFlags($branch),
        ]);
    }

    public function placeOrder(
        Request $request,
        ShopCartService $cart,
        ShopCatalogService $catalog,
        OrderStockService $stock,
        MpesaStkService $mpesa,
        ShopGuestService $guests,
    ): RedirectResponse {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:255'],
            'pickup_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'payment_method' => ['required', 'string', 'in:mpesa,paypal'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $branch = $this->branch($request, $catalog);
        $methods = app(PaymentMethods::class);

        if (! $methods->isAvailable($validated['payment_method'], $branch->region)) {
            throw ValidationException::withMessages([
                'payment_method' => $validated['payment_method'] === 'paypal'
                    ? 'PayPal is muted for now. Choose M-Pesa.'
                    : 'That payment method is not enabled for this region.',
            ]);
        }

        $guest = $guests->resolve($request);
        $guests->rememberContact($guest, $validated['email'], $validated['phone']);
        $pickup = Warehouse::query()
            ->where('branch_id', $branch->id)
            ->findOrFail((int) $validated['pickup_warehouse_id']);
        $lines = $cart->lines($branch);

        if ($lines === []) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        $totals = $this->totals($lines, $branch);

        try {
            $order = DB::transaction(function () use ($validated, $branch, $pickup, $lines, $totals, $stock, $mpesa, $guest) {
                $order = Order::create([
                    'public_token' => (string) Str::uuid(),
                    'branch_id' => $branch->id,
                    'pickup_warehouse_id' => $pickup->id,
                    'customer_id' => null,
                    'shop_guest_id' => $guest->id,
                    'customer_name' => $validated['name'],
                    'customer_email' => $validated['email'],
                    'customer_phone' => $validated['phone'],
                    'source' => 'storefront',
                    'status' => 'pending',
                    'subtotal' => $totals['subtotal'],
                    'tax' => $totals['tax'],
                    'total' => $totals['total'],
                    'currency_code' => $branch->region->currency_code,
                ]);

                foreach ($lines as $line) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_variant_id' => $line['variant_id'],
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['price'],
                        'discount' => 0,
                    ]);
                }

                $order->load('items.productVariant.product');
                $stock->deduct($order, null, $pickup);

                $payment = Payment::create([
                    'order_id' => $order->id,
                    'gateway' => $validated['payment_method'],
                    'amount' => $totals['total'],
                    'status' => 'pending',
                    'expires_at' => $validated['payment_method'] === 'mpesa'
                        ? now()->addMinutes((int) config('mpesa.pending_timeout_minutes', 5))
                        : null,
                    'raw_response' => [
                        'customer_name' => $validated['name'],
                        'phone' => $validated['phone'],
                        'email' => $validated['email'] ?? null,
                        'notes' => $validated['notes'] ?? null,
                    ],
                ]);

                if ($validated['payment_method'] === 'mpesa') {
                    $push = $mpesa->push(
                        $validated['phone'],
                        (float) $totals['total'],
                        'SHOP-'.$order->id,
                        'Shop order',
                    );

                    $payment->update([
                        'gateway_reference' => $push['CheckoutRequestID'] ?? null,
                        'raw_response' => array_merge((array) $payment->raw_response, [
                            'checkout_request_id' => $push['CheckoutRequestID'] ?? null,
                            'merchant_request_id' => $push['MerchantRequestID'] ?? null,
                        ]),
                    ]);
                }

                return $order;
            });
        } catch (\RuntimeException $exception) {
            throw ValidationException::withMessages([
                'payment_method' => $exception->getMessage(),
            ]);
        }

        app(NotificationService::class)->newOrder($order);
        $cart->clear();
        $request->session()->put('shop_pickup_warehouse_id', $pickup->id);

        return redirect()
            ->route('shop.order', $order->public_token)
            ->with('success', 'Order created. Check your phone for the M-Pesa prompt. We will email you when it is ready at the pickup point.');
    }

    public function retry(Order $order, MpesaStkService $mpesa, OrderStockService $stock, PaymentMethods $methods): RedirectResponse
    {
        $order->load(['items.productVariant.product', 'pickupWarehouse', 'payments']);

        $payment = $order->payments->first();

        if ($order->status !== 'cancelled' || $payment?->status !== 'failed') {
            throw ValidationException::withMessages([
                'payment' => 'This order is not eligible for another payment attempt.',
            ]);
        }

        if ($order->pickup_warehouse_id === null || $order->pickupWarehouse === null) {
            throw ValidationException::withMessages([
                'pickup' => 'The pickup point for this order is no longer available.',
            ]);
        }

        if (! $methods->isAvailable('mpesa', $order->branch?->region)) {
            throw ValidationException::withMessages([
                'payment' => 'M-Pesa is not available for this order.',
            ]);
        }

        if (blank($order->customer_phone)) {
            throw ValidationException::withMessages([
                'phone' => 'A phone number is required to retry payment.',
            ]);
        }

        try {
            $newOrder = DB::transaction(function () use ($order, $mpesa, $stock) {
                $newOrder = Order::create([
                    'public_token' => (string) Str::uuid(),
                    'branch_id' => $order->branch_id,
                    'pickup_warehouse_id' => $order->pickup_warehouse_id,
                    'customer_id' => $order->customer_id,
                    'shop_guest_id' => $order->shop_guest_id,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'customer_phone' => $order->customer_phone,
                    'source' => 'storefront',
                    'status' => 'pending',
                    'pickup_status' => 'pending',
                    'subtotal' => $order->subtotal,
                    'tax' => $order->tax,
                    'total' => $order->total,
                    'currency_code' => $order->currency_code,
                ]);

                foreach ($order->items as $item) {
                    OrderItem::create([
                        'order_id' => $newOrder->id,
                        'product_variant_id' => $item->product_variant_id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount' => $item->discount,
                    ]);
                }

                $newOrder->load('items.productVariant.product');
                $stock->deduct($newOrder, null, $order->pickupWarehouse);

                $newPayment = Payment::create([
                    'order_id' => $newOrder->id,
                    'gateway' => 'mpesa',
                    'amount' => $order->total,
                    'status' => 'pending',
                    'expires_at' => now()->addMinutes((int) config('mpesa.pending_timeout_minutes', 5)),
                    'raw_response' => [
                        'customer_name' => $order->customer_name,
                        'phone' => $order->customer_phone,
                        'email' => $order->customer_email,
                        'retry_of_order_id' => $order->id,
                    ],
                ]);

                $push = $mpesa->push(
                    (string) $order->customer_phone,
                    (float) $order->total,
                    'SHOP-'.$newOrder->id,
                    'Shop order',
                );

                $newPayment->update([
                    'gateway_reference' => $push['CheckoutRequestID'] ?? null,
                    'raw_response' => array_merge((array) $newPayment->raw_response, [
                        'checkout_request_id' => $push['CheckoutRequestID'] ?? null,
                        'merchant_request_id' => $push['MerchantRequestID'] ?? null,
                    ]),
                ]);

                return $newOrder;
            });
        } catch (\RuntimeException $exception) {
            throw ValidationException::withMessages([
                'payment' => $exception->getMessage(),
            ]);
        }

        return redirect()->route('shop.order', $newOrder->public_token)
            ->with('success', 'A new M-Pesa prompt was sent. Check your phone.');
    }

    public function order(Order $order): Response
    {
        $order->load(['items.productVariant.product', 'branch.region', 'pickupWarehouse', 'payments']);

        return Inertia::render('shop/order', [
            'order' => $this->orderData($order),
        ]);
    }

    public function refreshStatus(Order $order, MpesaStkService $mpesa, MpesaPaymentFinalizer $finalizer): JsonResponse
    {
        $order->load(['items.productVariant.product', 'branch.region', 'pickupWarehouse', 'payments']);
        $payment = $order->payments->first();

        if ($payment !== null && $payment->status === 'pending' && $payment->gateway === 'mpesa') {
            if (filled($payment->gateway_reference)) {
                try {
                    $result = $mpesa->queryStatus((string) $payment->gateway_reference);
                    $code = (string) ($result['ResultCode'] ?? '');
                    $payment->update(['last_checked_at' => now()]);

                    if ($code === '0') {
                        $finalizer->complete($payment, ['reconciliation' => $result]);
                    } elseif (in_array($code, ['1', '1032', '1037', '2001'], true)) {
                        $finalizer->fail(
                            $payment,
                            (string) ($result['ResultDesc'] ?? 'M-Pesa payment did not complete.'),
                            ['reconciliation' => $result],
                        );
                    }
                } catch (Throwable $exception) {
                    $payment->update(['last_checked_at' => now()]);

                    if ($payment->expires_at !== null && $payment->expires_at->isPast()) {
                        $finalizer->fail($payment, 'M-Pesa did not confirm before the payment expired.');
                    }
                }
            } elseif ($payment->expires_at !== null && $payment->expires_at->isPast()) {
                $finalizer->fail($payment, 'No M-Pesa checkout request was recorded before the expiry.');
            }
        }

        $order->refresh()->load(['items.productVariant.product', 'branch.region', 'pickupWarehouse', 'payments']);

        return response()->json([
            'message' => match ($order->status) {
                'completed' => 'Payment confirmed.',
                'cancelled' => 'Payment did not complete.',
                default => 'Payment is still pending.',
            },
            'order' => $this->orderData($order),
        ]);
    }

    public function emailReceipt(Order $order): RedirectResponse
    {
        if (blank($order->customer_email)) {
            return back()->with('error', 'No email address is attached to this order.');
        }

        try {
            $order->load(['items.productVariant.product', 'pickupWarehouse.branch', 'branch']);
            Mail::to($order->customer_email)->send(new OrderConfirmed($order));
            $order->update(['confirmation_notified_at' => now()]);

            return back()->with('success', 'Receipt sent to '.$order->customer_email.'.');
        } catch (Throwable $exception) {
            Log::warning('Manual order receipt could not be sent.', [
                'order_id' => $order->id,
                'message' => $exception->getMessage(),
            ]);

            return back()->with('error', 'The receipt could not be sent. Check the mail configuration.');
        }
    }

    public function orderStatus(Order $order): JsonResponse
    {
        $order->load(['items.productVariant.product', 'branch.region', 'pickupWarehouse', 'payments']);

        return response()->json([
            'status' => $order->status,
            'payment_status' => $order->payments->first()?->status,
            'payment_gateway' => $order->payments->first()?->gateway,
            'order' => $this->orderData($order),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('shop/contact');
    }

    public function about(): Response
    {
        return Inertia::render('shop/about');
    }

    /**
     * @return array{mpesaEnabled: bool, paypalEnabled: bool}
     */
    private function paymentFlags(Branch $branch): array
    {
        $methods = app(PaymentMethods::class);

        return [
            'mpesaEnabled' => $methods->isAvailable('mpesa', $branch->region),
            'paypalEnabled' => $methods->isAvailable('paypal', $branch->region),
        ];
    }

    private function branch(Request $request, ShopCatalogService $catalog): Branch
    {
        return $catalog->branch((int) $request->session()->get('shop_branch_id', 0) ?: null);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function pickupWarehouses(Branch $branch): array
    {
        return Warehouse::query()
            ->where('branch_id', $branch->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Warehouse $warehouse) => [
                'id' => $warehouse->id,
                'name' => $warehouse->name,
                'branch' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function branchData(Branch $branch): array
    {
        return [
            'id' => $branch->id,
            'name' => $branch->name,
            'address' => $branch->address,
            'phone' => $branch->phone,
            'currency' => $branch->region->currency_code,
            'tax_rate' => (float) $branch->region->tax_rate,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<string, float|string>
     */
    private function totals(array $lines, Branch $branch): array
    {
        $gross = round(array_sum(array_column($lines, 'line_total')), 2);
        $rate = (float) $branch->region->tax_rate;
        $tax = $rate > 0 ? round($gross * $rate / (100 + $rate), 2) : 0.0;

        return [
            'gross' => $gross,
            'subtotal' => round($gross - $tax, 2),
            'tax' => $tax,
            'total' => $gross,
            'currency' => $branch->region->currency_code,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function orderData(Order $order): array
    {
        $payment = $order->payments->first();
        $branch = $order->branch;

        return [
            'id' => $order->id,
            'number' => '#'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
            'public_token' => $order->public_token,
            'status' => $order->status,
            'pickup_status' => $order->pickup_status,
            'payment_status' => $payment?->status,
            'payment_gateway' => $payment?->gateway,
            'payment' => $payment !== null ? [
                'status' => $payment->status,
                'gateway' => $payment->gateway,
                'failure_reason' => $payment->failure_reason,
                'expires_at' => $payment->expires_at?->toIso8601String(),
                'last_checked_at' => $payment->last_checked_at?->toIso8601String(),
                'created_at' => $payment->created_at?->toIso8601String(),
            ] : null,
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total,
            'currency' => $order->currency_code,
            'created_at' => $order->created_at?->toIso8601String(),
            'pickup_ready_at' => $order->pickup_ready_at?->toIso8601String(),
            'collected_at' => $order->collected_at?->toIso8601String(),
            'customer_email' => $order->customer_email,
            'pickup' => $order->pickupWarehouse ? [
                'id' => $order->pickupWarehouse->id,
                'name' => $order->pickupWarehouse->name,
                'address' => $branch?->address,
                'phone' => $branch?->phone,
            ] : null,
            'branch' => $branch ? [
                'name' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
            ] : null,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'name' => $item->productVariant->product->name,
                'variant' => $item->productVariant->variant_name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => round((float) $item->unit_price * (int) $item->quantity, 2),
            ])->all(),
        ];
    }
}
