<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $scope_key
 * @property int|null $region_id
 * @property string $surface
 * @property bool $enabled
 * @property int|null $daily_token_cap
 * @property string|null $daily_cost_cap
 */
#[Fillable([
    'scope_key',
    'region_id',
    'surface',
    'enabled',
    'daily_token_cap',
    'daily_cost_cap',
])]
class AiSetting extends Model
{
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'daily_token_cap' => 'integer',
            'daily_cost_cap' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }
}
