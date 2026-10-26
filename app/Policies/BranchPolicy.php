<?php

namespace App\Policies;

use App\Models\Branch;
use App\Models\User;

class BranchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('manage branches');
    }

    public function view(User $user, Branch $branch): bool
    {
        return $this->scoped($user, $branch);
    }

    public function create(User $user): bool
    {
        return $user->can('manage branches');
    }

    public function update(User $user, Branch $branch): bool
    {
        return $this->scoped($user, $branch);
    }

    public function delete(User $user, Branch $branch): bool
    {
        return $this->scoped($user, $branch);
    }

    private function scoped(User $user, Branch $branch): bool
    {
        if (! $user->can('manage branches')) {
            return false;
        }

        if ($user->hasRole('Superadmin')) {
            return true;
        }

        // Region Admin: only branches inside their own region
        return $branch->region_id === $user->effectiveRegionId();
    }
}