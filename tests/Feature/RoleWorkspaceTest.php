<?php

use App\Models\Branch;
use App\Models\PaymentGatewayConfig;
use App\Models\Region;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'workspace-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'workspace-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
    ]);

    $this->region = Region::query()->firstOrFail();
    $this->branch = Branch::query()->firstOrFail();

    $this->regionAdmin = User::factory()->create([
        'region_id' => $this->region->id,
        'branch_id' => null,
    ]);
    $this->regionAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->regionAdmin->assignRole('Region Admin');

    $this->branchAdmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->branchAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->branchAdmin->assignRole('Branch Admin');

    $this->inventoryManager = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->inventoryManager->forceFill(['email_verified_at' => now()])->save();
    $this->inventoryManager->assignRole('Inventory Manager');
});

test('region admin sees a region-scoped desk', function () {
    $otherRegion = Region::create([
        'name' => 'Other Region',
        'slug' => 'other-region',
        'country_code' => 'UG',
        'currency_code' => 'UGX',
        'tax_rate' => 0,
        'timezone' => 'Africa/Kampala',
        'is_active' => true,
    ]);
    Branch::create([
        'region_id' => $otherRegion->id,
        'name' => 'Other Branch',
        'slug' => 'other-branch',
        'address' => 'Other address',
        'phone' => '+256700000000',
        'is_active' => true,
    ]);

    $this->actingAs($this->regionAdmin)
        ->get('/admin/region?region='.$otherRegion->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/workspaces/region')
            ->where('region.name', $this->region->name));
});

test('branch admin sees the branch desk', function () {
    $this->actingAs($this->branchAdmin)
        ->get('/admin/branch')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/workspaces/branch')
            ->where('branch.name', $this->branch->name));
});

test('inventory manager sees the inventory desk', function () {
    $this->actingAs($this->inventoryManager)
        ->get('/admin/inventory')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/workspaces/inventory')
            ->where('scope', 'Branch inventory'));
});

test('role desks reject accounts without the matching permission', function () {
    $this->actingAs($this->branchAdmin)
        ->get('/admin/region')
        ->assertForbidden();

    $this->actingAs($this->inventoryManager)
        ->get('/admin/branch')
        ->assertForbidden();
});

test('granular warehouse permissions gate each action', function () {
    Warehouse::create([
        'branch_id' => $this->branch->id,
        'name' => 'Granular Store',
    ]);

    $role = Role::create(['name' => 'Warehouse Viewer']);
    $role->syncPermissions(['access admin panel', 'manage warehouses']);

    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole($role);

    $this->actingAs($user)->get('/admin/warehouses')->assertOk();
    $this->actingAs($user)->get('/admin/warehouses/create')->assertForbidden();

    $role->givePermissionTo('create warehouses');
    $this->actingAs($user)->get('/admin/warehouses/create')->assertOk();
});

test('granular payment permissions separate access from activation', function () {
    $gateway = PaymentGatewayConfig::create([
        'region_id' => $this->region->id,
        'gateway' => 'mpesa',
        'is_enabled' => false,
        'encrypted_credentials' => [],
    ]);

    $role = Role::create(['name' => 'Gateway Operator']);
    $role->syncPermissions(['access admin panel', 'manage payment gateways']);

    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole($role);

    $this->actingAs($user)->get('/admin/payment-gateways')->assertOk();
    $this->actingAs($user)->post('/admin/payment-gateways/'.$gateway->id.'/activate')->assertForbidden();

    $role->givePermissionTo('activate payment gateways');
    $this->actingAs($user)->post('/admin/payment-gateways/'.$gateway->id.'/activate')->assertRedirect();
    expect($gateway->fresh()->is_enabled)->toBeTrue();
});

test('view users is enough to read the user list but not create users', function () {
    $role = Role::create(['name' => 'User Viewer']);
    $role->syncPermissions(['access admin panel', 'view users']);

    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole($role);

    $this->actingAs($user)->get('/admin/users')->assertOk();
    $this->actingAs($user)->get('/admin/users/create')->assertForbidden();
});
