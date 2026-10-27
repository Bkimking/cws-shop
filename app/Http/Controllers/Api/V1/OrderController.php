<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Http\Requests\Pos\StorePosSaleRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Services\MpesaPaymentFinalizer;
use App\Services\PaymentMethods;
use App\Services\PosSaleService;
use App\Services\TillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ResolvesTerminalBranch;

    public function store(
        StorePosSaleRequest $request,
        PosSaleService $sales,
        TillService $tills,
    ): JsonResponse {
        $branch = $this->terminalBranch($request);
        $till = $tills->current($branch);

        if ($till === null) {
            return response()->json([
                'message' => 'Till is closed. Open the till to sell.',
                'code' => 'till_closed',
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
                'code' => 'payment_unavailable',
            ], 422);
        }

        $result = $sales->createSale($branch, $till, $request->user(), $payload);

        return response()->json([
            'message' => 'Sale created.',
            'data' => $result,
        ], 201);
    }

    public function today(Request $request): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        $orders = Order::query()
            ->where('branch_id', $branch->id)
            ->whereDate('created_at', today())
            ->withCount('items')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'number' => str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
                'total' => (float) $order->total,
                'status' => $order->status,
                'items_count' => $order->items_count,
                'created_at' => $order->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'message' => 'Today\'s orders loaded.',
            'data' => ['orders' => $orders],
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $branch = $this->terminalBranch($request);
        abort_unless((int) $order->branch_id === (int) $branch->id, 403);

        $order->load(['items.productVariant.product', 'payments']);

        return response()->json([
            'message' => 'Order loaded.',
            'data' => ['order' => $this->orderData($order)],
        ]);
    }

    public function paymentStatus(Request $request, Payment $payment): JsonResponse
    {
        $branch = $this->terminalBranch($request);
        abort_unless((int) $payment->order->branch_id === (int) $branch->id, 403);

        return response()->json([
            'message' => 'Payment status loaded.',
            'data' => ['payment' => $this->paymentData($payment->load('order'))],
        ]);
    }

    public function cancelPayment(
        Request $request,
        Payment $payment,
        MpesaPaymentFinalizer $finalizer,
    ): JsonResponse {
        $branch = $this->terminalBranch($request);
        abort_unless((int) $payment->order->branch_id === (int) $branch->id, 403);

        if ($payment->status !== 'pending') {
            return response()->json(['message' => 'Only pending payments can be cancelled.'], 422);
        }

        $finalizer->fail($payment, 'Cancelled from the POS terminal.');

        return response()->json([
            'message' => 'Payment cancelled and stock released.',
            'data' => ['payment' => $this->paymentData($payment->fresh()->load('order'))],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function orderData(Order $order): array
    {
        return [
            'id' => $order->id,
            'number' => str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
            'status' => $order->status,
            'total' => (float) $order->total,
            'currency' => $order->currency_code,
            'created_at' => $order->created_at?->toIso8601String(),
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->productVariant->product->name,
                'variant' => $item->productVariant->variant_name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
            ])->all(),
            'payments' => $order->payments->map(fn (Payment $payment) => $this->paymentData($payment))->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentData(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'gateway' => $payment->gateway,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'failure_reason' => $payment->failure_reason,
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'last_checked_at' => $payment->last_checked_at?->toIso8601String(),
        ];
    }
}
