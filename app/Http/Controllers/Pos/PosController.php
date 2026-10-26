<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Http\Requests\Pos\StorePosSaleRequest;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductRegionPrice;
use App\Models\StockLevel;
use App\Models\TillSession;
use App\Models\Warehouse;
use App\Services\PaymentMethods;
use App\Services\PosSaleService;
use App\Services\TillReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    use ResolvesTerminalBranch;

    public function index(Request $request, TillReportService $reports): Response
    {
        $branch = $this->terminalBranch($request);
        $region = $branch->region;
        $warehouseIds = Warehouse::query()->where('branch_id', $branch->id)->pluck('id');

        $till = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        $stockByVariant = StockLevel::query()
            ->whereIn('warehouse_id', $warehouseIds)
            ->selectRaw('product_variant_id, SUM(quantity_on_hand) as quantity')
            ->groupBy('product_variant_id')
            ->pluck('quantity', 'product_variant_id');

        $regionPrices = ProductRegionPrice::query()
            ->where('region_id', $region->id)
            ->pluck('price_override', 'product_id');

        $products = Product::query()
            ->where('is_active', true)
            ->whereHas('variants')
            ->with([
                'category:id,name',
                'images:id,product_id,path,is_primary,sort_order',
                'variants' => fn ($query) => $query
                    ->orderBy('variant_name')
                    ->select(['id', 'product_id', 'variant_name', 'sku_suffix', 'price_delta']),
            ])
            ->orderBy('name')
            ->get()
            ->map(function (Product $product) use ($stockByVariant, $regionPrices) {
                $override = $regionPrices->get($product->id);

                $variants = $product->variants->map(function ($variant) use ($product, $override, $stockByVariant) {
                    $basePrice = $override !== null
                        ? (float) $override
                        : (float) $product->base_price;
                    $price = $basePrice + (float) $variant->price_delta;

                    return [
                        'id' => $variant->id,
                        'name' => $variant->variant_name,
                        'sku' => trim($product->sku.($variant->sku_suffix ?? '')),
                        'price' => round($price, 2),
                        'stock' => (int) ($stockByVariant->get($variant->id) ?? 0),
                    ];
                })->values();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'category_id' => $product->category_id,
                    'category' => $product->category->name,
                    'price' => (float) ($variants->min('price') ?? 0),
                    'stock' => (int) $variants->sum('stock'),
                    'image_url' => $product->images->firstWhere('is_primary', true)?->url
                        ?? $product->images->first()?->url,
                    'variants' => $variants,
                ];
            })
            ->filter(fn (array $product) => count($product['variants']) > 0)
            ->values();

        $categories = Category::query()
            ->whereIn('id', $products->pluck('category_id')->filter()->unique())
            ->orderBy('name')
            ->get(['id', 'name']);

        $dayStart = now($region->timezone)->startOfDay()->utc();
        $dayEnd = now($region->timezone)->endOfDay()->utc();

        $todayOrders = Order::query()
            ->where('branch_id', $branch->id)
            ->whereBetween('created_at', [$dayStart, $dayEnd])
            ->withCount('items')
            ->latest()
            ->take(30)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'number' => str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
                'total' => (float) $order->total,
                'items_count' => $order->items_count,
                'status' => $order->status,
                'time' => $order->created_at?->timezone($region->timezone)->format('H:i'),
                'created_at' => $order->created_at?->toIso8601String(),
            ]);

        return Inertia::render('pos/index', [
            'context' => [
                'branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'address' => $branch->address,
                    'phone' => $branch->phone,
                ],
                'region' => [
                    'id' => $region->id,
                    'name' => $region->name,
                    'currency_code' => $region->currency_code,
                    'tax_rate' => (float) $region->tax_rate,
                    'timezone' => $region->timezone,
                ],
                'tax_label' => 'VAT',
                'mpesa_enabled' => app(PaymentMethods::class)->isAvailable('mpesa', $region),
            ],
            'cashier' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
            ],
            'till' => $till ? $reports->summary($till) : null,
            'products' => $products,
            'categories' => $categories,
            'ordersToday' => $todayOrders,
            'can' => [
                'access_admin' => $request->user()->can('access admin panel'),
                'apply_discounts' => $request->user()->can('apply discounts'),
            ],
        ]);
    }

    public function status(Request $request, Order $order, PosSaleService $sales): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        abort_unless((int) $order->branch_id === (int) $branch->id, 403);

        return response()->json($sales->status($order, $request->user()));
    }

    public function store(StorePosSaleRequest $request, PosSaleService $sales): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        $till = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        if (! $till) {
            return response()->json([
                'message' => 'Till is closed. Open the till to sell.',
            ], 422);
        }

        /** @var array{items: array<int, array{product_variant_id: int|string, quantity: int|string}>, tendered?: float|string, payment_method?: string, phone?: string, customer_id?: int|null} $payload */
        $payload = $request->validated();
        $paymentMethod = (string) ($payload['payment_method'] ?? 'cash');

        if (! app(PaymentMethods::class)->isAvailable($paymentMethod, $branch->region)) {
            return response()->json([
                'message' => $paymentMethod === 'mpesa'
                    ? 'M-Pesa is disabled for this region or not configured.'
                    : 'That payment method is not available.',
            ], 422);
        }

        $result = $sales->createSale(
            $branch,
            $till,
            $request->user(),
            $payload
        );

        return response()->json($result, 201);
    }
}
