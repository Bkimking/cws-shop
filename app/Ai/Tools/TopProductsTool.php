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

class TopProductsTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Returns the top products by revenue or quantity for the scoped branch or region.';
    }

    public function handle(Request $request): string
    {
        [$from, $to] = $this->dateRange($request, $this->scope);
        $limit = max(1, min(20, (int) ($request['limit'] ?? 10)));

        $query = DB::connection(AiReadOnly::connection())
            ->table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
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
            ->selectRaw('products.name as product, product_variants.variant_name as variant, SUM(order_items.quantity) as quantity, SUM(order_items.quantity * order_items.unit_price - order_items.discount) as revenue')
            ->groupBy('products.id', 'products.name', 'product_variants.id', 'product_variants.variant_name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'product' => $row->product,
                'variant' => $row->variant,
                'quantity' => (int) $row->quantity,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->all();

        return AiToolResult::make(
            $this->scope,
            sprintf(
                '%s top %s products by revenue.',
                $this->dateLabel($from, $to, $this->scope),
                count($rows),
            ),
            $rows,
            [
                ['key' => 'product', 'label' => 'Product'],
                ['key' => 'variant', 'label' => 'Variant'],
                ['key' => 'quantity', 'label' => 'Qty'],
                ['key' => 'revenue', 'label' => 'Revenue'],
            ],
            [['label' => 'Orders', 'url' => route('admin.orders.index')]],
            ['type' => 'bar', 'x' => 'product', 'y' => 'revenue'],
            ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->description('Start date, YYYY-MM-DD.'),
            'to' => $schema->string()->description('End date, YYYY-MM-DD.'),
            'limit' => $schema->integer()->min(1)->max(20)->description('Maximum rows, default 10.'),
        ];
    }
}
