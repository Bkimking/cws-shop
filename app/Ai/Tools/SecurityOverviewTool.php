<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Stringable;

class SecurityOverviewTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Summarises security risks: inactive accounts, unverified emails, users without roles or scope, Superadmins without 2FA, active sessions and recent access changes. Superadmin only.';
    }

    public function handle(Request $request): string
    {
        $this->ensureSuperadmin();

        $inactive = AiReadOnly::query(User::class)->where('is_active', false)->count();
        $unverified = AiReadOnly::query(User::class)->whereNull('email_verified_at')->count();
        $withoutRole = AiReadOnly::query(User::class)->whereDoesntHave('roles')->count();
        $withoutScope = AiReadOnly::query(User::class)
            ->whereNull('branch_id')
            ->whereNull('region_id')
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'Superadmin'))
            ->count();
        $superadmins = AiReadOnly::query(User::class)
            ->whereHas('roles', fn ($query) => $query->where('name', 'Superadmin'))
            ->count();
        $superadminsWithoutTwoFactor = AiReadOnly::query(User::class)
            ->whereHas('roles', fn ($query) => $query->where('name', 'Superadmin'))
            ->whereNull('two_factor_confirmed_at')
            ->count();

        $connection = AiReadOnly::connection();
        $activeSessions = DB::connection($connection)
            ->table('sessions')
            ->where('last_activity', '>=', now()->subDay()->timestamp)
            ->whereNotNull('user_id')
            ->count();

        $recentSecurityEvents = DB::connection($connection)
            ->table('activity_log')
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('subject_type', [User::class, Role::class, Permission::class])
            ->count();

        $failedLogins = AiReadOnly::query(LoginAttempt::class)
            ->where('created_at', '>=', now()->subDay())
            ->count();

        $rows = [
            $this->row('Inactive staff accounts', $inactive, 'medium', 'Review and remove access for staff who have left.'),
            $this->row('Unverified email addresses', $unverified, 'medium', 'Require verification before granting back-office access.'),
            $this->row('Users without a role', $withoutRole, 'high', 'Assign the correct least-privilege role immediately.'),
            $this->row('Users without branch or region scope', $withoutScope, 'medium', 'Assign a branch/region or confirm Superadmin access.'),
            $this->row('Superadmins without 2FA', $superadminsWithoutTwoFactor, 'high', 'Require 2FA or a passkey for every Superadmin.'),
            $this->row('Failed sign-ins in the last 24h', $failedLogins, 'medium', 'Check repeated failures for password guessing or locked-out staff.'),
            $this->row('Active sessions in the last 24h', $activeSessions, 'info', 'Confirm these sessions belong to active staff.'),
            $this->row('Access changes in the last 30 days', $recentSecurityEvents, 'info', 'Review role, permission and user changes for unexpected grants.'),
        ];

        return AiToolResult::make(
            $this->scope,
            'Security overview: '.$rows[0]['count'].' inactive, '.$rows[1]['count'].' unverified, '
                .$rows[2]['count'].' without roles, '.$superadminsWithoutTwoFactor.' Superadmins without 2FA.',
            $rows,
            [
                ['key' => 'risk', 'label' => 'Risk'],
                ['key' => 'count', 'label' => 'Count'],
                ['key' => 'severity', 'label' => 'Severity'],
                ['key' => 'recommendation', 'label' => 'Recommendation'],
            ],
            [['label' => 'Activity log', 'url' => route('admin.activity.index')]],
            null,
            ['superadmins' => $superadmins],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    /**
     * @return array{risk: string, count: int, severity: string, recommendation: string}
     */
    private function row(string $risk, int $count, string $severity, string $recommendation): array
    {
        return [
            'risk' => $risk,
            'count' => $count,
            'severity' => $severity,
            'recommendation' => $recommendation,
        ];
    }

    private function ensureSuperadmin(): void
    {
        if (! $this->scope->user->hasRole('Superadmin')) {
            throw new AuthorizationException('Security data is restricted to Superadmin.');
        }
    }
}
