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

class StockOnHandTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Returns stock on hand for a product name, SKU or variant in the scoped branch or region.';
    }

    public function handle(Request $request): string
    {
        $search = trim((string) ($request['query'] ?? ''));
        $limit = max(1, min(50, (int) ($request['limit'] ?? 20)));

        $query = $this->scope->applyStockScope(
            AiReadOnly::query(StockLevel::class)
                ->with([
                    'warehouse:id,name,branch_id',
                    'warehouse.branch:id,name',
                    'productVariant:id,product_id,variant_name,sku_suffix',
                    'productVariant.product:id,name,sku',
                ])
                ->orderByDesc('quantity_on_hand')
                ->limit($limit)
        );

        if ($search !== '') {
            $query->whereHas('productVariant', function ($variantQuery) use ($search): void {
                $variantQuery->where('variant_name', 'like', "%{$search}%")
                    ->orWhere('sku_suffix', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search): void {
                        $productQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

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
            ];
        })->all();

        return AiToolResult::make(
            $this->scope,
            $search !== ''
                ? sprintf('Stock matching “%s” in %s.', $search, $this->scope->label())
                : sprintf('Stock on hand in %s.', $this->scope->label()),
            $rows,
            [
                ['key' => 'product', 'label' => 'Item'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'warehouse', 'label' => 'Warehouse'],
                ['key' => 'on_hand', 'label' => 'On hand'],
            ],
            [['label' => 'Stock', 'url' => route('admin.stock.index')]],
            null,
            ['row_count' => count($rows)],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema->string()->description('Product name, SKU or variant search.'),
            'limit' => $schema->integer()->min(1)->max(50)->description('Maximum rows, default 20.'),
        ];
    }
}
