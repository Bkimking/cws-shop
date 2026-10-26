<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $country_code
 * @property string $currency_code
 * @property string $tax_rate
 * @property string $timezone
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Branch> $branches
 * @property-read Collection<int, ProductRegionPrice> $productRegionPrices
 * @property-read Collection<int, PaymentGatewayConfig> $paymentGatewayConfigs
 * @property-read Collection<int, Customer> $customers
 */
#[Fillable(['name', 'slug', 'country_code', 'currency_code', 'tax_rate', 'timezone', 'is_active'])]

class Region extends Model
{
    use HasFactory, LogsActivity;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function productRegionPrices(): HasMany
    {
        return $this->hasMany(ProductRegionPrice::class);
    }

    public function paymentGatewayConfigs(): HasMany
    {
        return $this->hasMany(PaymentGatewayConfig::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
