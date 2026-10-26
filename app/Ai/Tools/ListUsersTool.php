<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ListUsersTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists staff users, roles, branch, active/verification state, 2FA state and last session activity. Superadmin only.';
    }

    public function handle(Request $request): string
    {
        $this->ensureSuperadmin();

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = AiReadOnly::query(User::class)
            ->with(['roles:id,name', 'branch:id,name', 'region:id,name']);

        if (filled($validated['search'] ?? null)) {
            $search = $validated['search'];
            $query->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (filled($validated['role'] ?? null)) {
            $query->whereHas('roles', fn ($roleQuery) => $roleQuery->where('name', $validated['role']));
        }

        if (($validated['status'] ?? null) === 'active') {
            $query->where('is_active', true);
        }

        if (($validated['status'] ?? null) === 'inactive') {
            $query->where('is_active', false);
        }

        /** @var Collection<int, User> $users */
        $users = $query->orderBy('name')->limit($validated['limit'] ?? 25)->get();
        $connection = AiReadOnly::connection();

        $rows = $users->map(function (User $user) use ($connection): array {
            $lastActivity = DB::connection($connection)
                ->table('sessions')
                ->where('user_id', $user->id)
                ->max('last_activity');

            $passkeys = DB::connection($connection)
                ->table('passkeys')
                ->where('user_id', $user->id)
                ->count();

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->all(),
                'branch' => $user->branch?->name,
                'region' => $user->region?->name,
                'active' => (bool) $user->is_active,
                'email_verified' => $user->email_verified_at !== null,
                'two_factor' => $user->two_factor_confirmed_at !== null,
                'passkeys' => $passkeys,
                'last_activity' => $lastActivity
                    ? CarbonImmutable::createFromTimestamp($lastActivity)->toDateTimeString()
                    : null,
            ];
        })->all();

        return AiToolResult::make(
            $this->scope,
            count($rows).' staff users found.',
            $rows,
            [
                ['key' => 'name', 'label' => 'Name'],
                ['key' => 'roles', 'label' => 'Roles'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'active', 'label' => 'Active'],
                ['key' => 'two_factor', 'label' => '2FA'],
            ],
            [['label' => 'Users', 'url' => route('admin.users.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'search' => $schema->string()->description('Search name or email.'),
            'role' => $schema->string()->description('Filter by exact role name.'),
            'status' => $schema->string()->description('active or inactive.'),
            'limit' => $schema->integer()->min(1)->max(50)->description('Maximum rows, default 25.'),
        ];
    }

    private function ensureSuperadmin(): void
    {
        if (! $this->scope->user->hasRole('Superadmin')) {
            throw new AuthorizationException('Security data is restricted to Superadmin.');
        }
    }
}
