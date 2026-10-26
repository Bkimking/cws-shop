<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\Branch;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class PaymentBreakdownTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Breaks down completed payments by gateway for the scoped branch or region.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);

        $query = DB::connection(AiReadOnly::connection())
            ->table('payments')
            ->join('orders', 'orders.id', '=', 'payments.order_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$from, $to]);

        if ($this->scope->branch) {
            $query->where('orders.branch_id', $this->scope->branch->id);
        } elseif ($this->scope->region) {
            $query->whereIn(
                'orders.branch_id',
                Branch::query()->where('region_id', $this->scope->region->id)->select('id')
            );
        }

        $rows = $query
            ->selectRaw('payments.gateway as gateway, COUNT(*) as payments, SUM(payments.amount) as amount')
            ->groupBy('payments.gateway')
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($row) => [
                'gateway' => $row->gateway,
                'payments' => (int) $row->payments,
                'amount' => round((float) $row->amount, 2),
            ])
            ->all();

        return AiToolResult::make(
            $this->scope,
            sprintf('%s payments by gateway.', $this->dateLabel($from, $to, $this->scope)),
            $rows,
            [
                ['key' => 'gateway', 'label' => 'Gateway'],
                ['key' => 'payments', 'label' => 'Payments'],
                ['key' => 'amount', 'label' => 'Amount'],
            ],
            [['label' => 'Orders', 'url' => route('admin.orders.index')]],
            ['type' => 'bar', 'x' => 'gateway', 'y' => 'amount'],
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
