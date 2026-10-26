<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        $branchQuery = Branch::query()
            ->where('is_active', true)
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId));

        $branches = (clone $branchQuery)
            ->with([
                'region:id,name,currency_code',
                'tillSessions' => fn ($query) => $query
                    ->where('status', 'OPEN')
                    ->latest('opened_at')
                    ->take(1),
                'tillSessions.user:id,name',
            ])
            ->get()
            ->map(function (Branch $branch) {
                $activeTill = $branch->tillSessions->first();

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'is_open' => (bool) $activeTill,
                    'cashier' => data_get($activeTill, 'user.name', 'None'),
                    'cash_in_till' => $activeTill ? (float) $activeTill->opening_cash : 0.0,
                    'currency_code' => data_get($branch, 'region.currency_code', 'KES'),
                ];
            });

        $recentSales = Order::query()
            ->with([
                'branch.region:id,currency_code',
                'customer:id,name',
                'payments:id,order_id,gateway',
                'tillSession.user:id,name',
            ])
            ->where('status', 'completed')
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query
                ->whereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $regionId)))
            ->latest('created_at')
            ->take(10)
            ->get()
            ->map(function (Order $order) {
                $payment = $order->payments->first();

                return [
                    'id' => $order->id,
                    'order_number' => (string) ($order->id + 1000),
                    'total' => (float) $order->total,
                    'currency_code' => $order->currency_code ?? data_get($order, 'branch.region.currency_code', 'KES'),
                    'payment_method' => $payment ? ucfirst($payment->gateway) : '—',
                    'time' => $order->created_at?->diffForHumans() ?? 'Just now',
                    'cashier' => data_get($order, 'tillSession.user.name', 'Register'),
                ];
            });

        $todayOrders = Order::query()
            ->where('status', 'completed')
            ->whereDate('created_at', today())
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query
                ->whereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $regionId)));

        $activeUsers = User::query()
            ->where('is_active', true)
            ->whereHas('roles')
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query
                ->where(function ($inner) use ($regionId) {
                    $inner->where('region_id', $regionId)
                        ->orWhereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $regionId));
                }));

        $lowStock = StockLevel::query()
            ->whereColumn('quantity_on_hand', '<=', 'reorder_point')
            ->when($scopedBranchId, fn ($query, $branchId) => $query
                ->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->where('branch_id', $branchId)))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query
                ->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery
                    ->whereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $regionId))));

        $regionQuery = Region::query()->withCount('branches');

        if ($scopedBranchId) {
            $regionQuery->whereHas('branches', fn ($query) => $query->where('id', $scopedBranchId));
        } elseif ($scopedRegionId) {
            $regionQuery->where('id', $scopedRegionId);
        }

        return Inertia::render('admin/dashboard', [
            'regions' => $regionQuery->get(['id', 'name', 'currency_code', 'is_active']),
            'branches' => $branches,
            'recent_sales' => $recentSales,
            'metrics' => [
                'total_sales_today' => (float) (clone $todayOrders)->sum('total'),
                'total_orders_today' => (clone $todayOrders)->count(),
                'active_branches' => (clone $branchQuery)->count(),
                'active_users' => $activeUsers->count(),
                'low_stock_items' => $lowStock->count(),
            ],
            'permissions' => $user ? $user->getAllPermissions()->pluck('name')->toArray() : [],
            'is_superadmin' => $user ? $user->hasRole('Superadmin') : false,
        ]);
    }
}
