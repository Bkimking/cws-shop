<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\Order;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class OrderSearchTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Searches orders in the scoped branch or region by date range and optional status.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);
        $limit = max(1, min(50, (int) ($request['limit'] ?? 20)));
        $status = trim((string) ($request['status'] ?? ''));

        $query = $this->scope->applyBranchRegion(
            AiReadOnly::query(Order::class)
                ->with(['branch:id,name', 'customer:id,name'])
                ->whereBetween('created_at', [$from, $to])
                ->latest('created_at')
                ->limit($limit)
        );

        if ($status !== '') {
            $query->where('status', $status);
        }

        /** @var Collection<int, Order> $orders */
        $orders = $query->get();

        $rows = $orders->map(fn (Order $order) => [
            'order' => '#'.$order->id,
            'status' => $order->status,
            'branch' => $order->branch?->name,
            'customer' => $order->customer?->name,
            'total' => (float) $order->total,
            'currency' => $order->currency_code,
            'created_at' => $order->created_at?->toDateTimeString(),
        ])->all();

        return AiToolResult::make(
            $this->scope,
            sprintf(
                '%s orders in %s: %s rows.',
                $this->dateLabel($from, $to, $this->scope),
                $this->scope->label(),
                count($rows),
            ),
            $rows,
            [
                ['key' => 'order', 'label' => 'Order'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'total', 'label' => 'Total'],
            ],
            [['label' => 'Orders', 'url' => route('admin.orders.index')]],
            null,
            ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->description('Start date, YYYY-MM-DD.'),
            'to' => $schema->string()->description('End date, YYYY-MM-DD.'),
            'status' => $schema->string()->description('Optional order status, e.g. completed, cancelled, pending.'),
            'limit' => $schema->integer()->min(1)->max(50)->description('Maximum rows, default 20.'),
        ];
    }
}
