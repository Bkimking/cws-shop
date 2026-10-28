<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', StockLevel::class);

        $query = StockLevel::with([
            'warehouse:id,name,branch_id',
            'warehouse.branch:id,name,region_id',
            'productVariant:id,product_id,variant_name,sku_suffix,barcode,price_delta',
            'productVariant.product:id,name,sku,category_id',
            'productVariant.product.category:id,name',
        ]);

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        if ($scopedRegionId) {
            $query->whereHas('warehouse.branch', fn ($q) => $q->where('region_id', $scopedRegionId));
        }

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        if ($scopedBranchId) {
            $query->whereHas('warehouse', fn ($q) => $q->where('branch_id', $scopedBranchId));
        }

        // Filter by warehouse if specified
        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        // Filter by stock state
        if ($request->has('state')) {
            switch ($request->state) {
                case 'low':
                    $query->whereColumn('quantity_on_hand', '<=', 'reorder_point')
                        ->where('quantity_on_hand', '>', 0);
                    break;
                case 'out':
                    $query->where('quantity_on_hand', '<=', 0);
                    break;
                case 'ok':
                    $query->whereColumn('quantity_on_hand', '>', 'reorder_point');
                    break;
            }
        }

        return Inertia::render('admin/stock/index', [
            'stockLevels' => $query->latest()->paginate(20),
            'warehouses' => Warehouse::with('branch:id,name,region_id')
                ->when($scopedRegionId, fn ($q) => $q->whereHas('branch', fn ($bq) => $bq->where('region_id', $scopedRegionId)))
                ->when($scopedBranchId, fn ($q) => $q->where('branch_id', $scopedBranchId))
                ->get(['id', 'name', 'branch_id']),
            'categories' => Category::all(['id', 'name']),
            'products' => Product::with(['category:id,name', 'variants:id,product_id,variant_name,sku_suffix,barcode'])
                ->where('is_active', true)
                ->get(['id', 'name', 'sku', 'category_id']),
        ]);
    }

    public function show(StockLevel $stockLevel): Response
    {
        $this->authorize('view', $stockLevel);

        $stockLevel->load([
            'warehouse:id,name,branch_id',
            'warehouse.branch:id,name,region_id',
            'productVariant:id,product_id,variant_name,sku_suffix,barcode,price_delta',
            'productVariant.product:id,name,sku,category_id',
            'productVariant.product.category:id,name',
        ]);

        $movements = StockMovement::with([
            'warehouse:id,name',
            'productVariant:id,variant_name',
            'createdBy:id,name',
        ])
            ->where('warehouse_id', $stockLevel->warehouse_id)
            ->where('product_variant_id', $stockLevel->product_variant_id)
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('admin/stock/show', [
            'stockLevel' => $stockLevel,
            'movements' => $movements,
        ]);
    }

    public function adjust(Request $request, StockLevel $stockLevel): RedirectResponse
    {
        $this->authorize('adjust', $stockLevel);

        $validated = $request->validate([
            'quantity_change' => 'required|integer',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $newQuantity = $stockLevel->quantity_on_hand + $validated['quantity_change'];

        if ($newQuantity < 0) {
            ToastHelper::error('Cannot adjust stock below zero.');

            return back();
        }

        DB::transaction(function () use ($stockLevel, $validated, $newQuantity) {
            // Update stock level
            $stockLevel->update([
                'quantity_on_hand' => $newQuantity,
            ]);

            // Record movement
            StockMovement::create([
                'warehouse_id' => $stockLevel->warehouse_id,
                'product_variant_id' => $stockLevel->product_variant_id,
                'quantity' => $validated['quantity_change'],
                'type' => 'ADJUSTMENT',
                'reference_id' => 'MANUAL-'.$stockLevel->id,
                'created_by' => auth()->id(),
                'notes' => $validated['reason'].($validated['notes'] ? ': '.$validated['notes'] : ''),
            ]);
        });

        ToastHelper::success('Stock adjusted successfully.');

        return back();
    }

    public function updateReorderPoint(Request $request, StockLevel $stockLevel): RedirectResponse
    {
        $this->authorize('adjust', $stockLevel);

        $validated = $request->validate([
            'reorder_point' => 'required|integer|min:0',
        ]);

        $stockLevel->update([
            'reorder_point' => $validated['reorder_point'],
        ]);

        ToastHelper::success('Reorder point updated successfully.');

        return back();
    }

    public function transfer(Request $request): RedirectResponse
    {
        $this->authorize('transfer', StockLevel::class);

        $validated = $request->validate([
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'to_warehouse_id' => 'required|exists:warehouses,id|different:from_warehouse_id',
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        $fromWarehouse = Warehouse::findOrFail($validated['from_warehouse_id']);
        $toWarehouse = Warehouse::findOrFail($validated['to_warehouse_id']);

        $this->authorize('useForStock', $fromWarehouse);
        $this->authorize('useForStock', $toWarehouse);

        $fromStock = StockLevel::where('warehouse_id', $validated['from_warehouse_id'])
            ->where('product_variant_id', $validated['product_variant_id'])
            ->first();

        if (! $fromStock) {
            ToastHelper::error('Source stock level not found.');

            return back();
        }

        if ($fromStock->quantity_on_hand < $validated['quantity']) {
            ToastHelper::error('Insufficient stock in source warehouse.');

            return back();
        }

        DB::transaction(function () use ($validated, $fromStock) {
            // Deduct from source
            $fromStock->update([
                'quantity_on_hand' => $fromStock->quantity_on_hand - $validated['quantity'],
            ]);

            // Record movement from source
            StockMovement::create([
                'warehouse_id' => $validated['from_warehouse_id'],
                'product_variant_id' => $validated['product_variant_id'],
                'quantity' => -$validated['quantity'],
                'type' => 'TRANSFER_OUT',
                'reference_id' => 'TRANSFER-'.$validated['to_warehouse_id'],
                'created_by' => auth()->id(),
                'notes' => 'Transfer to warehouse '.$validated['to_warehouse_id'].($validated['notes'] ?? null ? ': '.$validated['notes'] : ''),
            ]);

            // Add to destination
            $toStock = StockLevel::where('warehouse_id', $validated['to_warehouse_id'])
                ->where('product_variant_id', $validated['product_variant_id'])
                ->first();

            if ($toStock) {
                $toStock->update([
                    'quantity_on_hand' => $toStock->quantity_on_hand + $validated['quantity'],
                ]);
            } else {
                $toStock = StockLevel::create([
                    'warehouse_id' => $validated['to_warehouse_id'],
                    'product_variant_id' => $validated['product_variant_id'],
                    'quantity_on_hand' => $validated['quantity'],
                    'reorder_point' => $fromStock->reorder_point,
                ]);
            }

            // Record movement to destination
            StockMovement::create([
                'warehouse_id' => $validated['to_warehouse_id'],
                'product_variant_id' => $validated['product_variant_id'],
                'quantity' => $validated['quantity'],
                'type' => 'TRANSFER_IN',
                'reference_id' => 'TRANSFER-'.$validated['from_warehouse_id'],
                'created_by' => auth()->id(),
                'notes' => 'Transfer from warehouse '.$validated['from_warehouse_id'].($validated['notes'] ?? null ? ': '.$validated['notes'] : ''),
            ]);
        });

        ToastHelper::success('Stock transferred successfully.');

        return back();
    }

    public function createStockLevel(Request $request): RedirectResponse
    {
        $this->authorize('create', StockLevel::class);

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity_on_hand' => 'required|integer|min:0',
            'reorder_point' => 'required|integer|min:0',
            'supplier_name' => 'nullable|string|max:120',
            'notes' => 'nullable|string|max:1000',
        ]);

        $warehouse = Warehouse::findOrFail($validated['warehouse_id']);
        $this->authorize('useForStock', $warehouse);

        $existingStock = StockLevel::where('warehouse_id', $validated['warehouse_id'])
            ->where('product_variant_id', $validated['product_variant_id'])
            ->first();

        if ($existingStock) {
            ToastHelper::error('Stock level already exists for this product in this warehouse.');

            return back();
        }

        DB::transaction(function () use ($validated) {
            $stockLevel = StockLevel::create([
                'warehouse_id' => $validated['warehouse_id'],
                'product_variant_id' => $validated['product_variant_id'],
                'quantity_on_hand' => $validated['quantity_on_hand'],
                'reorder_point' => $validated['reorder_point'],
            ]);

            if ($validated['quantity_on_hand'] > 0) {
                $supplier = trim((string) ($validated['supplier_name'] ?? ''));

                StockMovement::create([
                    'warehouse_id' => $validated['warehouse_id'],
                    'product_variant_id' => $validated['product_variant_id'],
                    'quantity' => $validated['quantity_on_hand'],
                    'type' => $supplier !== '' ? 'PURCHASE' : 'MANUAL_ADD',
                    'reference_id' => ($supplier !== '' ? 'RECEIVE-' : 'MANUAL-').$stockLevel->id,
                    'created_by' => auth()->id(),
                    'notes' => ($supplier !== '' ? 'Received from '.$supplier : 'Manual stock level creation')
                        .($validated['notes'] ?? null ? ': '.$validated['notes'] : ''),
                ]);
            }
        });

        ToastHelper::success('Stock level created successfully.');

        return back();
    }
}
