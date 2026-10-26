<x-mail::message>
# Your order is ready for pickup

Hi {{ $order->customer_name ?: 'there' }},

Your order **#{{ str_pad((string) $order->id, 4, '0', STR_PAD_LEFT) }}** is packed and ready. Please collect it at:

**{{ $pickup?->name ?? 'the pickup point' }}**  
{{ $pickup?->branch?->name ?? $branch?->name }}  
{{ $branch?->address }}

@if ($branch?->phone)
Questions? Call {{ $branch->phone }}.
@endif

<x-mail::table>
| Item | Qty | Total |
|:-----|:---:|------:|
@foreach ($order->items as $item)
| {{ $item->productVariant?->product?->name }} @if ($item->productVariant?->variant_name) ({{ $item->productVariant->variant_name }}) @endif | {{ $item->quantity }} | {{ $order->currency_code }} {{ number_format((float) $item->unit_price * (int) $item->quantity, 2) }} |
@endforeach
</x-mail::table>

**Total: {{ $order->currency_code }} {{ number_format((float) $order->total, 2) }}**

<x-mail::button :url="$orderUrl">
View pickup details
</x-mail::button>

Bring your order number when you collect. No shipping is involved — this is a pickup order.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
