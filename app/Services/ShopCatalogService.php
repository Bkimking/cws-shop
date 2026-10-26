<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Product;
use App\Models\ProductRegionPrice;
use App\Models\StockLevel;
use App\Models\Warehouse;
use Illuminate\Support\Collection;

class ShopCatalogService
{
    public function branch(?int $branchId = null): Branch
    {
        return Branch::query()
            ->with('region')
            ->where('is_active', true)
            ->when($branchId, fn ($query) => $query->whereKey($branchId))
            ->orderBy('id')
            ->firstOrFail();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function products(Branch $branch): Collection
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

        return Product::query()
            ->where('is_active', true)
            ->whereHas('variants')
            ->with([
                'category:id,name',
                'images:id,product_id,path,alt_text,sort_order,is_primary',
                'variants' => fn ($query) => $query
                    ->orderBy('variant_name')
                    ->select(['id', 'product_id', 'variant_name', 'sku_suffix', 'price_delta']),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => $this->transformProduct(
                $product,
                $branch,
                $stockByVariant,
                $regionPrices,
            ))
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    public function product(Branch $branch, Product $product): array
    {
        abort_unless($product->is_active, 404);

        $product->load([
            'category:id,name',
            'images:id,product_id,path,alt_text,sort_order,is_primary',
            'variants' => fn ($query) => $query->orderBy('variant_name'),
        ]);

        $warehouseIds = Warehouse::query()->where('branch_id', $branch->id)->pluck('id');

        $stockByVariant = StockLevel::query()
            ->whereIn('warehouse_id', $warehouseIds)
            ->whereIn('product_variant_id', $product->variants->pluck('id'))
            ->selectRaw('product_variant_id, SUM(quantity_on_hand) as quantity')
            ->groupBy('product_variant_id')
            ->pluck('quantity', 'product_variant_id');

        $override = ProductRegionPrice::query()
            ->where('region_id', $branch->region_id)
            ->where('product_id', $product->id)
            ->value('price_override');

        return $this->transformProduct(
            $product,
            $branch,
            $stockByVariant,
            collect([$product->id => $override]),
            withDescription: true,
        );
    }

    /**
     * @param  Collection<int, mixed>  $stockByVariant
     * @param  Collection<int, mixed>  $regionPrices
     * @return array<string, mixed>
     */
    private function transformProduct(
        Product $product,
        Branch $branch,
        Collection $stockByVariant,
        Collection $regionPrices,
        bool $withDescription = false,
    ): array {
        $override = $regionPrices->get($product->id);

        $variants = $product->variants->map(function ($variant) use ($product, $override, $stockByVariant) {
            $basePrice = $override !== null
                ? (float) $override
                : (float) $product->base_price;
            $price = round($basePrice + (float) $variant->price_delta, 2);
            $stock = (int) ($stockByVariant->get($variant->id) ?? 0);

            return [
                'id' => $variant->id,
                'name' => $variant->variant_name,
                'sku' => trim($product->sku.($variant->sku_suffix ?? '')),
                'price' => $price,
                'stock' => $stock,
                'available' => $stock > 0,
            ];
        })->values();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'description' => $withDescription ? $product->description : null,
            'category' => $product->category->name,
            'category_id' => $product->category_id,
            'price' => (float) ($variants->min('price') ?? 0),
            'stock' => (int) $variants->sum('stock'),
            'image_url' => (function () use ($product): ?string {
                $primary = $product->images->firstWhere('is_primary', true);
                $first = $product->images->first();

                return $primary !== null ? $primary->url : ($first !== null ? $first->url : null);
            })(),
            'variants' => $variants,
            'currency' => $branch->region->currency_code,
            'branch' => $branch->name,
        ];
    }
}
