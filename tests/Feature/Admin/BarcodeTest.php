<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\BarcodeService;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
    ]);
});

test('categories, products and variants receive scannable barcodes automatically', function () {
    $category = Category::create(['name' => 'Barcode category']);
    $product = Product::create([
        'category_id' => $category->id,
        'name' => 'Barcode product',
        'sku' => 'BAR-001',
        'base_price' => 10,
        'is_active' => true,
    ]);
    $variant = ProductVariant::create([
        'product_id' => $product->id,
        'variant_name' => 'Default',
        'sku_suffix' => '-D',
        'price_delta' => 0,
    ]);

    expect($category->fresh()->barcode)->toStartWith('CWSCAT')
        ->and($product->fresh()->barcode)->toStartWith('CWSPRD')
        ->and($variant->fresh()->barcode)->toStartWith('CWSVAR');

    $service = app(BarcodeService::class);
    expect($service->product($product->fresh()))->toBe($product->fresh()->barcode);
});

test('the barcode backfill command fills missing catalog barcodes', function () {
    $category = Category::create(['name' => 'Backfill category']);
    $category->forceFill(['barcode' => null])->save();
    $product = Product::create([
        'category_id' => $category->id,
        'name' => 'Backfill product',
        'sku' => 'BACK-001',
        'base_price' => 10,
        'is_active' => true,
    ]);
    $product->forceFill(['barcode' => null])->save();

    $this->artisan('barcodes:backfill')->assertSuccessful();

    expect($category->fresh()->barcode)->not->toBeNull()
        ->and($product->fresh()->barcode)->not->toBeNull();
});
