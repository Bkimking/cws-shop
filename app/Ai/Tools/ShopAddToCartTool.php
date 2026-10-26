<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Services\ShopCartService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopAddToCartTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Adds a variant to the visitor’s cart. Use a variant_id returned by search products.';
    }

    public function handle(Request $request): string
    {
        $validated = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $cart = app(ShopCartService::class);
        $cart->add((int) $validated['variant_id'], (int) ($validated['quantity'] ?? 1), $this->branch);
        $lines = $cart->lines($this->branch);

        return ShopToolResult::make(
            $this->branch,
            'Added to your cart.',
            collect($lines)->map(fn (array $line) => [
                'name' => $line['name'],
                'variant' => $line['variant'],
                'quantity' => $line['quantity'],
                'price' => $line['line_total'],
            ])->all(),
            [
                ['key' => 'name', 'label' => 'Item'],
                ['key' => 'quantity', 'label' => 'Qty'],
                ['key' => 'price', 'label' => 'Total'],
            ],
            [['label' => 'Cart', 'url' => route('shop.cart')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'variant_id' => $schema->integer()->min(1)->description('Variant ID from search_products.')->required(),
            'quantity' => $schema->integer()->min(1)->max(20)->description('Quantity, default 1.'),
        ];
    }
}
