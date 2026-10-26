<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\Order;
use App\Models\Payment;
use App\Models\TillSession;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class TillSummaryTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists till sessions for the scoped branch or region, including sales, cash, expected cash and variance.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);

        $query = $this->scope->applyBranchRegion(
            AiReadOnly::query(TillSession::class)
                ->with(['user:id,name', 'branch:id,name'])
                ->whereBetween('opened_at', [$from, $to])
                ->latest('opened_at')
                ->limit(50)
        );

        /** @var Collection<int, TillSession> $tills */
        $tills = $query->get();

        $rows = $tills->map(function (TillSession $till): array {
            $orders = AiReadOnly::query(Order::class)
                ->where('till_session_id', $till->id)
                ->where('status', 'completed');

            $sales = (float) (clone $orders)->sum('total');

            $cash = (float) AiReadOnly::query(Payment::class)
                ->whereIn('order_id', (clone $orders)->select('id'))
                ->where('status', 'completed')
                ->where('gateway', 'cash')
                ->sum('amount');

            $expected = (float) $till->opening_cash + $cash;
            $variance = $till->closed_at ? round((float) $till->closing_cash - $expected, 2) : null;

            return [
                'till' => '#'.$till->id,
                'cashier' => $till->user->name,
                'branch' => $till->branch->name,
                'opened_at' => $till->opened_at->toDateTimeString(),
                'closed_at' => $till->closed_at !== null ? $till->closed_at->toDateTimeString() : null,
                'sales' => round($sales, 2),
                'cash' => round($cash, 2),
                'expected_cash' => round($expected, 2),
                'variance' => $variance,
            ];
        })->all();

        return AiToolResult::make(
            $this->scope,
            sprintf('%s till sessions: %s rows.', $this->dateLabel($from, $to, $this->scope), count($rows)),
            $rows,
            [
                ['key' => 'till', 'label' => 'Till'],
                ['key' => 'cashier', 'label' => 'Cashier'],
                ['key' => 'sales', 'label' => 'Sales'],
                ['key' => 'variance', 'label' => 'Variance'],
            ],
            [['label' => 'Tills', 'url' => route('admin.dashboard')]],
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
