<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int $product_variant_id
 * @property int $quantity
 * @property string $unit_price
 * @property string $discount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 * @property-read ProductVariant $productVariant
 */
#[Fillable(['order_id', 'product_variant_id', 'quantity', 'unit_price', 'discount'])]

class OrderItem extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'discount' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
