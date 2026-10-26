<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\Category;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ListCategoriesTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists product categories and their IDs. Use this before creating a product.';
    }

    public function handle(Request $request): string
    {
        /** @var Collection<int, Category> $categories */
        $categories = AiReadOnly::query(Category::class)
            ->with('parent:id,name')
            ->orderBy('name')
            ->limit(100)
            ->get(['id', 'name', 'parent_id']);

        $rows = $categories
            ->map(fn (Category $category) => [
                'category_id' => $category->id,
                'name' => $category->name,
                'parent' => $category->parent?->name,
            ])
            ->all();

        return AiToolResult::make(
            $this->scope,
            count($rows).' categories available.',
            $rows,
            [
                ['key' => 'category_id', 'label' => 'ID'],
                ['key' => 'name', 'label' => 'Category'],
                ['key' => 'parent', 'label' => 'Parent'],
            ],
            [['label' => 'Categories', 'url' => route('admin.categories.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
