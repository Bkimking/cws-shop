<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Services\ShopCartService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopViewCartTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Shows the visitor’s current cart, quantities and total.';
    }

    public function handle(Request $request): string
    {
        $lines = app(ShopCartService::class)->lines($this->branch);
        $total = array_sum(array_column($lines, 'line_total'));

        return ShopToolResult::make(
            $this->branch,
            $lines === [] ? 'Your cart is empty.' : 'Your cart total is '.$this->branch->region->currency_code.' '.number_format($total, 2).'.',
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
        return [];
    }
}
