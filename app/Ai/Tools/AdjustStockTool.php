<?php

namespace App\Ai\Tools;

use App\Ai\AiApprovalPolicy;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\StockLevel;
use App\Models\StockMovement;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Laravel\Ai\Approvals\Approval;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class AdjustStockTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Adjusts a stock level by a positive or negative quantity and records a stock movement. Requires human approval. It cannot delete stock.';
    }

    public function needsApproval(Request $request): Approval|bool
    {
        $change = (int) ($request['quantity_change'] ?? 0);

        if (! app(AiApprovalPolicy::class)->stockChangeRequiresApproval($change)) {
            return false;
        }

        $formatted = $change > 0 ? '+'.$change : (string) $change;

        return Approval::required(
            'Adjust stock level #'.($request['stock_level_id'] ?? '?').' by '.$formatted.' units?'
        );
    }

    public function handle(Request $request): string
    {
        $validated = $request->validate([
            'stock_level_id' => ['required', 'integer', 'exists:stock_levels,id'],
            'quantity_change' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var StockLevel $stockLevel */
        $stockLevel = StockLevel::query()->with(['warehouse.branch', 'productVariant.product'])->findOrFail($validated['stock_level_id']);
        Gate::forUser($this->scope->user)->authorize('adjust', $stockLevel);

        $newQuantity = (int) $stockLevel->quantity_on_hand + (int) $validated['quantity_change'];

        if ($newQuantity < 0) {
            throw ValidationException::withMessages([
                'quantity_change' => 'Stock cannot be adjusted below zero.',
            ]);
        }

        DB::transaction(function () use ($stockLevel, $validated, $newQuantity): void {
            $stockLevel->update(['quantity_on_hand' => $newQuantity]);

            StockMovement::create([
                'warehouse_id' => $stockLevel->warehouse_id,
                'product_variant_id' => $stockLevel->product_variant_id,
                'quantity' => (int) $validated['quantity_change'],
                'type' => 'ADJUSTMENT',
                'reference_id' => 'AI-'.$stockLevel->id,
                'created_by' => $this->scope->user->id,
                'notes' => 'AI: '.$validated['reason']
                    .(! empty($validated['notes']) ? ': '.$validated['notes'] : ''),
            ]);
        });

        $product = $stockLevel->productVariant->product;

        return AiToolResult::make(
            $this->scope,
            'Adjusted '.$product->name.' at '.$stockLevel->warehouse->name.' by '
                .$validated['quantity_change'].' units. New on-hand: '.$newQuantity.'.',
            [[
                'stock_level_id' => $stockLevel->id,
                'product' => $product->name,
                'variant' => $stockLevel->productVariant->variant_name,
                'warehouse' => $stockLevel->warehouse->name,
                'branch' => $stockLevel->warehouse->branch->name,
                'previous_quantity' => (int) $stockLevel->quantity_on_hand - (int) $validated['quantity_change'],
                'new_quantity' => $newQuantity,
            ]],
            [
                ['key' => 'product', 'label' => 'Product'],
                ['key' => 'warehouse', 'label' => 'Warehouse'],
                ['key' => 'new_quantity', 'label' => 'On hand'],
            ],
            [['label' => 'Stock', 'url' => route('admin.stock.show', $stockLevel)]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'stock_level_id' => $schema->integer()->min(1)->description('Stock level ID from a stock tool.')->required(),
            'quantity_change' => $schema->integer()->description('Positive to receive, negative to remove.')->required(),
            'reason' => $schema->string()->description('Reason for the adjustment.')->required(),
            'notes' => $schema->string()->description('Optional notes.'),
        ];
    }
}
