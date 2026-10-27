<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Models\Order;
use App\Services\PaymentMethods;
use App\Services\PosCatalogService;
use App\Support\ApiUserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MiscController extends Controller
{
    use ResolvesTerminalBranch;

    public function health(): JsonResponse
    {
        try {
            DB::select('select 1');
            $database = true;
        } catch (\Throwable) {
            $database = false;
        }

        return response()->json([
            'message' => 'CWSPOS API',
            'data' => [
                'status' => $database ? 'ok' : 'degraded',
                'database' => $database,
                'time' => now()->toIso8601String(),
            ],
        ], $database ? 200 : 503);
    }

    public function settings(Request $request, PaymentMethods $payments): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        return response()->json([
            'message' => 'Settings loaded.',
            'data' => [
                'currency' => $branch->region->currency_code,
                'tax_label' => 'VAT',
                'tax_rate' => (float) $branch->region->tax_rate,
                'receipt_footer' => 'Thank you for shopping with CWSPOS.',
                'payment_methods' => $payments->forRegion($branch->region),
            ],
        ]);
    }

    public function minVersion(): JsonResponse
    {
        return response()->json([
            'message' => 'Minimum version loaded.',
            'data' => [
                'minimum_version' => (string) config('pos.minimum_version', '1.0.0'),
                'download_url' => (string) config('pos.download_url', ''),
            ],
        ]);
    }

    public function bootstrap(
        Request $request,
        PosCatalogService $catalog,
        ApiUserPresenter $presenter,
        PaymentMethods $payments,
    ): JsonResponse {
        $branch = $this->terminalBranch($request);
        $catalogData = $catalog->forBranch($branch);
        $orders = Order::query()
            ->where('branch_id', $branch->id)
            ->whereDate('created_at', today())
            ->withCount('items')
            ->latest()
            ->limit(50)
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
            'message' => 'Terminal ready.',
            'data' => [
                ...$presenter->present($request->user()),
                'products' => $catalogData['products'],
                'categories' => $catalogData['categories'],
                'orders_today' => $orders,
                'payment_methods' => $payments->forRegion($branch->region),
            ],
        ]);
    }
}
