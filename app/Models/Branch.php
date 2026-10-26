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
 * @property int $region_id
 * @property string $name
 * @property string $slug
 * @property string $address
 * @property string $phone
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Region $region
 * @property-read Collection<int, Warehouse> $warehouses
 * @property-read Collection<int, TillSession> $tillSessions
 * @property-read Collection<int, Order> $orders
 * @property-read Collection<int, User> $users
 */
#[Fillable(['region_id', 'name', 'slug', 'address', 'phone', 'is_active'])]

class Branch extends Model
{
    use HasFactory, LogsActivity;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function tillSessions(): HasMany
    {
        return $this->hasMany(TillSession::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
