<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Models\Warehouse;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopListPickupsTool implements Tool
{
    public function __construct(protected Branch $branch) {}

    public function description(): Stringable|string
    {
        return 'Lists the pickup warehouses for the shop. Use this before asking the visitor where they want to collect their order.';
    }

    public function handle(Request $request): string
    {
        $rows = Warehouse::query()
            ->where('branch_id', $this->branch->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Warehouse $warehouse) => [
                'warehouse_id' => $warehouse->id,
                'name' => $warehouse->name,
                'branch' => $this->branch->name,
                'address' => $this->branch->address,
                'phone' => $this->branch->phone,
            ])
            ->all();

        return ShopToolResult::make(
            $this->branch,
            $rows === [] ? 'No pickup warehouse is configured.' : 'Choose the pickup point closest to you.',
            $rows,
            [
                ['key' => 'name', 'label' => 'Pickup point'],
                ['key' => 'address', 'label' => 'Address'],
            ],
            [['label' => 'Shop', 'url' => route('shop.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
