<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RegionController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Region::class);

        $query = Region::withCount('branches')
            ->with([
                'branches:id,region_id,name,phone,is_active',
                'branches.users:id,branch_id,name',
                'paymentGatewayConfigs:id,region_id,gateway,is_enabled',
            ]);

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        if ($scopedRegionId) {
            $query->where('id', $scopedRegionId);
        }

        return Inertia::render('admin/regions/index', [
            'regions' => $query->latest()->paginate(20),
        ]);
    }

    public function create()
    {
        $this->authorize('create', Region::class);

        return Inertia::render('admin/regions/add');
    }

    public function store(Request $request)
    {
        $this->authorize('create', Region::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:regions,name',
            'country_code' => ['required', 'string', 'size:2', Rule::unique('regions', 'country_code')],
            'currency_code' => 'required|string|size:3',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'timezone' => 'required|string|max:64',
            'is_active' => 'boolean',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        Region::create($validated);

        ToastHelper::success('Region created successfully!');

        return redirect()->route('admin.regions.index');
    }

    public function edit(Region $region)
    {
        $this->authorize('view', $region);

        return Inertia::render('admin/regions/edit', ['region' => $region]);
    }

    public function update(Request $request, Region $region)
    {
        $this->authorize('update', $region);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:regions,name,'.$region->id,
            'country_code' => ['required', 'string', 'size:2', Rule::unique('regions', 'country_code')->ignore($region->id)],
            'currency_code' => 'required|string|size:3',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'timezone' => 'required|string|max:64',
            'is_active' => 'boolean',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $region->update($validated);

        ToastHelper::success('Region updated successfully!');

        return redirect()->route('admin.regions.index');
    }

    public function destroy(Region $region)
    {
        $this->authorize('delete', $region);

        // Deactivate, don't hard-delete — branches/orders reference this region
        $region->update(['is_active' => false]);

        ToastHelper::success('Region deactivated successfully!');

        return redirect()->route('admin.regions.index');
    }

    public function reactivate(Region $region)
    {
        $this->authorize('delete', $region);

        $region->update(['is_active' => true]);

        ToastHelper::success('Region reactivated successfully!');

        return redirect()->route('admin.regions.index');
    }
}
