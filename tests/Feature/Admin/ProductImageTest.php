<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'image-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'image-test-token');
    Storage::fake('public');

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

    $this->category = Category::create(['name' => 'Image Category']);
});

test('a product image can be uploaded and appears in the public catalog', function () {
    $this->actingAs($this->user)->post('/admin/products', [
        'category_id' => $this->category->id,
        'name' => 'Image Product',
        'sku' => 'IMG-1',
        'base_price' => 250,
        'is_active' => true,
        'variants' => [
            ['variant_name' => 'Default', 'sku_suffix' => '-D', 'price_delta' => 0],
        ],
        'images' => [UploadedFile::fake()->image('product.jpg', 640, 640)],
    ])->assertRedirect();

    $product = Product::query()->where('sku', 'IMG-1')->firstOrFail();
    $image = ProductImage::query()->where('product_id', $product->id)->firstOrFail();

    expect($image->is_primary)->toBeTrue();
    Storage::disk('public')->assertExists($image->path);

    $this->get('/shop/product/'.$product->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('product.image_url', $image->url));
});
