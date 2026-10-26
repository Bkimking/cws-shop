<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Warehouse;

class WarehousePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('manage warehouses');
    }

    public function view(User $user, Warehouse $warehouse): bool
    {
        return $user->can('manage warehouses') && $this->inScope($user, $warehouse);
    }

    public function create(User $user): bool
    {
        return $user->can('create warehouses');
    }

    public function update(User $user, Warehouse $warehouse): bool
    {
        return $user->can('edit warehouses') && $this->inScope($user, $warehouse);
    }

    public function delete(User $user, Warehouse $warehouse): bool
    {
        return $user->can('delete warehouses') && $this->inScope($user, $warehouse);
    }

    /**
     * Warehouse scope for stock adjustments/transfers.
     */
    public function useForStock(User $user, Warehouse $warehouse): bool
    {
        if (! $user->can('adjust stock') && ! $user->can('transfer stock')) {
            return false;
        }

        return $this->inScope($user, $warehouse);
    }

    private function inScope(User $user, Warehouse $warehouse): bool
    {
        if ($user->hasRole('Superadmin')) {
            return true;
        }

        if ($user->branch_id !== null) {
            return (int) $warehouse->branch_id === (int) $user->branch_id;
        }

        return $warehouse->branch->region_id === $user->effectiveRegionId();
    }
}
