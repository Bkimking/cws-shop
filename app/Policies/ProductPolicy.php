<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view products');
    }

    public function view(User $user, Product $product): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->can('create products');
    }

    public function update(User $user, Product $product): bool
    {
        if (! $user->can('edit products')) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        // Region Admin: can edit products with region pricing for their region OR no pricing yet
        if ($user->hasRole('Region Admin')) {
            $regionId = $user->effectiveRegionId();
            if (! $regionId) {
                return false;
            }

            // Can edit if product has region pricing for their region OR no region pricing at all
            $hasRegionPricing = $product->regionPrices()->where('region_id', $regionId)->exists();
            $hasAnyPricing = $product->regionPrices()->exists();

            return $hasRegionPricing || ! $hasAnyPricing;
        }

        // Branch Admin: can edit products with stock in their branch OR no stock yet
        if ($user->hasRole('Branch Admin')) {
            if (! $user->branch_id) {
                return false;
            }

            // Can edit if product has stock in their branch's warehouses OR no stock at all
            $hasBranchStock = $product->variants()
                ->whereHas('stockLevels', fn ($q) => $q->whereHas('warehouse', fn ($wq) => $wq->where('branch_id', $user->branch_id)))
                ->exists();
            $hasAnyStock = $product->variants()->whereHas('stockLevels')->exists();

            return $hasBranchStock || ! $hasAnyStock;
        }

        return false;
    }

    public function delete(User $user, Product $product): bool
    {
        return $this->update($user, $product);
    }
}
