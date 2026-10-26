<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\OrderStockService;
use App\Services\PickupService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Order::class);

        $query = Order::with(['branch.region', 'customer', 'payments', 'tillSession.user'])
            ->orderBy('created_at', 'desc');

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        } elseif ($scopedRegionId) {
            $query->whereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $scopedRegionId));
        }

        return Inertia::render('admin/orders/index', [
            'orders' => $query->paginate(15),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Order::class);

        return Inertia::render('admin/orders/create', [
            'branches' => $this->visibleBranches($request),
            'customers' => $this->visibleCustomers($request),
        ]);
    }

    public function store(StoreOrderRequest $request, OrderStockService $stock): RedirectResponse
    {
        $this->authorize('create', Order::class);

        $branch = $this->resolveBranch($request, (int) $request->input('branch_id'));
        $this->assertCustomerInBranchScope($request->input('customer_id'), $branch);

        return DB::transaction(function () use ($request, $stock) {
            $order = Order::create([
                'branch_id' => $request->input('branch_id'),
                'customer_id' => $request->input('customer_id'),
                'source' => $request->input('source'),
                'status' => $request->input('status'),
                'subtotal' => $request->input('subtotal'),
                'tax' => $request->input('tax'),
                'total' => $request->input('total'),
                'currency_code' => $request->input('currency_code'),
            ]);

            foreach ($request->input('items') as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'] ?? 0,
                ]);
            }

            foreach ($request->input('payments', []) as $payment) {
                Payment::create([
                    'order_id' => $order->id,
                    'gateway' => $payment['gateway'],
                    'amount' => $payment['amount'],
                    'status' => 'completed',
                ]);
            }

            if ($order->status === 'completed') {
                $order->load('items.productVariant.product');
                $stock->deduct($order, $request->user());
            }

            return redirect()->route('admin.orders.show', $order)
                ->with('success', 'Order created successfully.');
        });
    }

    public function show(Order $order): Response
    {
        $this->authorize('view', $order);

        $order->load(['items.productVariant.product', 'branch', 'customer', 'payments', 'pickupWarehouse', 'collectedBy:id,name']);

        return Inertia::render('admin/orders/show', [
            'order' => $order,
        ]);
    }

    public function edit(Request $request, Order $order): Response
    {
        $this->authorize('update', $order);

        $order->load(['items.productVariant.product', 'branch', 'customer']);

        return Inertia::render('admin/orders/edit', [
            'order' => $order,
            'branches' => $this->visibleBranches($request),
            'customers' => $this->visibleCustomers($request),
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order, OrderStockService $stock): RedirectResponse
    {
        $this->authorize('update', $order);

        $newStatus = $request->input('status', $order->status);
        $itemsChanged = $request->has('items');
        $wasCompleted = $order->status === 'completed';

        $needsRestock = $wasCompleted && ($itemsChanged || $newStatus !== 'completed');
        $needsDeduct = $newStatus === 'completed' && (! $wasCompleted || $itemsChanged);

        return DB::transaction(function () use ($request, $order, $stock, $newStatus, $itemsChanged, $needsRestock, $needsDeduct) {
            if ($needsRestock) {
                $stock->restock($order, $request->user());
            }

            $order->status = $newStatus;

            if ($request->has('subtotal')) {
                $order->subtotal = $request->input('subtotal');
            }

            if ($request->has('tax')) {
                $order->tax = $request->input('tax');
            }

            if ($request->has('total')) {
                $order->total = $request->input('total');
            }

            $order->save();

            if ($itemsChanged) {
                $order->items()->delete();

                foreach ($request->input('items') as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_variant_id' => $item['product_variant_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount' => $item['discount'] ?? 0,
                    ]);
                }
            }

            if ($needsDeduct) {
                $order->load('items.productVariant.product');
                $stock->deduct($order, $request->user());
            }

            return redirect()->route('admin.orders.show', $order)
                ->with('success', 'Order updated successfully.');
        });
    }

    public function pickupReady(Request $request, Order $order, PickupService $pickup): RedirectResponse
    {
        $this->authorize('managePickup', $order);

        $pickup->markReady($order, $request->user());

        return back()->with('success', 'Order marked ready for pickup. The customer has been notified if an email is on file.');
    }

    public function pickupCollected(Request $request, Order $order, PickupService $pickup): RedirectResponse
    {
        $this->authorize('managePickup', $order);

        $pickup->markCollected($order, $request->user());

        return back()->with('success', 'Order marked collected.');
    }

    public function refund(Request $request, Order $order, OrderStockService $stock): RedirectResponse
    {
        $this->authorize('refund', $order);

        if ($order->status === 'cancelled') {
            return back()->with('error', 'Cannot refund a cancelled order.');
        }

        return DB::transaction(function () use ($request, $order, $stock) {
            if ($order->status === 'completed') {
                $stock->restock($order, $request->user());
            }

            $order->status = 'cancelled';
            $order->save();

            foreach ($order->payments as $payment) {
                $payment->status = 'refunded';
                $payment->save();
            }

            return back()->with('success', 'Order refunded successfully.');
        });
    }

    private function resolveBranch(Request $request, int $branchId): Branch
    {
        $branch = Branch::with('region')->findOrFail($branchId);

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if ($scopedBranchId && (int) $branch->id !== (int) $scopedBranchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'You can only create orders for your own branch.',
            ]);
        }

        if (! $scopedBranchId && $scopedRegionId && (int) $branch->region_id !== (int) $scopedRegionId) {
            throw ValidationException::withMessages([
                'branch_id' => 'You can only create orders inside your own region.',
            ]);
        }

        return $branch;
    }

    private function assertCustomerInBranchScope(?int $customerId, Branch $branch): void
    {
        if (! $customerId) {
            return;
        }

        $customer = Customer::find($customerId);

        if (! $customer || (int) $customer->region_id !== (int) $branch->region_id) {
            throw ValidationException::withMessages([
                'customer_id' => 'The customer must belong to the branch region.',
            ]);
        }
    }

    /**
     * @return Collection<int, Branch>
     */
    private function visibleBranches(Request $request)
    {
        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        return Branch::query()
            ->select('id', 'name')
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId))
            ->orderBy('name')
            ->get();
    }

    /**
     * @return Collection<int, Customer>
     */
    private function visibleCustomers(Request $request)
    {
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        return Customer::query()
            ->select('id', 'name')
            ->when($scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId))
            ->orderBy('name')
            ->get();
    }
}
