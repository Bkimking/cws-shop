<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\BarcodeService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Category::class);

        $categories = Category::with(['parent:id,name', 'children:id,name,parent_id'])
            ->withCount('products')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/categories/index', [
            'categories' => $categories,
        ]);
    }

    public function create()
    {
        $this->authorize('create', Category::class);

        return Inertia::render('admin/categories/add', [
            'categories' => Category::whereNull('parent_id')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Category::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:80|unique:categories,barcode',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);
        app(BarcodeService::class)->category($category);

        ToastHelper::success('Category created successfully!');

        return redirect()->route('admin.categories.index');
    }

    public function edit(Category $category)
    {
        $this->authorize('view', $category);

        $category->load(['parent:id,name', 'children:id,name,parent_id']);

        return Inertia::render('admin/categories/edit', [
            'category' => $category,
            'categories' => Category::whereNull('parent_id')
                ->where('id', '!=', $category->id)
                ->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Category $category)
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:80|unique:categories,barcode,'.$category->id,
            'parent_id' => 'nullable|exists:categories,id|not_in:'.$category->id,
        ]);

        $category->update([
            'name' => $validated['name'],
            'barcode' => $validated['barcode'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
        ]);
        app(BarcodeService::class)->category($category);

        ToastHelper::success('Category updated successfully!');

        return redirect()->route('admin.categories.index');
    }

    public function destroy(Category $category)
    {
        $this->authorize('delete', $category);

        if ($category->products()->exists()) {
            ToastHelper::error('Cannot delete category with products.');

            return redirect()->route('admin.categories.index');
        }

        if ($category->children()->exists()) {
            ToastHelper::error('Cannot delete category with subcategories.');

            return redirect()->route('admin.categories.index');
        }

        $category->delete();

        ToastHelper::success('Category deleted successfully!');

        return redirect()->route('admin.categories.index');
    }
}
