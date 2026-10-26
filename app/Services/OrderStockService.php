<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class OrderStockService
{
    /**
     * Take the ordered quantities out of the branch's warehouses and record a
     * SALE movement for each warehouse that was touched.
     */
    public function deduct(Order $order, ?User $user = null, ?Warehouse $warehouse = null): void
    {
        if (! $order->branch_id) {
            throw ValidationException::withMessages([
                'branch_id' => 'A branch is required before stock can be deducted.',
            ]);
        }

        if ($warehouse !== null && (int) $warehouse->branch_id !== (int) $order->branch_id) {
            throw ValidationException::withMessages([
                'pickup_warehouse_id' => 'Choose a pickup warehouse inside the order branch.',
            ]);
        }

        $warehouseIds = $warehouse !== null
            ? Collection::make([$warehouse->id])
            : Warehouse::query()
                ->where('branch_id', $order->branch_id)
                ->pluck('id');

        if ($warehouseIds->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => 'No warehouse is set up for this branch yet.',
            ]);
        }

        $order->loadMissing(['items.productVariant.product', 'pickupWarehouse']);

        foreach ($order->items as $item) {
            $remaining = (int) $item->quantity;

            /** @var Collection<int, StockLevel> $rows */
            $rows = StockLevel::query()
                ->whereIn('warehouse_id', $warehouseIds)
                ->where('product_variant_id', $item->product_variant_id)
                ->orderByDesc('quantity_on_hand')
                ->lockForUpdate()
                ->get();

            if ((int) $rows->sum('quantity_on_hand') < $remaining) {
                throw ValidationException::withMessages([
                    'items' => 'Not enough stock for '.$this->itemName($item).'.',
                ]);
            }

            foreach ($rows as $row) {
                if ($remaining <= 0) {
                    break;
                }

                $take = min($remaining, (int) $row->quantity_on_hand);

                if ($take <= 0) {
                    continue;
                }

                $row->decrement('quantity_on_hand', $take);

                StockMovement::create([
                    'warehouse_id' => $row->warehouse_id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => -$take,
                    'type' => 'SALE',
                    'reference_id' => (string) $order->id,
                    'created_by' => $user?->id,
                    'notes' => "Order #{$order->id}",
                ]);

                $remaining -= $take;
            }
        }
    }

    /**
     * Put the ordered quantities back into the branch's primary warehouse and
     * record a RETURN movement for each line.
     */
    public function restock(Order $order, ?User $user = null): void
    {
        if (! $order->branch_id) {
            return;
        }

        $warehouseId = $order->pickup_warehouse_id
            ?: Warehouse::query()
                ->where('branch_id', $order->branch_id)
                ->orderBy('id')
                ->value('id');

        if (! $warehouseId) {
            return;
        }

        $order->loadMissing('items.productVariant.product');

        foreach ($order->items as $item) {
            $stock = StockLevel::firstOrCreate(
                [
                    'warehouse_id' => $warehouseId,
                    'product_variant_id' => $item->product_variant_id,
                ],
                [
                    'quantity_on_hand' => 0,
                    'reorder_point' => 0,
                ]
            );

            $stock->increment('quantity_on_hand', (int) $item->quantity);

            StockMovement::create([
                'warehouse_id' => $warehouseId,
                'product_variant_id' => $item->product_variant_id,
                'quantity' => (int) $item->quantity,
                'type' => 'RETURN',
                'reference_id' => (string) $order->id,
                'created_by' => $user?->id,
                'notes' => "Refund for order #{$order->id}",
            ]);
        }
    }

    private function itemName(OrderItem $item): string
    {
        return $item->productVariant->product->name;
    }
}
