<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductRegionPrice;
use App\Models\StockLevel;
use App\Models\Warehouse;

class PosCatalogService
{
    /**
     * @return array{products: array<int, array<string, mixed>>, categories: array<int, array<string, mixed>>}
     */
    public function forBranch(Branch $branch): array
    {
        $warehouseIds = Warehouse::query()->where('branch_id', $branch->id)->pluck('id');

        $stockByVariant = StockLevel::query()
            ->whereIn('warehouse_id', $warehouseIds)
            ->selectRaw('product_variant_id, SUM(quantity_on_hand) as quantity')
            ->groupBy('product_variant_id')
            ->pluck('quantity', 'product_variant_id');

        $regionPrices = ProductRegionPrice::query()
            ->where('region_id', $branch->region_id)
            ->pluck('price_override', 'product_id');

        $products = Product::query()
            ->where('is_active', true)
            ->whereHas('variants')
            ->with([
                'category:id,name',
                'images:id,product_id,path,alt_text,sort_order,is_primary',
                'variants' => fn ($query) => $query
                    ->orderBy('variant_name')
                    ->select(['id', 'product_id', 'variant_name', 'sku_suffix', 'barcode', 'price_delta']),
            ])
            ->orderBy('name')
            ->get()
            ->map(function (Product $product) use ($stockByVariant, $regionPrices) {
                $override = $regionPrices->get($product->id);

                $variants = $product->variants->map(function ($variant) use ($product, $override, $stockByVariant) {
                    $basePrice = $override !== null
                        ? (float) $override
                        : (float) $product->base_price;
                    $price = $basePrice + (float) $variant->price_delta;

                    return [
                        'id' => $variant->id,
                        'name' => $variant->variant_name,
                        'sku' => trim($product->sku.($variant->sku_suffix ?? '')),
                        'barcode' => $variant->barcode,
                        'price' => round($price, 2),
                        'stock' => (int) ($stockByVariant->get($variant->id) ?? 0),
                    ];
                })->values();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'category_id' => $product->category_id,
                    'category' => $product->category->name,
                    'price' => (float) ($variants->min('price') ?? 0),
                    'stock' => (int) $variants->sum('stock'),
                    'image_url' => (function () use ($product): ?string {
                        $primary = $product->images->firstWhere('is_primary', true);
                        $first = $product->images->first();

                        return $primary !== null ? $primary->url : ($first !== null ? $first->url : null);
                    })(),
                    'variants' => $variants,
                    'updated_at' => $product->updated_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $categories = Category::query()
            ->whereIn('id', collect($products)->pluck('category_id')->filter()->unique())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Category $category) => ['id' => $category->id, 'name' => $category->name])
            ->all();

        return ['products' => $products, 'categories' => $categories];
    }
}
