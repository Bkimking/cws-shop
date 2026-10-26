<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Region;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Branch::class);

        $query = Branch::with([
            'region:id,name',
            'users:id,branch_id,name,email',
            'users.roles:id,name',
            'warehouses:id,branch_id,name',
            'warehouses.stockLevels:id,warehouse_id,product_variant_id',
            'tillSessions' => fn ($q) => $q->whereNull('closed_at')->latest('opened_at')->take(1),
            'tillSessions.user:id,name',
        ])->withCount('users');

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        if ($scopedRegionId) {
            $query->where('region_id', $scopedRegionId);
        }

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        if ($scopedBranchId) {
            $query->where('id', $scopedBranchId);
        }

        return Inertia::render('admin/branches/index', [
            'branches' => $query->latest()->paginate(20),
            'regions' => $this->visibleRegions($request),
        ]);
    }

    public function create(Request $request)
    {
        $this->authorize('create', Branch::class);

        return Inertia::render('admin/branches/add', [
            'regions' => $this->visibleRegions($request),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Branch::class);

        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'name' => 'required|string|max:100',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'is_active' => 'boolean',
        ]);

        $request->validate([
            'name' => 'unique:branches,name,NULL,id,region_id,'.$validated['region_id'],
        ]);

        $this->assertRegionInScope($request, (int) $validated['region_id']);

        $slug = Str::slug($validated['name']);

        if (Branch::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'name' => 'A branch with a similar name already exists. Branch slugs are global; choose another name.',
            ]);
        }

        $validated['slug'] = $slug;

        Branch::create($validated);

        ToastHelper::success('Branch created successfully!');

        return redirect()->route('admin.branches.index');
    }

    public function edit(Request $request, Branch $branch)
    {
        $this->authorize('view', $branch);

        return Inertia::render('admin/branches/edit', [
            'branch' => $branch,
            'regions' => $this->visibleRegions($request),
        ]);
    }

    public function update(Request $request, Branch $branch)
    {
        $this->authorize('update', $branch);

        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'name' => 'required|string|max:100',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'is_active' => 'boolean',
        ]);

        $request->validate([
            'name' => 'unique:branches,name,'.$branch->id.',id,region_id,'.$validated['region_id'],
        ]);

        $this->assertRegionInScope($request, (int) $validated['region_id']);

        $slug = Str::slug($validated['name']);

        if (Branch::query()->where('slug', $slug)->whereKeyNot($branch->id)->exists()) {
            throw ValidationException::withMessages([
                'name' => 'A branch with a similar name already exists. Branch slugs are global; choose another name.',
            ]);
        }

        $validated['slug'] = $slug;

        $branch->update($validated);

        ToastHelper::success('Branch updated successfully!');

        return redirect()->route('admin.branches.index');
    }

    private function assertRegionInScope(Request $request, int $regionId): void
    {
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if ($scopedRegionId && (int) $scopedRegionId !== $regionId) {
            throw ValidationException::withMessages([
                'region_id' => 'You can only manage branches inside your own region.',
            ]);
        }
    }

    /**
     * @return Collection<int, Region>
     */
    private function visibleRegions(Request $request)
    {
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        return Region::query()
            ->where('is_active', true)
            ->when($scopedRegionId, fn ($query, $id) => $query->where('id', $id))
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    public function destroy(Branch $branch)
    {
        $this->authorize('delete', $branch);

        $branch->update(['is_active' => false]);

        ToastHelper::success('Branch deactivated successfully!');

        return redirect()->route('admin.branches.index');
    }

    public function reactivate(Branch $branch)
    {
        $this->authorize('delete', $branch);

        $branch->update(['is_active' => true]);

        ToastHelper::success('Branch reactivated successfully!');

        return redirect()->route('admin.branches.index');
    }
}
