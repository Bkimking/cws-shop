<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductRegionPrice;
use App\Models\ProductVariant;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\TillSession;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PosSaleService
{
    public function __construct(private readonly MpesaStkService $mpesa) {}

    /**
     * Complete a cash sale: re-price on the server, lock and decrement stock,
     * write the order, items, movements and cash payment in one transaction.
     *
     * @param  array{items: array<int, array{product_variant_id: int|string, quantity: int|string}>, tendered?: float|string, payment_method?: string, phone?: string, customer_id?: int|null}  $payload
     * @return array<string, mixed>
     */
    public function createSale(Branch $branch, TillSession $till, User $cashier, array $payload): array
    {
        $result = DB::transaction(function () use ($branch, $till, $cashier, $payload) {
            $till = TillSession::query()
                ->whereKey($till->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($till->status !== 'OPEN') {
                throw ValidationException::withMessages([
                    'till' => 'Till is closed. Open the till to sell.',
                ]);
            }

            $warehouseIds = Warehouse::query()
                ->where('branch_id', $branch->id)
                ->pluck('id');

            if ($warehouseIds->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => 'No warehouse is set up for this branch yet.',
                ]);
            }

            $region = $branch->region;

            $quantityByVariant = collect($payload['items'])
                ->groupBy(fn (array $row) => (int) $row['product_variant_id'])
                ->map(fn ($rows) => (int) $rows->sum('quantity'));

            $variants = ProductVariant::query()
                ->with('product')
                ->whereIn('id', $quantityByVariant->keys())
                ->get()
                ->keyBy('id');

            $regionPrices = ProductRegionPrice::query()
                ->where('region_id', $region->id)
                ->whereIn('product_id', $variants->pluck('product_id')->unique())
                ->pluck('price_override', 'product_id');

            $lines = [];
            $gross = 0.0;

            foreach ($quantityByVariant as $variantId => $quantity) {
                $variant = $variants->first(
                    fn (ProductVariant $candidate) => $candidate->id === $variantId
                );

                if ($variant === null || ! $variant->product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => 'One of the products is no longer available.',
                    ]);
                }

                $override = $regionPrices->get($variant->product_id);
                $basePrice = $override !== null
                    ? (float) $override
                    : (float) $variant->product->base_price;
                $unitPrice = $basePrice + (float) $variant->price_delta;

                $unitPrice = round($unitPrice, 2);
                $lineTotal = round($unitPrice * $quantity, 2);
                $gross += $lineTotal;

                $lines[] = [
                    'variant' => $variant,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];
            }

            $gross = round($gross, 2);
            $paymentMethod = (string) ($payload['payment_method'] ?? 'cash');

            if (! in_array($paymentMethod, ['cash', 'mpesa'], true)) {
                throw ValidationException::withMessages([
                    'payment_method' => 'Choose cash or M-Pesa.',
                ]);
            }

            $phone = trim((string) ($payload['phone'] ?? ''));

            if ($paymentMethod === 'mpesa' && $phone === '') {
                throw ValidationException::withMessages([
                    'phone' => 'Enter the customer’s M-Pesa phone number.',
                ]);
            }

            $tendered = $paymentMethod === 'cash'
                ? round((float) ($payload['tendered'] ?? 0), 2)
                : $gross;
            $change = $paymentMethod === 'cash' ? round($tendered - $gross, 2) : 0.0;

            if ($paymentMethod === 'cash' && $tendered + 0.001 < $gross) {
                throw ValidationException::withMessages([
                    'tendered' => 'Cash tendered is less than the total due.',
                ]);
            }

            $taxRate = (float) $region->tax_rate;
            $tax = $taxRate > 0
                ? round($gross * $taxRate / (100 + $taxRate), 2)
                : 0.0;
            $subtotal = round($gross - $tax, 2);

            $stockRows = StockLevel::query()
                ->whereIn('warehouse_id', $warehouseIds)
                ->whereIn('product_variant_id', $quantityByVariant->keys())
                ->orderByDesc('quantity_on_hand')
                ->lockForUpdate()
                ->get()
                ->groupBy('product_variant_id');

            foreach ($quantityByVariant as $variantId => $quantity) {
                $available = (int) $stockRows->get($variantId, collect())->sum('quantity_on_hand');

                if ($available < $quantity) {
                    $variant = $variants->first(
                        fn (ProductVariant $candidate) => $candidate->id === $variantId
                    );
                    $name = $variant?->product->name ?? 'This item';

                    throw ValidationException::withMessages([
                        'items' => "Not enough stock for {$name}.",
                    ]);
                }
            }

            $order = Order::create([
                'branch_id' => $branch->id,
                'customer_id' => $payload['customer_id'] ?? null,
                'till_session_id' => $till->id,
                'source' => 'pos',
                'status' => $paymentMethod === 'cash' ? 'completed' : 'pending',
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $gross,
                'currency_code' => $region->currency_code,
            ]);

            foreach ($lines as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_variant_id' => $line['variant']->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'discount' => 0,
                ]);
            }

            foreach ($quantityByVariant as $variantId => $quantity) {
                $remaining = $quantity;

                foreach ($stockRows->get($variantId, collect()) as $stockRow) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $take = min($remaining, (int) $stockRow->quantity_on_hand);

                    if ($take <= 0) {
                        continue;
                    }

                    $stockRow->decrement('quantity_on_hand', $take);

                    StockMovement::create([
                        'warehouse_id' => $stockRow->warehouse_id,
                        'product_variant_id' => $variantId,
                        'quantity' => -$take,
                        'type' => 'SALE',
                        'reference_id' => (string) $order->id,
                        'created_by' => $cashier->id,
                        'notes' => "POS sale #{$order->id}",
                    ]);

                    $remaining -= $take;
                }
            }

            $payment = Payment::create([
                'order_id' => $order->id,
                'gateway' => $paymentMethod,
                'amount' => $gross,
                'status' => $paymentMethod === 'cash' ? 'completed' : 'pending',
                'expires_at' => $paymentMethod === 'mpesa'
                    ? now()->addMinutes((int) config('mpesa.pending_timeout_minutes', 5))
                    : null,
                'raw_response' => $paymentMethod === 'cash'
                    ? ['tendered' => $tendered, 'change' => $change]
                    : ['phone' => $phone],
            ]);

            $checkoutId = null;

            if ($paymentMethod === 'mpesa') {
                try {
                    $push = $this->mpesa->push($phone, $gross, 'POS-'.$order->id, 'POS sale');
                } catch (\RuntimeException $exception) {
                    throw ValidationException::withMessages([
                        'phone' => $exception->getMessage(),
                    ]);
                }

                $checkoutId = $push['CheckoutRequestID'] ?? null;

                $payment->update([
                    'gateway_reference' => $checkoutId,
                    'raw_response' => array_merge((array) $payment->raw_response, [
                        'checkout_request_id' => $checkoutId,
                        'merchant_request_id' => $push['MerchantRequestID'] ?? null,
                    ]),
                ]);
            }

            $order->load(['items.productVariant.product', 'payments', 'branch.region', 'customer']);

            $stock = StockLevel::query()
                ->whereIn('warehouse_id', $warehouseIds)
                ->whereIn('product_variant_id', $quantityByVariant->keys())
                ->selectRaw('product_variant_id, SUM(quantity_on_hand) as quantity')
                ->groupBy('product_variant_id')
                ->pluck('quantity', 'product_variant_id');

            return [
                'order' => $this->transformOrder($order, $cashier, $tendered, $change, $paymentMethod, $checkoutId),
                'stock' => $stock->map(fn ($quantity) => (int) $quantity)->all(),
                'payment_status' => $payment->status,
                'payment_method' => $paymentMethod,
                'checkout_request_id' => $checkoutId,
            ];
        });

        /** @var Order|null $order */
        $order = Order::query()->find($result['order']['id']);

        if ($order !== null) {
            app(NotificationService::class)->newOrder($order);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function status(Order $order, User $cashier): array
    {
        $order->load(['items.productVariant.product', 'payments', 'branch.region', 'customer']);
        $payment = $order->payments->first();

        return [
            'status' => $order->status,
            'payment_status' => $payment?->status,
            'payment_method' => $payment?->gateway,
            'checkout_request_id' => $payment?->gateway_reference,
            'order' => $this->transformOrder(
                $order,
                $cashier,
                0,
                0,
                $payment !== null ? $payment->gateway : 'cash',
                $payment?->gateway_reference,
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformOrder(Order $order, User $cashier, float $tendered, float $change, string $paymentMethod = 'cash', ?string $checkoutId = null): array
    {
        $branch = $order->branch;

        /** @var Region|null $region */
        $region = $branch?->region;

        $timezone = $region !== null ? $region->timezone : config('app.timezone');

        return [
            'id' => $order->id,
            'number' => str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
            'created_at' => $order->created_at?->toIso8601String(),
            'created_at_label' => $order->created_at?->timezone($timezone)->format('d M Y · H:i'),
            'currency' => $order->currency_code,
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'tax_rate' => $region !== null ? (float) $region->tax_rate : 0.0,
            'total' => (float) $order->total,
            'branch' => [
                'name' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
            ],
            'cashier' => $cashier->name,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'name' => $item->productVariant->product->name,
                'variant' => $item->productVariant->variant_name,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount' => (float) $item->discount,
                'line_total' => round(
                    (float) $item->unit_price * $item->quantity - (float) $item->discount,
                    2
                ),
            ])->all(),
            'payment' => [
                'id' => $order->payments->first()?->id,
                'gateway' => $paymentMethod,
                'amount' => (float) $order->total,
                'status' => $order->payments->first()?->status,
                'tendered' => $paymentMethod === 'cash' ? $tendered : null,
                'change' => $paymentMethod === 'cash' ? $change : null,
                'checkout_request_id' => $checkoutId,
            ],
            'payment_status' => $order->payments->first()?->status,
            'payment_method' => $paymentMethod,
        ];
    }
}
