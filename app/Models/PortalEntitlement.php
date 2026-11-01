<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalEntitlement extends Model
{
    protected $fillable = [
        'installation_id', 'status', 'plan_code', 'features',
        'period_end', 'grace_until', 'issued_at', 'snapshot_expires_at',
        'signature', 'raw_payload', 'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'period_end' => 'datetime',
            'grace_until' => 'datetime',
            'issued_at' => 'datetime',
            'snapshot_expires_at' => 'datetime',
            'raw_payload' => 'array',
            'fetched_at' => 'datetime',
        ];
    }
}
