<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('manage categories');
    }

    public function view(User $user, Category $category): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->can('manage categories');
    }

    public function update(User $user, Category $category): bool
    {
        return $user->can('manage categories');
    }

    public function delete(User $user, Category $category): bool
    {
        if (! $user->can('manage categories')) {
            return false;
        }

        // Prevent deletion if category has products
        if ($category->products()->exists()) {
            return false;
        }

        // Prevent deletion if category has children
        if ($category->children()->exists()) {
            return false;
        }

        return true;
    }
}
