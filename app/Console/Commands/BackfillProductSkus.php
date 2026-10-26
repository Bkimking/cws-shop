<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\SkuGenerator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('products:backfill-skus')]
#[Description('Generate SKUs for existing products and variant suffixes for variants')]
class BackfillProductSkus extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $skuGenerator = new SkuGenerator;

        $this->info('Starting SKU backfill...');

        // Backfill product SKUs
        $products = Product::whereNull('sku')->orWhere('sku', '')->get();
        $productCount = $products->count();

        if ($productCount === 0) {
            $this->info('No products without SKUs found.');
        } else {
            $this->info("Found {$productCount} products without SKUs.");

            $bar = $this->output->createProgressBar($productCount);
            $bar->start();

            foreach ($products as $product) {
                $sku = $skuGenerator->generateProductSku(
                    $product->category_id,
                    $product->name,
                    $product->id
                );

                $product->sku = $sku;
                $product->save();

                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
            $this->info("Successfully generated SKUs for {$productCount} products.");
        }

        // Backfill variant SKU suffixes
        $variants = ProductVariant::whereNull('sku_suffix')->orWhere('sku_suffix', '')->get();
        $variantCount = $variants->count();

        if ($variantCount === 0) {
            $this->info('No variants without SKU suffixes found.');
        } else {
            $this->info("Found {$variantCount} variants without SKU suffixes.");

            $bar = $this->output->createProgressBar($variantCount);
            $bar->start();

            foreach ($variants as $variant) {
                $suffix = $skuGenerator->generateVariantSuffix($variant->variant_name);

                $variant->sku_suffix = $suffix;
                $variant->save();

                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
            $this->info("Successfully generated SKU suffixes for {$variantCount} variants.");
        }

        $this->info('SKU backfill completed successfully!');

        return Command::SUCCESS;
    }
}
