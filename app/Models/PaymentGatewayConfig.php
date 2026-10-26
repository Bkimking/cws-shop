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
 * @property int $region_id
 * @property string $gateway
 * @property bool $is_enabled
 * @property array|null $encrypted_credentials
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Region $region
 */
#[Fillable(['region_id', 'gateway', 'is_enabled', 'encrypted_credentials'])]

class PaymentGatewayConfig extends Model
{
    use HasFactory, LogsActivity;

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'encrypted_credentials' => 'encrypted:array',
        ];
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
