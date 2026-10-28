<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;

class BarcodeService
{
    public function category(Category $category): string
    {
        return $this->ensure($category, 'CAT');
    }

    public function product(Product $product): string
    {
        return $this->ensure($product, 'PRD');
    }

    public function variant(ProductVariant $variant): string
    {
        return $this->ensure($variant, 'VAR');
    }

    public function valueFor(string $type, int $id): string
    {
        return 'CWS'.strtoupper($type).str_pad((string) $id, 7, '0', STR_PAD_LEFT);
    }

    private function ensure(Category|Product|ProductVariant $model, string $prefix): string
    {
        if (filled($model->barcode)) {
            return (string) $model->barcode;
        }

        $barcode = $this->valueFor($prefix, $model->id);
        $model->forceFill(['barcode' => $barcode])->save();

        return $barcode;
    }
}
