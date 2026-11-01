<?php

use App\Models\Branch;
use App\Models\User;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::firstOrFail();
});

test('only the CWS superadmin can open the support page', function () {
    $superadmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $superadmin->assignRole('Superadmin');
    $cashier = User::factory()->create(['branch_id' => $this->branch->id]);
    $cashier->assignRole('Cashier');

    $this->actingAs($superadmin)->get('/admin/support')->assertOk();
    $this->actingAs($cashier)->get('/admin/support')->assertForbidden();
});
