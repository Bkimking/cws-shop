<?php

namespace App\Models;

use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property string $gateway
 * @property string $amount
 * @property string $status
 * @property Carbon|null $expires_at
 * @property Carbon|null $last_checked_at
 * @property string|null $failure_reason
 * @property string|null $gateway_reference
 * @property array<string, mixed>|null $raw_response
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'gateway', 'amount', 'status', 'expires_at', 'last_checked_at', 'failure_reason', 'gateway_reference', 'raw_response'])]

class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'raw_response' => 'array',
            'expires_at' => 'datetime',
            'last_checked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
