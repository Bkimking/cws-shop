<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $warehouse_id
 * @property int $product_variant_id
 * @property int $quantity_on_hand
 * @property int $reorder_point
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Warehouse $warehouse
 * @property-read ProductVariant $productVariant
 */
#[Fillable(['warehouse_id', 'product_variant_id', 'quantity_on_hand', 'reorder_point'])]

class StockLevel extends Model
{
    use HasFactory, LogsActivity;

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
