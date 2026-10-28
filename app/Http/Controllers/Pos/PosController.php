<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Http\Requests\Pos\StorePosSaleRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Models\TillSession;
use App\Services\MpesaStatusService;
use App\Services\PaymentMethods;
use App\Services\PosCatalogService;
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
        $catalog = app(PosCatalogService::class)->forBranch($branch);
        $products = $catalog['products'];
        $categories = $catalog['categories'];

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

        $till = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

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

    public function status(Request $request, Order $order, PosSaleService $sales, MpesaStatusService $statuses): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        abort_unless((int) $order->branch_id === (int) $branch->id, 403);

        /** @var Payment|null $payment */
        $payment = $order->payments()->latest()->first();

        if ($payment !== null && $payment->status === 'pending' && $payment->gateway === 'mpesa') {
            $payment = $statuses->refresh($payment);
        }

        return response()->json($sales->status($order->refresh(), $request->user()));
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
