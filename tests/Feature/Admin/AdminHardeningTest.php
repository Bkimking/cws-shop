<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentGatewayConfig;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'admin-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'admin-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
    ]);

    $this->region = Region::firstOrFail();
    $this->branch = Branch::firstOrFail();

    $this->superadmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->superadmin->forceFill(['email_verified_at' => now()])->save();
    $this->superadmin->assignRole('Superadmin');

    $this->branchAdmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->branchAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->branchAdmin->assignRole('Branch Admin');

    $this->regionAdmin = User::factory()->create([
        'region_id' => $this->region->id,
        'branch_id' => null,
    ]);
    $this->regionAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->regionAdmin->assignRole('Region Admin');

    $category = Category::create(['name' => 'Hardening Category']);

    $this->product = Product::create([
        'category_id' => $category->id,
        'name' => 'Hardening Product',
        'sku' => 'HARD-1',
        'base_price' => 100,
        'is_active' => true,
    ]);

    $this->variant = ProductVariant::create([
        'product_id' => $this->product->id,
        'variant_name' => 'Default',
        'sku_suffix' => '-D',
        'price_delta' => 0,
    ]);

    $this->warehouse = Warehouse::create([
        'branch_id' => $this->branch->id,
        'name' => 'Hardening Store',
    ]);

    $this->stock = StockLevel::create([
        'warehouse_id' => $this->warehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 10,
        'reorder_point' => 2,
    ]);
});

function secondBranch(Region $region): Branch
{
    return Branch::create([
        'region_id' => $region->id,
        'name' => 'Second Branch',
        'slug' => 'second-branch',
        'address' => 'Second address',
        'phone' => '+254700000001',
        'is_active' => true,
    ]);
}

test('admin order creation decrements stock and refund restocks it', function () {
    $response = $this->actingAs($this->superadmin)->post(route('admin.orders.store'), [
        'branch_id' => $this->branch->id,
        'customer_id' => null,
        'source' => 'pos',
        'status' => 'completed',
        'items' => [
            [
                'product_variant_id' => $this->variant->id,
                'quantity' => 2,
                'unit_price' => 100,
                'discount' => 0,
            ],
        ],
        'subtotal' => 200,
        'tax' => 0,
        'total' => 200,
        'currency_code' => 'KES',
        'payments' => [['gateway' => 'cash', 'amount' => 200]],
    ]);

    $response->assertRedirect();

    $order = Order::query()->latest('id')->firstOrFail();

    expect($this->stock->fresh()->quantity_on_hand)->toBe(8);

    $this->assertDatabaseHas('stock_movements', [
        'reference_id' => (string) $order->id,
        'type' => 'SALE',
        'quantity' => -2,
    ]);

    $this->actingAs($this->superadmin)
        ->post(route('admin.orders.refund', $order))
        ->assertRedirect();

    expect($this->stock->fresh()->quantity_on_hand)->toBe(10);

    $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
    $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'refunded']);
    $this->assertDatabaseHas('stock_movements', [
        'reference_id' => (string) $order->id,
        'type' => 'RETURN',
        'quantity' => 2,
    ]);
});

test('updating a completed order reconciles the stock movements', function () {
    $this->actingAs($this->superadmin)->post(route('admin.orders.store'), [
        'branch_id' => $this->branch->id,
        'customer_id' => null,
        'source' => 'pos',
        'status' => 'completed',
        'items' => [
            [
                'product_variant_id' => $this->variant->id,
                'quantity' => 2,
                'unit_price' => 100,
                'discount' => 0,
            ],
        ],
        'subtotal' => 200,
        'tax' => 0,
        'total' => 200,
        'currency_code' => 'KES',
        'payments' => [['gateway' => 'cash', 'amount' => 200]],
    ])->assertRedirect();

    $order = Order::query()->latest('id')->firstOrFail();

    expect($this->stock->fresh()->quantity_on_hand)->toBe(8);

    $this->actingAs($this->superadmin)->put(route('admin.orders.update', $order), [
        'status' => 'completed',
        'items' => [
            [
                'product_variant_id' => $this->variant->id,
                'quantity' => 4,
                'unit_price' => 100,
                'discount' => 0,
            ],
        ],
        'subtotal' => 400,
        'tax' => 0,
        'total' => 400,
    ])->assertRedirect();

    expect($this->stock->fresh()->quantity_on_hand)->toBe(6);

    $this->assertDatabaseHas('stock_movements', [
        'reference_id' => (string) $order->id,
        'type' => 'RETURN',
        'quantity' => 2,
    ]);

    $this->assertDatabaseHas('stock_movements', [
        'reference_id' => (string) $order->id,
        'type' => 'SALE',
        'quantity' => -4,
    ]);
});

test('branch admin only sees orders from their own branch', function () {
    $otherBranch = secondBranch($this->region);

    $ownOrder = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => 'completed',
    ]);

    $otherOrder = Order::factory()->create([
        'branch_id' => $otherBranch->id,
        'status' => 'completed',
    ]);

    $page = $this->actingAs($this->branchAdmin)
        ->get('/admin/orders')
        ->viewData('page');

    $ids = collect($page['props']['orders']['data'])->pluck('id');

    expect($ids)->toContain($ownOrder->id)
        ->not->toContain($otherOrder->id);
});

test('branch admin dashboard is scoped to their branch', function () {
    $otherBranch = secondBranch($this->region);

    Order::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => 'completed',
        'total' => 100,
    ]);

    Order::factory()->create([
        'branch_id' => $otherBranch->id,
        'status' => 'completed',
        'total' => 500,
    ]);

    $page = $this->actingAs($this->branchAdmin)
        ->get('/admin')
        ->viewData('page');

    expect((float) $page['props']['metrics']['total_sales_today'])->toBe(100.0)
        ->and(collect($page['props']['branches'])->pluck('id')->all())->toBe([$this->branch->id])
        ->and($page['props']['metrics']['active_branches'])->toBe(1);
});

