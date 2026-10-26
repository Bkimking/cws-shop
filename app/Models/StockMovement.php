<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $warehouse_id
 * @property int $product_variant_id
 * @property int $quantity
 * @property string $type
 * @property string $reference_id
 * @property int|null $created_by
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Warehouse $warehouse
 * @property-read ProductVariant $productVariant
 * @property-read User|null $createdBy
 */
#[Fillable(['warehouse_id', 'product_variant_id', 'quantity', 'type', 'reference_id', 'created_by', 'notes'])]

class StockMovement extends Model
{
    use HasFactory;

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
