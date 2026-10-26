<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $user_id
 * @property Carbon $opened_at
 * @property Carbon|null $closed_at
 * @property string $opening_cash
 * @property string $closing_cash
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Branch $branch
 * @property-read User $user
 */
#[Fillable(['branch_id', 'user_id', 'opened_at', 'closed_at', 'opening_cash', 'closing_cash', 'variance_reason', 'status'])]

class TillSession extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'decimal:2',
            'closing_cash' => 'decimal:2',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
