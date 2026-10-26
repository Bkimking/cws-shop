<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Models\Warehouse;
use App\Services\ShopCartService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Session;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopCheckoutTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Returns the checkout link for the current cart. Payment is completed on the checkout page, never in chat.';
    }

    public function handle(Request $request): string
    {
        $lines = app(ShopCartService::class)->lines($this->branch);
        $pickup = Warehouse::query()
            ->where('branch_id', $this->branch->id)
            ->find((int) Session::get('shop_pickup_warehouse_id', 0));

        return ShopToolResult::make(
            $this->branch,
            $lines === []
                ? 'Your cart is empty. Add something first.'
                : 'Ready for checkout. Open the checkout page to enter your phone and pay with M-Pesa.',
            [[
                'url' => route('shop.checkout'),
                'items' => count($lines),
                'pickup' => $pickup !== null ? $pickup->name : 'Choose at checkout',
            ]],
            [
                ['key' => 'items', 'label' => 'Items'],
                ['key' => 'pickup', 'label' => 'Pickup'],
            ],
            [['label' => 'Checkout', 'url' => route('shop.checkout')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
