<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockLevel;
use App\Models\TillSession;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'pos-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'pos-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::firstOrFail();

    $this->cashier = User::factory()->create([
        'branch_id' => $this->branch->id,
    ]);
    $this->cashier->forceFill(['email_verified_at' => now()])->save();
    $this->cashier->assignRole('Cashier');

    $category = Category::create(['name' => 'Test Category']);

    $this->product = Product::create([
        'category_id' => $category->id,
        'name' => 'Test Milk',
        'sku' => 'TEST-MILK',
        'base_price' => 100,
        'is_active' => true,
    ]);

    $this->variant = ProductVariant::create([
        'product_id' => $this->product->id,
        'variant_name' => '1L',
        'sku_suffix' => '-1L',
        'price_delta' => 0,
    ]);

    $warehouse = Warehouse::create([
        'branch_id' => $this->branch->id,
        'name' => 'Test Store',
    ]);

    $this->stock = StockLevel::create([
        'warehouse_id' => $warehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 10,
        'reorder_point' => 2,
    ]);
});

function openTillForCashier($test): TillSession
{
    $test->actingAs($test->cashier)
        ->post('/pos/till/open', ['opening_cash' => 1000])
        ->assertRedirect();

    return TillSession::query()
        ->where('branch_id', $test->branch->id)
        ->where('status', 'OPEN')
        ->firstOrFail();
}

test('cashier can open the till and complete a cash sale', function () {
    $till = openTillForCashier($this);

    $response = $this->actingAs($this->cashier)->postJson('/pos/sales', [
        'items' => [
            ['product_variant_id' => $this->variant->id, 'quantity' => 2],
        ],
        'tendered' => 500,
    ]);

    $response->assertCreated()
        ->assertJsonPath('order.total', 200)
        ->assertJsonPath('order.payment.change', 300);

    $order = Order::query()->where('till_session_id', $till->id)->firstOrFail();

    expect($order->status)->toBe('completed')
        ->and($order->customer_id)->toBeNull()
        ->and((float) $order->total)->toBe(200.0)
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(8);

    $this->assertDatabaseHas('order_items', [
        'order_id' => $order->id,
        'product_variant_id' => $this->variant->id,
        'quantity' => 2,
    ]);

    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'gateway' => 'cash',
        'status' => 'completed',
    ]);

    $this->assertDatabaseHas('stock_movements', [
        'reference_id' => (string) $order->id,
        'type' => 'SALE',
        'quantity' => -2,
    ]);
});

test('a sale is rejected while the till is closed', function () {
    $this->actingAs($this->cashier)
        ->postJson('/pos/sales', [
            'items' => [
                ['product_variant_id' => $this->variant->id, 'quantity' => 1],
            ],
            'tendered' => 500,
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Till is closed. Open the till to sell.');

    expect(Order::query()->count())->toBe(0);
});

test('a sale cannot exceed available stock', function () {
    openTillForCashier($this);

    $this->actingAs($this->cashier)
        ->postJson('/pos/sales', [
            'items' => [
                ['product_variant_id' => $this->variant->id, 'quantity' => 11],
            ],
            'tendered' => 2000,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items');

    expect(Order::query()->count())->toBe(0)
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(10);
});

test('a sale cannot be completed for less than the total', function () {
    openTillForCashier($this);

    $this->actingAs($this->cashier)
        ->postJson('/pos/sales', [
            'items' => [
                ['product_variant_id' => $this->variant->id, 'quantity' => 1],
            ],
            'tendered' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('tendered');

    expect(Order::query()->count())->toBe(0);
});

test('closing the till records the expected cash and requires a variance reason', function () {
    $till = openTillForCashier($this);

    $this->actingAs($this->cashier)->postJson('/pos/sales', [
        'items' => [
            ['product_variant_id' => $this->variant->id, 'quantity' => 1],
        ],
        'tendered' => 200,
    ]);

    // Expected = 1000 opening + 100 cash sale.
    $this->actingAs($this->cashier)
        ->post('/pos/till/close', ['closing_cash' => 1050])
        ->assertSessionHasErrors('variance_reason');

    expect($till->fresh()->status)->toBe('OPEN');

    $this->actingAs($this->cashier)
        ->post('/pos/till/close', [
            'closing_cash' => 1050,
            'variance_reason' => 'Test variance',
        ])
        ->assertSessionHas('z_report');

    $till->refresh();
    $report = session('z_report');

    expect($till->status)->toBe('CLOSED')
        ->and((float) $till->closing_cash)->toBe(1050.0)
        ->and($till->variance_reason)->toBe('Test variance')
        ->and((float) $report['expected_cash'])->toBe(1100.0)
        ->and((float) $report['variance'])->toBe(-50.0);
});

test('a cashier cannot open the back-office', function () {
    $this->actingAs($this->cashier)
        ->get('/admin')
        ->assertForbidden();
});

test('a cashier login lands on the terminal', function () {
    $this->post('/login', [
        'email' => $this->cashier->email,
        'password' => 'password',
    ])->assertRedirect('/pos');
});

test('the POS page receives the open till state', function () {
    $this->actingAs($this->cashier)->post('/pos/till/open', ['opening_cash' => 250])->assertRedirect();

    $this->actingAs($this->cashier)
        ->get('/pos')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('till.status', 'OPEN')
            ->where('till.opening_cash', 250));
});
