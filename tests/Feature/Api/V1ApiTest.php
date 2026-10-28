<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockLevel;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::query()->firstOrFail();
    $this->user = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->user->assignRole('Branch Admin');

    $category = Category::create(['name' => 'API Category']);
    $this->product = Product::create([
        'category_id' => $category->id,
        'name' => 'API Rice',
        'sku' => 'API-RICE',
        'base_price' => 200,
        'is_active' => true,
    ]);
    $this->variant = ProductVariant::create([
        'product_id' => $this->product->id,
        'variant_name' => '1kg',
        'sku_suffix' => '-1KG',
        'price_delta' => 0,
    ]);
    $warehouse = Warehouse::create(['branch_id' => $this->branch->id, 'name' => 'API Store']);
    StockLevel::create([
        'warehouse_id' => $warehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 30,
        'reorder_point' => 5,
    ]);
});

test('a POS user can log in with a Sanctum token and call me', function () {
    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $this->user->email,
        'password' => 'password',
        'device_name' => 'Test Windows POS',
    ])->assertOk();

    $token = $login->json('data.token');
    expect($token)->not->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.user.email', $this->user->email)
        ->assertJsonPath('data.branch.id', $this->branch->id);

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/auth/logout')
        ->assertOk();

    expect($this->user->tokens()->count())->toBe(0);

    $this->app['auth']->forgetGuards();

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

test('catalog and bootstrap return terminal data', function () {
    $token = $this->postJson('/api/v1/auth/login', [
        'email' => $this->user->email,
        'password' => 'password',
    ])->json('data.token');

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/catalog/products')
        ->assertOk()
        ->assertJsonPath('data.products.0.name', 'API Rice')
        ->assertJsonPath('data.products.0.variants.0.id', $this->variant->id);

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/bootstrap')
        ->assertOk()
        ->assertJsonPath('data.branch.id', $this->branch->id)
        ->assertJsonPath('data.products.0.name', 'API Rice');
});

test('a cashier can open a till and create a cash order through the API', function () {
    $cashier = User::factory()->create(['branch_id' => $this->branch->id]);
    $cashier->assignRole('Cashier');

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => $cashier->email,
        'password' => 'password',
    ])->json('data.token');

    $headers = ['Authorization' => 'Bearer '.$token];

    $this->withHeaders($headers)
        ->postJson('/api/v1/till/open', ['opening_cash' => 1000])
        ->assertCreated();

    $this->withHeaders($headers)
        ->postJson('/api/v1/orders', [
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 2]],
            'tendered' => 500,
            'payment_method' => 'cash',
        ])
        ->assertCreated()
        ->assertJsonPath('data.order.total', 400);

    expect(Order::query()->where('branch_id', $this->branch->id)->count())->toBe(1);

    $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-sale-1'])
        ->postJson('/api/v1/orders', [
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 1]],
            'tendered' => 200,
            'payment_method' => 'cash',
        ])->assertCreated();

    $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-sale-1'])
        ->postJson('/api/v1/orders', [
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 1]],
            'tendered' => 200,
            'payment_method' => 'cash',
        ])->assertCreated();

    expect(Order::query()->where('branch_id', $this->branch->id)->count())->toBe(2);
});
