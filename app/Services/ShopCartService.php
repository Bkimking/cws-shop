<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\ProductRegionPrice;
use App\Models\ProductVariant;
use App\Models\StockLevel;
use App\Models\Warehouse;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\ValidationException;

class ShopCartService
{
    private const KEY = 'shop_cart';

    /**
     * @return array<int, array<string, mixed>>
     */
    public function lines(Branch $branch): array
    {
        $cart = $this->raw();

        if ($cart === []) {
            return [];
        }

        $warehouseIds = Warehouse::query()->where('branch_id', $branch->id)->pluck('id');

        $variants = ProductVariant::query()
            ->with('product.category:id,name')
            ->whereIn('id', array_keys($cart))
            ->get()
            ->keyBy('id');

        $stock = StockLevel::query()
            ->whereIn('warehouse_id', $warehouseIds)
            ->whereIn('product_variant_id', $variants->keys())
            ->selectRaw('product_variant_id, SUM(quantity_on_hand) as quantity')
            ->groupBy('product_variant_id')
            ->pluck('quantity', 'product_variant_id');

        $prices = ProductRegionPrice::query()
            ->where('region_id', $branch->region_id)
            ->whereIn('product_id', $variants->pluck('product_id')->unique())
            ->pluck('price_override', 'product_id');

        $lines = [];

        foreach ($cart as $variantId => $quantity) {
            $variant = $variants->get((int) $variantId);

            if (! $variant || ! $variant->product->is_active) {
                continue;
            }

            $available = (int) ($stock->get($variant->id) ?? 0);

            if ($available <= 0) {
                continue;
            }

            $quantity = max(1, min((int) $quantity, $available));
            $override = $prices->get($variant->product_id);
            $base = $override !== null ? (float) $override : (float) $variant->product->base_price;
            $price = round($base + (float) $variant->price_delta, 2);

            $lines[] = [
                'variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'name' => $variant->product->name,
                'variant' => $variant->variant_name,
                'sku' => trim($variant->product->sku.($variant->sku_suffix ?? '')),
                'price' => $price,
                'quantity' => $quantity,
                'available' => $available,
                'line_total' => round($price * $quantity, 2),
            ];
        }

        return $lines;
    }

    public function add(int $variantId, int $quantity, Branch $branch): void
    {
        $variant = ProductVariant::query()->with('product')->find($variantId);

        if (! $variant || ! $variant->product->is_active) {
            throw ValidationException::withMessages(['cart' => 'That product is no longer available.']);
        }

        $available = $this->available($variantId, $branch);

        if ($available <= 0) {
            throw ValidationException::withMessages(['cart' => 'That product is out of stock.']);
        }

        $cart = $this->raw();
        $next = (int) ($cart[$variantId] ?? 0) + max(1, $quantity);

        if ($next > $available) {
            throw ValidationException::withMessages([
                'cart' => 'Only '.$available.' available at '.$branch->name.'.',
            ]);
        }

        $cart[$variantId] = $next;
        Session::put(self::KEY, $cart);
        Session::save();
    }

    public function update(int $variantId, int $quantity, Branch $branch): void
    {
        $cart = $this->raw();

        if (! isset($cart[$variantId])) {
            return;
        }

        if ($quantity <= 0) {
            unset($cart[$variantId]);
        } else {
            $available = $this->available($variantId, $branch);

            if ($quantity > $available) {
                throw ValidationException::withMessages([
                    'cart' => 'Only '.$available.' available at '.$branch->name.'.',
                ]);
            }

            $cart[$variantId] = $quantity;
        }

        Session::put(self::KEY, $cart);
        Session::save();
    }

    public function remove(int $variantId): void
    {
        $cart = $this->raw();
        unset($cart[$variantId]);
        Session::put(self::KEY, $cart);
        Session::save();
    }

    public function clear(): void
    {
        Session::forget(self::KEY);
        Session::save();
    }

    public function count(): int
    {
        return array_sum($this->raw());
    }

    /**
     * @return array<int, int>
     */
    public function raw(): array
    {
        $cart = Session::get(self::KEY, []);

        if (! is_array($cart)) {
            return [];
        }

        return collect($cart)
            ->mapWithKeys(fn ($quantity, $variantId) => [(int) $variantId => max(0, (int) $quantity)])
            ->filter(fn (int $quantity) => $quantity > 0)
            ->all();
    }

    private function available(int $variantId, Branch $branch): int
    {
        return (int) StockLevel::query()
            ->whereIn('warehouse_id', Warehouse::query()->where('branch_id', $branch->id)->select('id'))
            ->where('product_variant_id', $variantId)
            ->sum('quantity_on_hand');
    }
}
