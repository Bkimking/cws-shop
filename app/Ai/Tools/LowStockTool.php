<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\StockLevel;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class LowStockTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists products at or below their reorder point in the scoped branch or region.';
    }

    public function handle(Request $request): string
    {
        $limit = max(1, min(50, (int) ($request['limit'] ?? 20)));

        $query = $this->scope->applyStockScope(
            AiReadOnly::query(StockLevel::class)
                ->with([
                    'warehouse:id,name,branch_id',
                    'warehouse.branch:id,name',
                    'productVariant:id,product_id,variant_name,sku_suffix',
                    'productVariant.product:id,name,sku',
                ])
                ->whereColumn('quantity_on_hand', '<=', 'reorder_point')
                ->orderBy('quantity_on_hand')
                ->limit($limit)
        );

        /** @var Collection<int, StockLevel> $stocks */
        $stocks = $query->get();

        $rows = $stocks->map(function (StockLevel $stock): array {
            return [
                'stock_level_id' => $stock->id,
                'product_id' => $stock->productVariant->product->id,
                'variant_id' => $stock->productVariant->id,
                'product' => $stock->productVariant->product->name,
                'variant' => $stock->productVariant->variant_name,
                'sku' => $stock->productVariant->product->sku,
                'branch' => $stock->warehouse->branch->name,
                'warehouse' => $stock->warehouse->name,
                'on_hand' => (int) $stock->quantity_on_hand,
                'reorder_point' => (int) $stock->reorder_point,
                'status' => (int) $stock->quantity_on_hand <= 0 ? 'Out' : 'Low',
            ];
        })->all();

        return AiToolResult::make(
            $this->scope,
            sprintf('%s items are below their reorder point.', count($rows)),
            $rows,
            [
                ['key' => 'product', 'label' => 'Item'],
                ['key' => 'on_hand', 'label' => 'On hand'],
                ['key' => 'reorder_point', 'label' => 'Reorder'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            [['label' => 'Stock', 'url' => route('admin.stock.index')]],
            null,
            ['row_count' => count($rows)],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'limit' => $schema->integer()->min(1)->max(50)->description('Maximum rows, default 20.'),
        ];
    }
}
