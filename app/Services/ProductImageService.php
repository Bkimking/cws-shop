<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImageService
{
    /**
     * @param  array<int, UploadedFile>  $images
     */
    public function store(Product $product, array $images, ?int $primaryImageId = null): void
    {
        $hasPrimary = $product->images()->where('is_primary', true)->exists();

        foreach ($images as $index => $image) {
            $path = $image->storeAs(
                'products/'.$product->id,
                (string) Str::uuid().'.'.$image->getClientOriginalExtension(),
                'public',
            );

            $product->images()->create([
                'path' => $path,
                'alt_text' => $product->name,
                'sort_order' => (int) $product->images()->max('sort_order') + $index + 1,
                'is_primary' => ! $hasPrimary && $index === 0,
            ]);

            $hasPrimary = true;
        }

        if ($primaryImageId !== null) {
            $this->makePrimary($product, $primaryImageId);
        }
    }

    public function makePrimary(Product $product, int $imageId): void
    {
        $image = $product->images()->findOrFail($imageId);

        $product->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);
    }

    public function delete(ProductImage $image): void
    {
        $product = $image->product;
        $wasPrimary = $image->is_primary;

        Storage::disk('public')->delete($image->path);
        $image->delete();

        if ($wasPrimary) {
            $next = $product->images()->orderBy('sort_order')->first();

            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }
    }
}
