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

class SalesTrendTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Returns the daily sales trend for the scoped branch or region over a date range.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);
        $timezone = $this->scope->timezone();

        $query = $this->scope->applyBranchRegion(
            AiReadOnly::query(Order::class)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$from, $to])
        );

        /** @var Collection<int, Order> $orders */
        $orders = $query->limit(20000)->get(['created_at', 'total']);

        $rows = $orders
            ->groupBy(fn (Order $order) => $order->created_at->timezone($timezone)->toDateString())
            ->map(fn ($dayOrders, $day) => [
                'date' => $day,
                'orders' => $dayOrders->count(),
                'revenue' => round((float) $dayOrders->sum('total'), 2),
            ])
            ->sortBy('date')
            ->values()
            ->all();

        $total = array_sum(array_column($rows, 'revenue'));

        return AiToolResult::make(
            $this->scope,
            sprintf(
                '%s daily sales: %s %s across %s orders.',
                $this->dateLabel($from, $to, $this->scope),
                $this->scope->currency(),
                number_format($total, 2),
                number_format($orders->count()),
            ),
            $rows,
            [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'orders', 'label' => 'Orders'],
                ['key' => 'revenue', 'label' => 'Revenue'],
            ],
            [['label' => 'Orders', 'url' => route('admin.orders.index')]],
            ['type' => 'line', 'x' => 'date', 'y' => 'revenue'],
            ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'truncated' => $orders->count() >= 20000],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->description('Start date, YYYY-MM-DD.'),
            'to' => $schema->string()->description('End date, YYYY-MM-DD.'),
        ];
    }
}
