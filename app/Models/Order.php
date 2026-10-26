<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int|null $branch_id
 * @property int|null $pickup_warehouse_id
 * @property int|null $customer_id
 * @property int|null $shop_guest_id
 * @property string|null $customer_name
 * @property string|null $customer_email
 * @property string|null $customer_phone
 * @property Carbon|null $pickup_ready_at
 * @property Carbon|null $pickup_notified_at
 * @property Carbon|null $confirmation_notified_at
 * @property Carbon|null $collected_at
 * @property int|null $collected_by
 * @property string $source
 * @property string $status
 * @property string $pickup_status
 * @property string $subtotal
 * @property string $tax
 * @property string $total
 * @property string $currency_code
 * @property int|null $till_session_id
 * @property string|null $public_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Branch|null $branch
 * @property-read Warehouse|null $pickupWarehouse
 * @property-read Customer|null $customer
 * @property-read ShopGuest|null $shopGuest
 * @property-read Collection<int, OrderItem> $items
 * @property-read Collection<int, Payment> $payments
 */
#[Fillable(['public_token', 'branch_id', 'pickup_warehouse_id', 'customer_id', 'shop_guest_id', 'customer_name', 'customer_email', 'customer_phone', 'till_session_id', 'source', 'status', 'pickup_status', 'subtotal', 'tax', 'total', 'currency_code', 'pickup_ready_at', 'pickup_notified_at', 'confirmation_notified_at', 'collected_at', 'collected_by'])]

class Order extends Model
{
    use HasFactory, LogsActivity;

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'pickup_ready_at' => 'datetime',
            'pickup_notified_at' => 'datetime',
            'confirmation_notified_at' => 'datetime',
            'collected_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function pickupWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'pickup_warehouse_id');
    }

    public function collectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function shopGuest(): BelongsTo
    {
        return $this->belongsTo(ShopGuest::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function tillSession(): BelongsTo
    {
        return $this->belongsTo(TillSession::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