test('branch admin cannot create a superadmin or move a user to another branch', function () {
    $this->actingAs($this->branchAdmin)->post(route('admin.users.store'), [
        'name' => 'Escalated User',
        'email' => 'escalated@example.com',
        'password' => 'password123',
        'role' => 'Superadmin',
        'branch_id' => $this->branch->id,
        'region_id' => $this->region->id,
    ])->assertSessionHasErrors('role');

    $this->assertDatabaseMissing('users', ['email' => 'escalated@example.com']);

    $otherBranch = secondBranch($this->region);

    $this->actingAs($this->branchAdmin)->post(route('admin.users.store'), [
        'name' => 'Cross Branch User',
        'email' => 'cross-branch@example.com',
        'password' => 'password123',
        'role' => 'Cashier',
        'branch_id' => $otherBranch->id,
        'region_id' => $this->region->id,
    ])->assertSessionHasErrors('branch_id');

    $this->assertDatabaseMissing('users', ['email' => 'cross-branch@example.com']);
});

test('superadmin cannot demote themselves out of the superadmin role', function () {
    $this->actingAs($this->superadmin)->put(route('admin.users.update', $this->superadmin), [
        'name' => $this->superadmin->name,
        'email' => $this->superadmin->email,
        'role' => 'Cashier',
        'branch_id' => $this->branch->id,
        'region_id' => $this->region->id,
    ])->assertSessionHasErrors('role');

    expect($this->superadmin->fresh()->hasRole('Superadmin'))->toBeTrue();
});

test('branch admin cannot transfer stock from another branch warehouse', function () {
    $otherBranch = secondBranch($this->region);
    $otherWarehouse = Warehouse::create([
        'branch_id' => $otherBranch->id,
        'name' => 'Other Store',
    ]);
    $otherStock = StockLevel::create([
        'warehouse_id' => $otherWarehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 10,
        'reorder_point' => 1,
    ]);

    $this->actingAs($this->branchAdmin)->post(route('admin.stock.transfer'), [
        'from_warehouse_id' => $otherWarehouse->id,
        'to_warehouse_id' => $this->warehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity' => 5,
        'notes' => 'Should not be allowed',
    ])->assertForbidden();

    expect($otherStock->fresh()->quantity_on_hand)->toBe(10);
});

test('removing a variant with stock history is blocked', function () {
    $this->actingAs($this->superadmin)->put(route('admin.products.update', $this->product), [
        'category_id' => $this->product->category_id,
        'name' => $this->product->name,
        'sku' => $this->product->sku,
        'description' => null,
        'base_price' => 100,
        'is_active' => true,
        'variants' => [],
        'region_prices' => [],
    ])->assertSessionHasErrors('variants');

    $this->assertDatabaseHas('product_variants', ['id' => $this->variant->id]);
});

test('payment gateway edit and update hydrate the bound model', function () {
    $gateway = PaymentGatewayConfig::create([
        'region_id' => $this->region->id,
        'gateway' => 'mpesa',
        'is_enabled' => true,
        'encrypted_credentials' => [],
    ]);

    $page = $this->actingAs($this->superadmin)
        ->get(route('admin.payment-gateways.edit', $gateway))
        ->viewData('page');

    expect($page['props']['gateway']['id'])->toBe($gateway->id);

    $this->actingAs($this->superadmin)->put(route('admin.payment-gateways.update', $gateway), [
        'region_id' => $this->region->id,
        'gateway' => 'cash',
        'is_enabled' => false,
        'encrypted_credentials' => [],
    ])->assertRedirect();

    expect($gateway->fresh()->gateway)->toBe('cash')
        ->and($gateway->fresh()->is_enabled)->toBeFalse();
});

test('region admin only sees and edits gateways in their region', function () {
    $gateway = PaymentGatewayConfig::create([
        'region_id' => $this->region->id,
        'gateway' => 'mpesa',
        'is_enabled' => true,
        'encrypted_credentials' => [],
    ]);

    $otherRegion = Region::create([
        'name' => 'Other Region',
        'slug' => 'other-region',
        'country_code' => 'UG',
        'currency_code' => 'UGX',
        'tax_rate' => 18,
        'timezone' => 'Africa/Kampala',
        'is_active' => true,
    ]);

    $otherGateway = PaymentGatewayConfig::create([
        'region_id' => $otherRegion->id,
        'gateway' => 'paypal',
        'is_enabled' => true,
        'encrypted_credentials' => [],
    ]);

    $page = $this->actingAs($this->regionAdmin)
        ->get(route('admin.payment-gateways.index'))
        ->viewData('page');

    $ids = collect($page['props']['gateways'])->pluck('id');

    expect($ids)->toContain($gateway->id)
        ->not->toContain($otherGateway->id);

    $this->actingAs($this->regionAdmin)->post(route('admin.payment-gateways.store'), [
        'region_id' => $otherRegion->id,
        'gateway' => 'cash',
        'is_enabled' => true,
        'encrypted_credentials' => [],
    ])->assertSessionHasErrors('region_id');

    $this->actingAs($this->regionAdmin)->post(route('admin.branches.store'), [
        'region_id' => $otherRegion->id,
        'name' => 'Cross Region Branch',
        'address' => 'Cross address',
        'phone' => '+254700000002',
        'is_active' => true,
    ])->assertSessionHasErrors('region_id');
});
