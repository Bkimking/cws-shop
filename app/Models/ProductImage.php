<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $product_id
 * @property string $path
 * @property string|null $alt_text
 * @property int $sort_order
 * @property bool $is_primary
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Product $product
 * @property-read string $url
 */
#[Fillable(['product_id', 'path', 'alt_text', 'sort_order', 'is_primary'])]
class ProductImage extends Model
{
    protected $appends = ['url'];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean'];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
