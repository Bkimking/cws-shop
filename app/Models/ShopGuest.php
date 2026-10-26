<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Ai\Models\Conversation;

/**
 * @property int $id
 * @property string $token
 * @property string|null $email
 * @property string|null $phone
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Order> $orders
 * @property-read Collection<int, Conversation> $conversations
 */
#[Fillable(['token', 'email', 'phone', 'last_seen_at'])]
class ShopGuest extends Model
{
    use HasConversations;

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
