<?php

use App\Models\Branch;
use App\Models\Category;
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
    $this->withoutVite();
    $this->withSession(['_token' => 'inventory-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'inventory-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::query()->firstOrFail();
    $this->user = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->user->forceFill(['email_verified_at' => now()])->save();
    $this->user->assignRole('Branch Admin');

    $category = Category::create(['name' => 'Inventory Test']);
    $product = Product::create([
        'category_id' => $category->id,
        'name' => 'Test Rice',
        'sku' => 'INV-RICE',
        'base_price' => 100,
        'is_active' => true,
    ]);
    $this->variant = ProductVariant::create([
        'product_id' => $product->id,
        'variant_name' => '1kg',
        'sku_suffix' => '-1KG',
        'price_delta' => 0,
    ]);

    $this->source = Warehouse::create(['branch_id' => $this->branch->id, 'name' => 'Source Store']);
    $this->destination = Warehouse::create(['branch_id' => $this->branch->id, 'name' => 'Destination Store']);
    $this->stock = StockLevel::create([
        'warehouse_id' => $this->source->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 20,
        'reorder_point' => 5,
    ]);
});

test('branch staff can transfer stock between warehouses', function () {
    $this->actingAs($this->user)->post('/admin/stock/transfer', [
        'from_warehouse_id' => $this->source->id,
        'to_warehouse_id' => $this->destination->id,
        'product_variant_id' => $this->variant->id,
        'quantity' => 6,
        'notes' => 'Shelf refill',
    ])->assertRedirect();

    expect($this->stock->fresh()->quantity_on_hand)->toBe(14)
        ->and(StockLevel::query()->where('warehouse_id', $this->destination->id)->value('quantity_on_hand'))->toBe(6);
});

test('receiving stock with a supplier records a purchase movement', function () {
    $this->actingAs($this->user)->post('/admin/stock/create-stock-level', [
        'warehouse_id' => $this->destination->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 12,
        'reorder_point' => 4,
        'supplier_name' => 'Mkulima Suppliers',
        'notes' => 'Delivery note 42',
    ])->assertRedirect();

    $this->assertDatabaseHas('stock_movements', [
        'warehouse_id' => $this->destination->id,
        'product_variant_id' => $this->variant->id,
        'type' => 'PURCHASE',
        'quantity' => 12,
    ]);
});
