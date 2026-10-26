<?php

namespace App\Policies;

use App\Models\StockLevel;
use App\Models\User;

class StockPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view stock');
    }

    public function view(User $user, StockLevel $stockLevel): bool
    {
        if (! $user->can('view stock')) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        // Region Admin: only stock in their region
        if ($user->hasRole('Region Admin')) {
            return $stockLevel->warehouse->branch->region_id === $user->effectiveRegionId();
        }

        // Branch Admin / Inventory Manager: only stock in their branch
        return $user->branch_id === $stockLevel->warehouse->branch_id;
    }

    public function adjust(User $user, StockLevel $stockLevel): bool
    {
        if (! $user->can('adjust stock')) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        // Region Admin: only stock in their region
        if ($user->hasRole('Region Admin')) {
            return $stockLevel->warehouse->branch->region_id === $user->effectiveRegionId();
        }

        // Branch Admin / Inventory Manager: only stock in their branch
        return $user->branch_id === $stockLevel->warehouse->branch_id;
    }

    public function transfer(User $user): bool
    {
        return $user->can('transfer stock');
    }

    public function create(User $user): bool
    {
        return $user->can('adjust stock');
    }
}
