<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WarehouseController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Warehouse::class);

        $query = Warehouse::with([
            'branch:id,name,region_id',
            'branch.region:id,name',
            'stockLevels:id,warehouse_id,product_variant_id,quantity_on_hand',
        ])->withCount('stockLevels');

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        if ($scopedRegionId) {
            $query->whereHas('branch', fn ($q) => $q->where('region_id', $scopedRegionId));
        }

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        }

        return Inertia::render('admin/warehouses/index', [
            'warehouses' => $query->latest()->paginate(20),
            'branches' => Branch::with('region:id,name')
                ->when($scopedRegionId, fn ($q) => $q->where('region_id', $scopedRegionId))
                ->when($scopedBranchId, fn ($q) => $q->where('id', $scopedBranchId))
                ->get(['id', 'name', 'region_id']),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Warehouse::class);

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        $scopedBranchId = $request->attributes->get('scoped_branch_id');

        return Inertia::render('admin/warehouses/create', [
            'branches' => Branch::with('region:id,name')
                ->when($scopedRegionId, fn ($q) => $q->where('region_id', $scopedRegionId))
                ->when($scopedBranchId, fn ($q) => $q->where('id', $scopedBranchId))
                ->get(['id', 'name', 'region_id']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Warehouse::class);

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:100',
        ]);

        $this->assertBranchInScope($request, (int) $validated['branch_id']);

        Warehouse::create($validated);

        ToastHelper::success('Warehouse created successfully.');

        return redirect()->route('admin.warehouses.index');
    }

    public function edit(Request $request, Warehouse $warehouse): Response
    {
        $this->authorize('update', $warehouse);

        $warehouse->load('branch:id,name,region_id');

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        $scopedBranchId = $request->attributes->get('scoped_branch_id');

        return Inertia::render('admin/warehouses/edit', [
            'warehouse' => $warehouse,
            'branches' => Branch::with('region:id,name')
                ->when($scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId))
                ->when($scopedBranchId, fn ($query, $branchId) => $query->where('id', $branchId))
                ->get(['id', 'name', 'region_id']),
        ]);
    }

    public function update(Request $request, Warehouse $warehouse): RedirectResponse
    {
        $this->authorize('update', $warehouse);

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:100',
        ]);

        $this->assertBranchInScope($request, (int) $validated['branch_id']);

        $warehouse->update($validated);

        ToastHelper::success('Warehouse updated successfully.');

        return redirect()->route('admin.warehouses.index');
    }

    public function destroy(Warehouse $warehouse): RedirectResponse
    {
        $this->authorize('delete', $warehouse);

        if ($warehouse->stockLevels()->exists()) {
            ToastHelper::error('Cannot delete warehouse with existing stock levels.');

            return back();
        }

        $warehouse->delete();

        ToastHelper::success('Warehouse deleted successfully.');

        return redirect()->route('admin.warehouses.index');
    }

    private function assertBranchInScope(Request $request, int $branchId): void
    {
        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if ($scopedBranchId && (int) $scopedBranchId !== $branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'You can only manage warehouses in your own branch.',
            ]);
        }

        if (! $scopedBranchId && $scopedRegionId) {
            $branchRegionId = Branch::query()->whereKey($branchId)->value('region_id');

            if ((int) $branchRegionId !== (int) $scopedRegionId) {
                throw ValidationException::withMessages([
                    'branch_id' => 'You can only manage warehouses in your own region.',
                ]);
            }
        }
    }
}
