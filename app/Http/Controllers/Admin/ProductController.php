<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductRegionPrice;
use App\Models\ProductVariant;
use App\Models\Region;
use App\Services\ProductImageService;
use App\Services\SkuGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Product::class);

        $query = Product::with([
            'category:id,name',
            'variants:id,product_id,variant_name,price_delta',
            'images:id,product_id,path,alt_text,sort_order,is_primary',
            'regionPrices:id,product_id,region_id,price_override',
            'regionPrices.region:id,name',
        ])->withCount('variants');

        return Inertia::render('admin/products/index', [
            'products' => $query->latest()->paginate(20),
            'categories' => Category::all(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Product::class);

        return Inertia::render('admin/products/add', [
            'categories' => Category::all(['id', 'name']),
            'regions' => Region::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Product::class);

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100|unique:products,sku',
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'images' => 'array',
            'images.*' => 'image|max:5120',
            'variants' => 'array',
            'variants.*.variant_name' => 'required|string|max:255',
            'variants.*.sku_suffix' => 'nullable|string|max:50',
            'variants.*.price_delta' => 'nullable|numeric',
            'region_prices' => 'array',
            'region_prices.*.region_id' => 'required|exists:regions,id',
            'region_prices.*.price_override' => 'nullable|numeric|min:0',
        ]);

        $skuGenerator = new SkuGenerator;

        // Auto-generate SKU if not provided
        $sku = $validated['sku'] ?? null;
        if (empty($sku)) {
            $sku = $skuGenerator->generateProductSku(
                (int) $validated['category_id'],
                $validated['name'],
                null
            );
        }

        $product = Product::create([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'sku' => $sku,
            'description' => $validated['description'] ?? null,
            'base_price' => $validated['base_price'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Update SKU with actual product ID
        if (empty($validated['sku'])) {
            $product->sku = $skuGenerator->generateProductSku(
                (int) $validated['category_id'],
                $validated['name'],
                $product->id
            );
            $product->save();
        }

        // Create variants
        if (isset($validated['variants']) && is_array($validated['variants'])) {
            foreach ($validated['variants'] as $variant) {
                $skuSuffix = $variant['sku_suffix'] ?? null;
                if (empty($skuSuffix) && ! empty($variant['variant_name'])) {
                    $skuSuffix = $skuGenerator->generateVariantSuffix($variant['variant_name']);
                }

                ProductVariant::create([
                    'product_id' => $product->id,
                    'variant_name' => $variant['variant_name'],
                    'sku_suffix' => $skuSuffix,
                    'price_delta' => $variant['price_delta'] ?? 0,
                ]);
            }
        }

        // Create region prices
        if (isset($validated['region_prices']) && is_array($validated['region_prices'])) {
            foreach ($validated['region_prices'] as $regionPrice) {
                ProductRegionPrice::create([
                    'product_id' => $product->id,
                    'region_id' => $regionPrice['region_id'],
                    'price_override' => $regionPrice['price_override'] ?? null,
                ]);
            }
        }

        if ($request->hasFile('images')) {
            app(ProductImageService::class)->store($product, $request->file('images', []));
        }

        ToastHelper::success('Product created successfully!');

        return redirect()->route('admin.products.index');
    }

    public function edit(Product $product): Response
    {
        $this->authorize('view', $product);

        $product->load([
            'category:id,name',
            'variants',
            'images',
            'regionPrices',
            'regionPrices.region:id,name',
        ]);

        return Inertia::render('admin/products/edit', [
            'product' => $product,
            'categories' => Category::all(['id', 'name']),
            'regions' => Region::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorize('update', $product);

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100|unique:products,sku,'.$product->id,
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'images' => 'array',
            'images.*' => 'image|max:5120',
            'primary_image_id' => 'nullable|integer',
            'variants' => 'array',
            'variants.*.id' => 'nullable|exists:product_variants,id',
            'variants.*.variant_name' => 'required|string|max:255',
            'variants.*.sku_suffix' => 'nullable|string|max:50',
            'variants.*.price_delta' => 'nullable|numeric',
            'region_prices' => 'array',
            'region_prices.*.id' => 'nullable|exists:product_region_prices,id',
            'region_prices.*.region_id' => 'required|exists:regions,id',
            'region_prices.*.price_override' => 'nullable|numeric|min:0',
        ]);

        // Never silently cascade-delete sales or stock history when a variant
        // is removed from the form. Block the update instead.
        if (array_key_exists('variants', $validated) && is_array($validated['variants'])) {
            $submittedVariantIds = collect($validated['variants'])
                ->pluck('id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->all();

            $blockedVariants = $product->variants()
                ->whereNotIn('id', $submittedVariantIds)
                ->where(function ($query) {
                    $query->whereHas('orderItems')
                        ->orWhereHas('stockLevels')
                        ->orWhereHas('stockMovements')
                        ->orWhereHas('cartItems');
                })
                ->get();

            if ($blockedVariants->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'variants' => 'Cannot remove variants with sales or stock history: '
                        .$blockedVariants->pluck('variant_name')->join(', ').'.',
                ]);
            }
        }

        $skuGenerator = new SkuGenerator;

        // Auto-generate SKU if not provided
        $sku = $validated['sku'] ?? $product->sku;
        if (empty($validated['sku'])) {
            $sku = $skuGenerator->generateProductSku(
                (int) $validated['category_id'],
                $validated['name'],
                $product->id
            );
        }

        $product->update([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'sku' => $sku,
            'description' => $validated['description'] ?? null,
            'base_price' => $validated['base_price'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Sync variants
        if (isset($validated['variants']) && is_array($validated['variants'])) {
            $existingVariantIds = [];
            foreach ($validated['variants'] as $variant) {
                $skuSuffix = $variant['sku_suffix'] ?? null;
                if (empty($skuSuffix) && ! empty($variant['variant_name'])) {
                    $skuSuffix = $skuGenerator->generateVariantSuffix($variant['variant_name']);
                }

                if (isset($variant['id'])) {
                    if (! $product->variants()->whereKey($variant['id'])->exists()) {
                        throw ValidationException::withMessages([
                            'variants' => 'One of the submitted variants does not belong to this product.',
                        ]);
                    }

                    $existingVariantIds[] = $variant['id'];
                    ProductVariant::where('id', $variant['id'])->update([
                        'variant_name' => $variant['variant_name'],
                        'sku_suffix' => $skuSuffix,
                        'price_delta' => $variant['price_delta'] ?? 0,
                    ]);
                } else {
                    $newVariant = ProductVariant::create([
                        'product_id' => $product->id,
                        'variant_name' => $variant['variant_name'],
                        'sku_suffix' => $skuSuffix,
                        'price_delta' => $variant['price_delta'] ?? 0,
                    ]);
                    $existingVariantIds[] = $newVariant->id;
                }
            }
            // Delete variants not in the updated list
            $product->variants()->whereNotIn('id', $existingVariantIds)->delete();
        }

        // Sync region prices
        if (isset($validated['region_prices']) && is_array($validated['region_prices'])) {
            $existingPriceIds = [];
            foreach ($validated['region_prices'] as $regionPrice) {
                if (isset($regionPrice['id'])) {
                    if (! $product->regionPrices()->whereKey($regionPrice['id'])->exists()) {
                        throw ValidationException::withMessages([
                            'region_prices' => 'One of the submitted region prices does not belong to this product.',
                        ]);
                    }

                    $existingPriceIds[] = $regionPrice['id'];
                    ProductRegionPrice::where('id', $regionPrice['id'])->update([
                        'region_id' => $regionPrice['region_id'],
                        'price_override' => $regionPrice['price_override'] ?? null,
                    ]);
                } else {
                    $newPrice = ProductRegionPrice::create([
                        'product_id' => $product->id,
                        'region_id' => $regionPrice['region_id'],
                        'price_override' => $regionPrice['price_override'] ?? null,
                    ]);
                    $existingPriceIds[] = $newPrice->id;
                }
            }
            // Delete region prices not in the updated list
            $product->regionPrices()->whereNotIn('id', $existingPriceIds)->delete();
        }

        if ($request->hasFile('images')) {
            app(ProductImageService::class)->store(
                $product,
                $request->file('images', []),
                $validated['primary_image_id'] ?? null,
            );
        } elseif (isset($validated['primary_image_id'])) {
            app(ProductImageService::class)->makePrimary($product, (int) $validated['primary_image_id']);
        }

        ToastHelper::success('Product updated successfully!');

        return redirect()->route('admin.products.index');
    }

    public function removeImage(Product $product, ProductImage $image): RedirectResponse
    {
        $this->authorize('update', $product);
        abort_unless((int) $image->product_id === (int) $product->id, 404);

        app(ProductImageService::class)->delete($image);

        ToastHelper::success('Product image removed.');

        return back();
    }

    public function primaryImage(Product $product, ProductImage $image): RedirectResponse
    {
        $this->authorize('update', $product);
        abort_unless((int) $image->product_id === (int) $product->id, 404);

        app(ProductImageService::class)->makePrimary($product, $image->id);

        ToastHelper::success('Primary product image updated.');

        return back();
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->authorize('delete', $product);

        // Check if product has active orders
        $hasActiveOrders = $product->orderItems()
            ->whereHas('order', fn ($q) => $q->whereIn('status', ['pending', 'processing', 'completed']))
            ->exists();

        if ($hasActiveOrders) {
            ToastHelper::error('Cannot deactivate product with active orders.');

            return redirect()->route('admin.products.index');
        }

        $product->update(['is_active' => false]);

        ToastHelper::success('Product deactivated successfully!');

        return redirect()->route('admin.products.index');
    }

    public function reactivate(Product $product): RedirectResponse
    {
        $this->authorize('delete', $product);

        $product->update(['is_active' => true]);

        ToastHelper::success('Product reactivated successfully!');

        return redirect()->route('admin.products.index');
    }

    public function generateSku(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'product_id' => 'nullable|exists:products,id',
        ]);

        $skuGenerator = new SkuGenerator;
        $sku = $skuGenerator->generateProductSku(
            (int) $validated['category_id'],
            $validated['name'],
            $validated['product_id'] ? (int) $validated['product_id'] : null
        );

        return response()->json(['sku' => $sku]);
    }
}
