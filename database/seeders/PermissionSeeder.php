<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Admin panel access gate (Superadmin/Region/Branch/Inventory Manager — not Cashier)
            'access admin panel',

            // manage permissions and roles
            'manage permissions and roles',

            // Regions & branches
            'manage regions',
            'manage branches',

            // Users
            'manage users',
            'view users',
            'create users',
            'edit users',
            'delete users',

            // Catalog
            'view products',
            'create products',
            'edit products',
            'delete products',
            'manage categories',

            // Stock
            'view stock',
            'adjust stock',
            'transfer stock',
            'manage warehouses',
            'create warehouses',
            'edit warehouses',
            'delete warehouses',

            // Orders
            'create orders',
            'view orders',
            'edit orders',
            'manage pickups',
            'refund orders',

            // Payments
            'manage payment gateways',
            'create payment gateways',
            'activate payment gateways',
            'edit payment gateways',
            'delete payment gateways',

            // POS terminal
            'use pos terminal',
            'manage till',
            'apply discounts',
            'approve overrides',

            // AI
            'use ai assistant',
            'view ai insights',
            'manage ai settings',

            // Reporting
            'view reports',
            'view branch reports',
            'view region reports',

            // Audit / activity log
            'view activity log',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }
    }
}
