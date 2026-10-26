<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class UserAccessTool implements Tool
{
    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Shows one staff user’s roles, permissions, scope, 2FA, passkeys and last session. Superadmin only. Never returns secrets.';
    }

    public function handle(Request $request): string
    {
        $this->ensureSuperadmin();

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ]);

        if (blank($validated['user_id'] ?? null) && blank($validated['email'] ?? null)) {
            throw ValidationException::withMessages([
                'user_id' => 'Provide a user_id or email.',
            ]);
        }

        $query = AiReadOnly::query(User::class)
            ->with(['roles:id,name', 'branch:id,name', 'region:id,name']);

        $userId = $validated['user_id'] ?? null;

        /** @var User|null $user */
        $user = $userId !== null
            ? $query->find($userId)
            : $query->where('email', $validated['email'])->first();

        if (! $user) {
            return AiToolResult::make($this->scope, 'No matching staff user found.');
        }

        $connection = AiReadOnly::connection();
        $lastActivity = DB::connection($connection)
            ->table('sessions')
            ->where('user_id', $user->id)
            ->max('last_activity');
        $passkeys = DB::connection($connection)
            ->table('passkeys')
            ->where('user_id', $user->id)
            ->count();

        $row = [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values()->all(),
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

        return AiToolResult::make(
            $this->scope,
            'Access profile for '.$user->name.'.',
            [$row],
            [
                ['key' => 'name', 'label' => 'Name'],
                ['key' => 'roles', 'label' => 'Roles'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'two_factor', 'label' => '2FA'],
            ],
            [['label' => 'Users', 'url' => route('admin.users.index')]],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'user_id' => $schema->integer()->description('User ID.'),
            'email' => $schema->string()->description('User email if ID is unknown.'),
        ];
    }

    private function ensureSuperadmin(): void
    {
        if (! $this->scope->user->hasRole('Superadmin')) {
            throw new AuthorizationException('Security data is restricted to Superadmin.');
        }
    }
}
