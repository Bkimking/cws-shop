<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $password
 * @property int $region_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Region $region
 * @property-read Collection<int, Cart> $carts
 * @property-read Collection<int, Order> $orders
 * @property-read Collection<int, FcmToken> $fcmTokens
 */
#[Fillable(['name', 'email', 'phone', 'password', 'region_id'])]

class Customer extends Authenticatable
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function carts(): HasMany
    {
        return $this->hasMany(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function fcmTokens(): HasMany
    {
        return $this->hasMany(FcmToken::class);
    }
}
