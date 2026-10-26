<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RefundSummaryTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Summarises cancelled orders and refunded payments for the scoped branch or region.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);

        $ordersQuery = $this->scope->applyBranchRegion(
            AiReadOnly::query(Order::class)
                ->where('status', 'cancelled')
                ->whereBetween('created_at', [$from, $to])
        );

        $cancelled = (clone $ordersQuery)->count();
        $value = (float) (clone $ordersQuery)->sum('total');
        $orderIds = (clone $ordersQuery)->pluck('id');

        $refunded = (float) AiReadOnly::query(Payment::class)
            ->whereIn('order_id', $orderIds)
            ->where('status', 'refunded')
            ->sum('amount');

        return AiToolResult::make(
            $this->scope,
            sprintf(
                '%s: %s cancelled orders worth %s %s; %s %s refunded.',
                $this->dateLabel($from, $to, $this->scope),
                number_format($cancelled),
                $this->scope->currency(),
                number_format($value, 2),
                $this->scope->currency(),
                number_format($refunded, 2),
            ),
            [[
                'cancelled_orders' => $cancelled,
                'cancelled_value' => round($value, 2),
                'refunded' => round($refunded, 2),
                'currency' => $this->scope->currency(),
            ]],
            [
                ['key' => 'cancelled_orders', 'label' => 'Cancelled'],
                ['key' => 'cancelled_value', 'label' => 'Value'],
                ['key' => 'refunded', 'label' => 'Refunded'],
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
