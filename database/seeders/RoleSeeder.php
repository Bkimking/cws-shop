<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $superadmin = Role::findOrCreate('Superadmin');
        $superadmin->syncPermissions(Permission::all());

        $regionAdmin = Role::findOrCreate('Region Admin');
        $regionAdmin->syncPermissions([
            'access admin panel',
            'manage branches',
            'manage payment gateways', 'create payment gateways', 'activate payment gateways', 'edit payment gateways', 'delete payment gateways',
            'manage categories',
            'view products',
            'view stock',
            'view orders',
            'manage pickups',
            'use ai assistant',
            'view ai insights',
            'view reports',
            'view region reports',
            'view branch reports',
            'view activity log',
            'approve overrides',
        ]);

        $branchAdmin = Role::findOrCreate('Branch Admin');
        $branchAdmin->syncPermissions([
            'access admin panel',
            'manage users', 'view users', 'create users', 'edit users', 'delete users',
            'view products', 'create products', 'edit products',
            'manage categories',
            'view stock', 'adjust stock', 'transfer stock',
            'view orders', 'edit orders', 'manage pickups',
            'view reports',
            'view branch reports',
            'view activity log',
            'use pos terminal',
            'manage till',
            'apply discounts',
            'approve overrides',
            'use ai assistant',
            'view ai insights',
        ]);

        $cashier = Role::findOrCreate('Cashier');
        $cashier->syncPermissions([
            'view products',
            'view orders',
            'use pos terminal',
            'create orders',
            'manage till',
            'apply discounts',
        ]);

        $inventoryManager = Role::findOrCreate('Inventory Manager');
        $inventoryManager->syncPermissions([
            'access admin panel',
            'view products', 'edit products',
            'manage categories',
            'view stock', 'adjust stock', 'transfer stock',
            'manage warehouses', 'create warehouses', 'edit warehouses', 'delete warehouses',
            'use ai assistant',
            'view ai insights',
        ]);
    }
}
