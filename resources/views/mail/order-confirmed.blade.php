<x-mail::message>
# Payment received

Hi {{ $order->customer_name ?: 'there' }},

We have received payment for order **#{{ str_pad((string) $order->id, 4, '0', STR_PAD_LEFT) }}**.

The team at **{{ $pickup?->name ?? $branch?->name ?? 'the shop' }}** is preparing your items. You will get another email when the order is ready for pickup.

<x-mail::table>
| Item | Qty | Total |
|:-----|:---:|------:|
@foreach ($order->items as $item)
| {{ $item->productVariant?->product?->name }} @if ($item->productVariant?->variant_name) ({{ $item->productVariant->variant_name }}) @endif | {{ $item->quantity }} | {{ $order->currency_code }} {{ number_format((float) $item->unit_price * (int) $item->quantity, 2) }} |
@endforeach
</x-mail::table>

**Total: {{ $order->currency_code }} {{ number_format((float) $order->total, 2) }}**

<x-mail::button :url="$orderUrl">
View order
</x-mail::button>

No shipping is involved — this is a pickup order.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
