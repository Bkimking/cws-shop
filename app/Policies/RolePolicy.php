<?php

namespace App\Policies;

use App\Models\User;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('Superadmin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('Superadmin');
    }

    public function update(User $user): bool
    {
        return $user->hasRole('Superadmin');
    }

    public function delete(User $user): bool
    {
        return $user->hasRole('Superadmin');
    }
}