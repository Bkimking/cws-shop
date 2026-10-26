<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\TillSession;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function region(Request $request): Response
    {
        $regionId = $request->attributes->get('scoped_region_id')
            ?: $request->integer('region')
            ?: Region::query()->where('is_active', true)->value('id');

        abort_unless($regionId, 404, 'No region is available.');

        /** @var Region $region */
        $region = Region::query()
            ->with('branches')
            ->findOrFail($regionId);

        $branchIds = $region->branches->pluck('id')->all();

        $salesToday = Order::query()
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'completed')
            ->whereDate('created_at', today());

        $recentOrders = Order::query()
            ->with(['branch:id,name', 'payments:id,order_id,gateway'])
            ->whereIn('branch_id', $branchIds)
            ->latest('created_at')
            ->take(8)
            ->get()
            ->map(fn (Order $order) => $this->orderRow($order));

        $lowStock = $this->lowStockQuery($branchIds)
            ->take(8)
            ->get()
            ->map(fn (StockLevel $level) => $this->stockRow($level));

        $branches = $region->branches
            ->map(function (Branch $branch): array {
                $todayOrders = Order::query()
                    ->where('branch_id', $branch->id)
                    ->where('status', 'completed')
                    ->whereDate('created_at', today());

                $openTill = TillSession::query()
                    ->with('user:id,name')
                    ->where('branch_id', $branch->id)
                    ->where('status', 'OPEN')
                    ->latest('opened_at')
                    ->first();

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'address' => $branch->address,
                    'is_open' => $openTill !== null,
                    'cashier' => $openTill?->user?->name,
                    'sales_today' => (float) (clone $todayOrders)->sum('total'),
                    'orders_today' => (clone $todayOrders)->count(),
                    'low_stock' => $this->lowStockQuery([$branch->id])->count(),
                    'staff' => User::query()
                        ->where('branch_id', $branch->id)
                        ->where('is_active', true)
                        ->count(),
                ];
            })
            ->values();

        return Inertia::render('admin/workspaces/region', [
            'region' => [
                'id' => $region->id,
                'name' => $region->name,
                'currency' => $region->currency_code,
                'is_active' => $region->is_active,
            ],
            'metrics' => [
                'sales_today' => (float) (clone $salesToday)->sum('total'),
                'orders_today' => (clone $salesToday)->count(),
                'branches' => $region->branches->count(),
                'open_tills' => TillSession::query()
                    ->whereIn('branch_id', $branchIds)
                    ->where('status', 'OPEN')
                    ->count(),
                'low_stock' => $this->lowStockQuery($branchIds)->count(),
                'staff' => User::query()
                    ->where('is_active', true)
                    ->where(function ($query) use ($region, $branchIds) {
                        $query->where('region_id', $region->id)
                            ->orWhereIn('branch_id', $branchIds);
                    })
                    ->count(),
            ],
            'branches' => $branches,
            'recent_orders' => $recentOrders,
            'low_stock' => $lowStock,
            'currency' => $region->currency_code,
        ]);
    }

    public function branch(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);
        $scopedRegionId = $request->attributes->get('scoped_region_id');
        $scopedBranchId = $request->attributes->get('scoped_branch_id')
            ?: $request->integer('branch')
            ?: $user->branch_id;

        $branchQuery = Branch::query()->with('region');

        if ($scopedBranchId) {
            $branchQuery->whereKey($scopedBranchId);
        } elseif ($scopedRegionId) {
            $branchQuery->where('region_id', $scopedRegionId);
        }

        $branch = $branchQuery->orderBy('id')->firstOrFail();

        if ($scopedRegionId && (int) $branch->region_id !== (int) $scopedRegionId) {
            abort(403, 'That branch is outside your region.');
        }

        $salesToday = Order::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'completed')
            ->whereDate('created_at', today());

        $tills = TillSession::query()
            ->with('user:id,name')
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->get()
            ->map(fn (TillSession $till) => [
                'id' => $till->id,
                'cashier' => $till->user->name,
                'opened_at' => $till->opened_at->toIso8601String(),
                'opening_cash' => (float) $till->opening_cash,
            ]);

        $staff = User::query()
            ->where('branch_id', $branch->id)
            ->where('is_active', true)
            ->with('roles:id,name')
            ->orderBy('name')
            ->take(12)
            ->get()
            ->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'roles' => $member->roles->pluck('name')->values(),
            ]);

        $recentOrders = Order::query()
            ->with(['payments:id,order_id,gateway'])
            ->where('branch_id', $branch->id)
            ->latest('created_at')
            ->take(8)
            ->get()
            ->map(fn (Order $order) => $this->orderRow($order));

        $lowStock = $this->lowStockQuery([$branch->id])
            ->take(8)
            ->get()
            ->map(fn (StockLevel $level) => $this->stockRow($level));

        return Inertia::render('admin/workspaces/branch', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
                'region' => $branch->region->name,
                'currency' => $branch->region->currency_code,
            ],
            'metrics' => [
                'sales_today' => (float) (clone $salesToday)->sum('total'),
                'orders_today' => (clone $salesToday)->count(),
                'open_tills' => $tills->count(),
                'staff' => $staff->count(),
                'low_stock' => $this->lowStockQuery([$branch->id])->count(),
                'warehouses' => Warehouse::query()->where('branch_id', $branch->id)->count(),
            ],
            'tills' => $tills,
            'staff' => $staff,
            'recent_orders' => $recentOrders,
            'low_stock' => $lowStock,
            'currency' => $branch->region->currency_code,
        ]);
    }

    public function inventory(Request $request): Response
    {
        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        $branchQuery = Branch::query();
        $scopeLabel = 'All branches';

        if ($scopedBranchId) {
            $branchQuery->whereKey($scopedBranchId);
            $scopeLabel = 'Branch inventory';
        } elseif ($scopedRegionId) {
            $branchQuery->where('region_id', $scopedRegionId);
            $scopeLabel = 'Region inventory';
        }

        $branchIds = (clone $branchQuery)->pluck('id')->all();
        $warehouseIds = Warehouse::query()->whereIn('branch_id', $branchIds)->pluck('id');

        $lowStock = $this->lowStockQuery($branchIds)
            ->take(12)
            ->get()
            ->map(fn (StockLevel $level) => $this->stockRow($level));

        $movements = StockMovement::query()
            ->with(['productVariant.product:id,name', 'warehouse:id,name,branch_id', 'createdBy:id,name'])
            ->whereIn('warehouse_id', $warehouseIds)
            ->latest('created_at')
            ->take(12)
            ->get()
            ->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type,
                'quantity' => (int) $movement->quantity,
                'product' => $movement->productVariant->product->name,
                'variant' => $movement->productVariant->variant_name,
                'warehouse' => $movement->warehouse->name,
                'by' => data_get($movement, 'createdBy.name', 'System'),
                'notes' => $movement->notes,
                'time' => $movement->created_at?->diffForHumans(),
            ]);

        $warehouses = Warehouse::query()
            ->with('branch:id,name')
            ->whereIn('branch_id', $branchIds)
            ->get()
            ->map(function (Warehouse $warehouse): array {
                $levels = StockLevel::query()->where('warehouse_id', $warehouse->id);

                return [
                    'id' => $warehouse->id,
                    'name' => $warehouse->name,
                    'branch' => $warehouse->branch->name,
                    'units' => (int) (clone $levels)->sum('quantity_on_hand'),
                    'low_stock' => (clone $levels)
                        ->whereColumn('quantity_on_hand', '<=', 'reorder_point')
                        ->count(),
                ];
            })
            ->values();

        $levels = StockLevel::query()->whereIn('warehouse_id', $warehouseIds);

        return Inertia::render('admin/workspaces/inventory', [
            'scope' => $scopeLabel,
            'metrics' => [
                'products' => (int) (clone $levels)->distinct()->count('product_variant_id'),
                'warehouses' => $warehouses->count(),
                'units' => (int) (clone $levels)->sum('quantity_on_hand'),
                'low_stock' => $this->lowStockQuery($branchIds)->count(),
                'out_of_stock' => (clone $levels)->where('quantity_on_hand', '<=', 0)->count(),
            ],
            'low_stock' => $lowStock,
            'movements' => $movements,
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * @param  array<int, int>  $branchIds
     * @return Builder<StockLevel>
     */
    private function lowStockQuery(array $branchIds): Builder
    {
        return StockLevel::query()
            ->with(['warehouse.branch', 'productVariant.product:id,name'])
            ->whereIn('warehouse_id', Warehouse::query()->whereIn('branch_id', $branchIds)->select('id'))
            ->whereColumn('quantity_on_hand', '<=', 'reorder_point')
            ->orderBy('quantity_on_hand');
    }

    /**
     * @return array<string, mixed>
     */
    private function orderRow(Order $order): array
    {
        $payment = $order->payments->first();

        return [
            'id' => $order->id,
            'number' => '#'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
            'branch' => $order->branch?->name,
            'total' => (float) $order->total,
            'currency' => $order->currency_code,
            'status' => $order->status,
            'payment' => $payment?->gateway,
            'time' => $order->created_at?->diffForHumans(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function stockRow(StockLevel $level): array
    {
        return [
            'id' => $level->id,
            'product' => $level->productVariant->product->name,
            'variant' => $level->productVariant->variant_name,
            'warehouse' => $level->warehouse->name,
            'branch' => $level->warehouse->branch->name,
            'quantity' => (int) $level->quantity_on_hand,
            'reorder_point' => (int) $level->reorder_point,
        ];
    }
}
