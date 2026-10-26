<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $email
 * @property int|null $user_id
 * @property string|null $ip
 * @property string|null $user_agent
 * @property string|null $guard
 * @property Carbon|null $created_at
 * @property-read User|null $user
 */
#[Fillable(['email', 'user_id', 'ip', 'user_agent', 'guard', 'created_at'])]
class LoginAttempt extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
