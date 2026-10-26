<?php

namespace App\Ai\Tools;

use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\SkuGenerator;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Approvals\Approval;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class CreateProductTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Creates a product with a default variant. Requires human approval. Does not create stock.';
    }

    public function needsApproval(Request $request): Approval|bool
    {
        return Approval::required(
            'Create product “'.($request['name'] ?? 'new product').'” in the catalog?'
        );
    }

    public function handle(Request $request): string
    {
        Gate::forUser($this->scope->user)->authorize('create', Product::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku'],
            'description' => ['nullable', 'string'],
            'variant_name' => ['nullable', 'string', 'max:255'],
            'variant_price_delta' => ['nullable', 'numeric'],
        ]);

        $product = DB::transaction(function () use ($validated): Product {
            $generator = new SkuGenerator;
            $sku = $validated['sku'] ?? null;

            if (blank($sku)) {
                $sku = $generator->generateProductSku(
                    (int) $validated['category_id'],
                    $validated['name'],
                );
            }

            $product = Product::create([
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'sku' => $sku,
                'description' => $validated['description'] ?? null,
                'base_price' => $validated['base_price'],
                'is_active' => true,
            ]);

            if (blank($validated['sku'] ?? null)) {
                $product->update([
                    'sku' => $generator->generateProductSku(
                        (int) $validated['category_id'],
                        $validated['name'],
                        $product->id,
                    ),
                ]);
            }

            $variantName = $validated['variant_name'] ?? 'Default';

            ProductVariant::create([
                'product_id' => $product->id,
                'variant_name' => $variantName,
                'sku_suffix' => $generator->generateVariantSuffix($variantName),
                'price_delta' => $validated['variant_price_delta'] ?? 0,
            ]);

            return $product->fresh('variants');
        });

        $variant = $product->variants->first();

        activity()
            ->performedOn($product)
            ->causedBy($this->scope->user)
            ->withProperties(['source' => 'ai', 'ai_interaction_id' => null])
            ->log('product created via AI');

        return AiToolResult::make(
            $this->scope,
            'Created product “'.$product->name.'” ('.$product->sku.'). Add stock separately.',
            [[
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'variant_id' => $variant?->id,
                'variant_name' => $variant?->variant_name,
                'base_price' => (float) $product->base_price,
                'currency' => $this->scope->currency(),
            ]],
            [
                ['key' => 'product_id', 'label' => 'ID'],
                ['key' => 'name', 'label' => 'Product'],
                ['key' => 'sku', 'label' => 'SKU'],
                ['key' => 'variant_name', 'label' => 'Variant'],
            ],
            [['label' => 'Product', 'url' => route('admin.products.edit', $product)]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()->description('Product name.')->required(),
            'category_id' => $schema->integer()->min(1)->description('Existing category ID.')->required(),
            'base_price' => $schema->number()->min(0)->description('Base selling price.')->required(),
            'sku' => $schema->string()->description('Optional SKU. Generated when omitted.'),
            'description' => $schema->string()->description('Optional description.'),
            'variant_name' => $schema->string()->description('Optional first variant name. Defaults to Default.'),
            'variant_price_delta' => $schema->number()->description('Optional variant price delta.'),
        ];
    }
}
