<?php

namespace App\Ai\Tools;

use App\Ai\AiApprovalPolicy;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\Product;
use App\Services\SkuGenerator;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Approvals\Approval;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class UpdateProductTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Edits a product name, price, description or active state. Requires human approval. It cannot delete or change variants.';
    }

    public function needsApproval(Request $request): Approval|bool
    {
        $price = isset($request['base_price']) ? (float) $request['base_price'] : null;

        if (! app(AiApprovalPolicy::class)->productPriceRequiresApproval($price)) {
            return false;
        }

        return Approval::required(
            'Update product #'.($request['product_id'] ?? '?').'? Review the proposed fields first.'
        );
    }

    public function handle(Request $request): string
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'base_price' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        /** @var Product $product */
        $product = Product::query()->findOrFail($validated['product_id']);
        Gate::forUser($this->scope->user)->authorize('update', $product);

        $changes = collect($validated)->except('product_id')->all();

        if (array_key_exists('category_id', $changes) && blank($product->sku)) {
            $changes['sku'] = (new SkuGenerator)->generateProductSku(
                (int) $changes['category_id'],
                $changes['name'] ?? $product->name,
                $product->id,
            );
        }

        $product->update($changes);

        activity()
            ->performedOn($product)
            ->causedBy($this->scope->user)
            ->withProperties(['source' => 'ai', 'changes' => $changes, 'ai_interaction_id' => null])
            ->log('product updated via AI');

        return AiToolResult::make(
            $this->scope,
            'Updated product “'.$product->name.'”. Changes are now live.',
            [[
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'base_price' => (float) $product->base_price,
                'is_active' => (bool) $product->is_active,
            ]],
            [
                ['key' => 'product_id', 'label' => 'ID'],
                ['key' => 'name', 'label' => 'Product'],
                ['key' => 'base_price', 'label' => 'Price'],
            ],
            [['label' => 'Product', 'url' => route('admin.products.edit', $product)]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'product_id' => $schema->integer()->min(1)->description('Product ID.')->required(),
            'name' => $schema->string()->description('New name.'),
            'category_id' => $schema->integer()->description('New category ID.'),
            'base_price' => $schema->number()->min(0)->description('New base price.'),
            'description' => $schema->string()->description('New description.'),
            'is_active' => $schema->boolean()->description('Whether the product is active.'),
        ];
    }
}
