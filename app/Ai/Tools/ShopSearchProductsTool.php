<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Services\ShopCatalogService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopSearchProductsTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Searches the shop catalog for products. Returns variant IDs, prices and availability labels.';
    }

    public function handle(Request $request): string
    {
        $search = trim((string) ($request['query'] ?? ''));
        $limit = max(1, min(12, (int) ($request['limit'] ?? 6)));

        $products = app(ShopCatalogService::class)->products($this->branch)
            ->when($search !== '', fn ($items) => $items->filter(
                fn (array $product) => str_contains(strtolower($product['name']), strtolower($search))
                    || str_contains(strtolower((string) $product['category']), strtolower($search))
                    || str_contains(strtolower((string) $product['sku']), strtolower($search))
            ))
            ->take($limit)
            ->values();

        $rows = $products->map(function (array $product) {
            /** @var Collection<int, array<string, mixed>> $variants */
            $variants = $product['variants'];
            $variant = $variants->firstWhere('available', true);

            return [
                'product_id' => $product['id'],
                'variant_id' => $variant['id'] ?? null,
                'name' => $product['name'],
                'variant' => $variant['name'] ?? null,
                'price' => $variant['price'] ?? $product['price'],
                'currency' => $product['currency'],
                'availability' => $variant !== null ? 'In stock' : 'Out of stock',
            ];
        })->all();

        return ShopToolResult::make(
            $this->branch,
            $search !== ''
                ? 'Products matching “'.$search.'”.'
                : 'Products available at '.$this->branch->name.'.',
            $rows,
            [
                ['key' => 'name', 'label' => 'Product'],
                ['key' => 'price', 'label' => 'Price'],
                ['key' => 'availability', 'label' => 'Availability'],
            ],
            [['label' => 'Shop', 'url' => route('shop.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema->string()->description('Product name, category or SKU.'),
            'limit' => $schema->integer()->min(1)->max(12)->description('Maximum results, default 6.'),
        ];
    }
}
