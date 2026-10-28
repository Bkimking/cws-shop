<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\BarcodeService;
use Illuminate\Console\Command;

class BackfillBarcodes extends Command
{
    protected $signature = 'barcodes:backfill';

    protected $description = 'Generate missing category, product and variant barcodes';

    public function handle(BarcodeService $barcodes): int
    {
        $counts = ['categories' => 0, 'products' => 0, 'variants' => 0];

        Category::query()->whereNull('barcode')->each(function (Category $category) use ($barcodes, &$counts) {
            $barcodes->category($category);
            $counts['categories']++;
        });

        Product::query()->whereNull('barcode')->each(function (Product $product) use ($barcodes, &$counts) {
            $barcodes->product($product);
            $counts['products']++;
        });

        ProductVariant::query()->whereNull('barcode')->each(function (ProductVariant $variant) use ($barcodes, &$counts) {
            $barcodes->variant($variant);
            $counts['variants']++;
        });

        $this->info("Barcodes generated: {$counts['categories']} categories, {$counts['products']} products, {$counts['variants']} variants.");

        return self::SUCCESS;
    }
}
