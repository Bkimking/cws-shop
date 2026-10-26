<?php

namespace App\Ai\Tools;

use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\Category;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Approvals\Approval;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class CreateCategoryTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Creates a product category. Requires human approval.';
    }

    public function needsApproval(Request $request): Approval|bool
    {
        return Approval::required(
            'Create category “'.($request['name'] ?? 'new category').'”?'
        );
    }

    public function handle(Request $request): string
    {
        Gate::forUser($this->scope->user)->authorize('create', Category::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        activity()
            ->performedOn($category)
            ->causedBy($this->scope->user)
            ->withProperties(['source' => 'ai', 'ai_interaction_id' => null])
            ->log('category created via AI');

        return AiToolResult::make(
            $this->scope,
            'Created category “'.$category->name.'”.',
            [[
                'category_id' => $category->id,
                'name' => $category->name,
                'parent_id' => $category->parent_id,
            ]],
            [
                ['key' => 'category_id', 'label' => 'ID'],
                ['key' => 'name', 'label' => 'Category'],
            ],
            [['label' => 'Categories', 'url' => route('admin.categories.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()->description('Category name.')->required(),
            'parent_id' => $schema->integer()->description('Optional parent category ID.'),
        ];
    }
}
