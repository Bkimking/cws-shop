<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Activitylog\Models\Concerns\CausesActivity;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property int|null $branch_id
 * @property int|null $region_id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property Carbon|null $tour_completed_at
 * @property Carbon|null $tour_skipped_at
 * @property string|null $tour_current_step
 * @property array<int, string>|null $tour_completed_steps
 * @property bool $is_active
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Branch|null $branch
 * @property-read Region|null $region
 * @property-read Collection<int, TillSession> $tillSessions
 * @property-read Collection<int, StockMovement> $stockMovements
 * @property-read Collection<int, FcmToken> $fcmTokens
 * @property-read Collection<int, Permission> $permissions
 * @property-read Collection<int, Role> $roles
 */
#[Fillable(['branch_id', 'region_id', 'name', 'email', 'password', 'is_active', 'tour_completed_at', 'tour_skipped_at', 'tour_current_step', 'tour_completed_steps'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use CausesActivity, HasConversations, HasFactory, HasRoles, LogsActivity, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'tour_completed_at' => 'datetime',
            'tour_skipped_at' => 'datetime',
            'tour_completed_steps' => 'array',
        ];
    }

    public function canAccessApplication(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->roles->contains(fn ($role) => strcasecmp($role->name, 'Superadmin') === 0) || $this->hasRole('Superadmin')) {
            return true;
        }

        if ($this->branch_id !== null) {
            $this->loadMissing(['branch.region']);

            if (! $this->branch?->is_active) {
                return false;
            }

            if ($this->branch->region && ! $this->branch->region->is_active) {
                return false;
            }
        }

        if ($this->region_id !== null) {
            $this->loadMissing('region');

            if (! $this->region?->is_active) {
                return false;
            }
        }

        return true;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function effectiveRegionId(): ?int
    {
        return $this->region_id ?? $this->branch?->region_id;
    }

    public function tillSessions(): HasMany
    {
        return $this->hasMany(TillSession::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'created_by');
    }

    public function fcmTokens(): HasMany
    {
        return $this->hasMany(FcmToken::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
