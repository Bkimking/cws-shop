<?php

namespace App\Ai\Tools;

use App\Ai\ShopToolResult;
use App\Models\Branch;
use App\Models\Order;
use App\Models\ShopGuest;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ShopOrderStatusTool implements Tool
{
    public function __construct(
        protected Branch $branch,
        protected ShopGuest $guest,
    ) {}

    public function description(): Stringable|string
    {
        return 'Shows this visitor’s own recent orders and pickup status. Use it when they ask where their order is, whether it is ready, or when to collect it.';
    }

    public function handle(Request $request): string
    {
        $query = Order::query()
            ->with(['payments:id,order_id,status,gateway', 'pickupWarehouse:id,name'])
            ->where('shop_guest_id', $this->guest->id)
            ->where('branch_id', $this->branch->id);

        $reference = trim((string) ($request['order_number'] ?? ''));

        if ($reference !== '') {
            $digits = preg_replace('/\D+/', '', $reference) ?? '';
            $query->where(function ($orderQuery) use ($reference, $digits) {
                $orderQuery->where('public_token', $reference);

                if ($digits !== '') {
                    $orderQuery->orWhereKey((int) $digits);
                }
            });
        }

        $orders = $query->latest('created_at')->take(5)->get();

        $rows = $orders->map(function (Order $order): array {
            $payment = $order->payments->first();

            return [
                'order' => '#'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT),
                'status' => $order->status,
                'pickup_status' => $order->pickup_status,
                'payment' => data_get($order, 'payments.0.status', 'unknown'),
                'pickup' => data_get($order, 'pickupWarehouse.name', $this->branch->name),
                'ready' => $order->pickup_ready_at?->toDateTimeString(),
                'total' => (float) $order->total,
                'currency' => $order->currency_code,
                'placed' => $order->created_at?->diffForHumans(),
            ];
        })->all();

        $latest = $orders->first();

        $summary = match (true) {
            $latest === null => 'No orders found for this visitor at '.$this->branch->name.'.',
            $latest->pickup_status === 'collected' => 'Your latest order '.$this->orderNumber($latest).' has been collected.',
            $latest->pickup_status === 'ready' => 'Your latest order '.$this->orderNumber($latest).' is ready for pickup at '.(data_get($latest, 'pickupWarehouse.name', $this->branch->name)).'.',
            $latest->status === 'completed' => 'Your latest order '.$this->orderNumber($latest).' is paid and being prepared for pickup at '.(data_get($latest, 'pickupWarehouse.name', $this->branch->name)).'.',
            $latest->status === 'cancelled' => 'Your latest order '.$this->orderNumber($latest).' was cancelled and its stock was released.',
            default => 'Your latest order '.$this->orderNumber($latest).' is still pending payment confirmation.',
        };

        return ShopToolResult::make(
            $this->branch,
            $summary,
            $rows,
            [
                ['key' => 'order', 'label' => 'Order'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'pickup', 'label' => 'Pickup'],
                ['key' => 'ready', 'label' => 'Ready'],
            ],
            [['label' => 'Shop', 'url' => route('shop.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'order_number' => $schema->string()->description('Optional order number or public token.'),
        ];
    }

    private function orderNumber(Order $order): string
    {
        return '#'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);
    }
}
