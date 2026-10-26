<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\Order;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class SalesSummaryTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Summarises completed sales for the scoped branch or region over a date range. Returns order count, revenue and tax.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);

        $query = $this->scope->applyBranchRegion(
            AiReadOnly::query(Order::class)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$from, $to])
        );

        $orders = (clone $query)->count();
        $revenue = (float) (clone $query)->sum('total');
        $tax = (float) (clone $query)->sum('tax');

        return AiToolResult::make(
            $this->scope,
            sprintf(
                '%s: %s orders, %s %s revenue, %s tax.',
                $this->dateLabel($from, $to, $this->scope),
                number_format($orders),
                $this->scope->currency(),
                number_format($revenue, 2),
                number_format($tax, 2),
            ),
            [[
                'orders' => $orders,
                'revenue' => round($revenue, 2),
                'tax' => round($tax, 2),
                'currency' => $this->scope->currency(),
            ]],
            [
                ['key' => 'orders', 'label' => 'Orders'],
                ['key' => 'revenue', 'label' => 'Revenue'],
                ['key' => 'tax', 'label' => 'Tax'],
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
        ];
    }
}
