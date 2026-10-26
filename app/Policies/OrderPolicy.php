<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view orders');
    }

    public function view(User $user, Order $order): bool
    {
        if (! $user->can('view orders')) {
            return false;
        }

        return $this->inScope($user, $order);
    }

    public function create(User $user): bool
    {
        return $user->can('create orders');
    }

    public function update(User $user, Order $order): bool
    {
        if (! $user->can('edit orders')) {
            return false;
        }

        return $this->inScope($user, $order);
    }

    public function managePickup(User $user, Order $order): bool
    {
        if (! $user->can('manage pickups')) {
            return false;
        }

        return $this->inScope($user, $order);
    }

    public function refund(User $user, Order $order): bool
    {
        if (! $user->can('refund orders')) {
            return false;
        }

        return $this->inScope($user, $order);
    }

    public function delete(User $user, Order $order): bool
    {
        return $this->update($user, $order);
    }

    private function inScope(User $user, Order $order): bool
    {
        if ($user->hasRole('Superadmin')) {
            return true;
        }

        if ($order->branch_id === null) {
            return false;
        }

        $branchRegionId = DB::table('branches')
            ->where('id', $order->branch_id)
            ->value('region_id');

        if ($user->hasRole('Region Admin')) {
            return (int) $branchRegionId === (int) $user->effectiveRegionId();
        }

        return (int) $user->branch_id === (int) $order->branch_id;
    }
}
