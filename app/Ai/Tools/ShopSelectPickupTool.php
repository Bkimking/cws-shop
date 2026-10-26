<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Models\Warehouse;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Session;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopSelectPickupTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Selects a pickup warehouse for the visitor. Use a warehouse_id returned by list_pickups.';
    }

    public function handle(Request $request): string
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
        ]);

        $warehouse = Warehouse::query()
            ->where('branch_id', $this->branch->id)
            ->findOrFail((int) $validated['warehouse_id']);

        Session::put('shop_pickup_warehouse_id', $warehouse->id);
        Session::save();

        return ShopToolResult::make(
            $this->branch,
            'Pickup point set to '.$warehouse->name.'.',
            [[
                'warehouse_id' => $warehouse->id,
                'name' => $warehouse->name,
                'address' => $this->branch->address,
                'phone' => $this->branch->phone,
            ]],
            [
                ['key' => 'name', 'label' => 'Pickup point'],
                ['key' => 'address', 'label' => 'Address'],
            ],
            [['label' => 'Checkout', 'url' => route('shop.checkout')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'warehouse_id' => $schema->integer()->min(1)->description('ID from list_pickups.')->required(),
        ];
    }
}
