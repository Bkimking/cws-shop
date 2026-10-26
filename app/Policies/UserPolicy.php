<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('manage users') || $user->can('view users');
    }

    public function view(User $user, User $target): bool
    {
        return ($user->can('manage users') || $user->can('view users'))
            && $this->inScope($user, $target);
    }

    public function create(User $user): bool
    {
        return $user->can('create users');
    }

    public function update(User $user, User $target): bool
    {
        return $user->can('edit users') && $this->inScope($user, $target);
    }

    public function delete(User $user, User $target): bool
    {
        return $user->can('delete users') && $this->inScope($user, $target);
    }

    private function inScope(User $user, User $target): bool
    {
        if ($user->hasRole('Superadmin')) {
            return true;
        }

        if ($target->hasAnyRole(['Superadmin', 'Region Admin'])) {
            return false;
        }

        return $user->branch_id !== null && $user->branch_id === $target->branch_id;
    }
}
