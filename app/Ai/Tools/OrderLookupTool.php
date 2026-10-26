<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\Order;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class OrderLookupTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Looks up one order in the scoped branch or region by order ID. Returns status, totals, items and payments.';
    }

    public function handle(Request $request): string
    {
        $orderId = (int) ($request['order_id'] ?? 0);

        $query = $this->scope->applyBranchRegion(
            AiReadOnly::query(Order::class)
                ->with([
                    'branch:id,name',
                    'customer:id,name',
                    'items.productVariant:id,product_id,variant_name,sku_suffix',
                    'items.productVariant.product:id,name,sku',
                    'payments:id,order_id,gateway,amount,status',
                ])
        );

        /** @var Order|null $order */
        $order = $query->whereKey($orderId)->first();

        if (! $order) {
            return AiToolResult::make(
                $this->scope,
                "No order #{$orderId} was found in {$this->scope->label()}.",
                [],
                [],
                [['label' => 'Orders', 'url' => route('admin.orders.index')]],
            );
        }

        $row = [
            'order' => '#'.$order->id,
            'status' => $order->status,
            'source' => $order->source,
            'branch' => $order->branch?->name,
            'customer' => $order->customer?->name,
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total,
            'currency' => $order->currency_code,
            'created_at' => $order->created_at?->toDateTimeString(),
            'items' => $order->items->map(fn ($item) => [
                'product' => $item->productVariant->product->name,
                'variant' => $item->productVariant->variant_name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount' => (float) $item->discount,
            ])->all(),
            'payments' => $order->payments->map(fn ($payment) => [
                'gateway' => $payment->gateway,
                'amount' => (float) $payment->amount,
                'status' => $payment->status,
            ])->all(),
        ];

        return AiToolResult::make(
            $this->scope,
            "Order #{$order->id} is {$order->status} in {$order->branch?->name}, total {$order->currency_code} ".number_format((float) $order->total, 2).'.',
            [$row],
            [
                ['key' => 'order', 'label' => 'Order'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'total', 'label' => 'Total'],
            ],
            [['label' => 'Order #'.$order->id, 'url' => route('admin.orders.show', $order)]],
            null,
            ['order_id' => $order->id],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'order_id' => $schema->integer()->min(1)->description('The numeric order ID.')->required(),
        ];
    }
}
