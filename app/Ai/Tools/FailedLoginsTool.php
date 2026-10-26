<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\LoginAttempt;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class FailedLoginsTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists recent failed staff sign-in attempts with email, IP and time. It never returns passwords or credentials. Superadmin only.';
    }

    public function handle(Request $request): string
    {
        $this->ensureSuperadmin();

        [$from, $to] = $this->dateRange($request, $this->scope);
        $limit = max(1, min(100, (int) ($request['limit'] ?? 30)));

        $attempts = AiReadOnly::query(LoginAttempt::class)
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        /** @var Collection<int, LoginAttempt> $attempts */
        $rows = $attempts->map(fn (LoginAttempt $attempt) => [
            'email' => $attempt->email,
            'user' => data_get($attempt, 'user.name', 'Unknown account'),
            'ip' => $attempt->ip ?? '—',
            'time' => $attempt->created_at?->toDateTimeString(),
            'guard' => $attempt->guard,
        ])->all();

        return AiToolResult::make(
            $this->scope,
            $this->dateLabel($from, $to, $this->scope).': '.count($rows).' failed sign-in attempt(s).',
            $rows,
            [
                ['key' => 'email', 'label' => 'Email'],
                ['key' => 'user', 'label' => 'Account'],
                ['key' => 'ip', 'label' => 'IP'],
                ['key' => 'time', 'label' => 'Time'],
            ],
            [['label' => 'Activity log', 'url' => route('admin.activity.index')]],
            null,
            ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->description('Start date, YYYY-MM-DD.'),
            'to' => $schema->string()->description('End date, YYYY-MM-DD.'),
            'limit' => $schema->integer()->min(1)->max(100)->description('Maximum rows, default 30.'),
        ];
    }

    private function ensureSuperadmin(): void
    {
        if (! $this->scope->user->hasRole('Superadmin')) {
            throw new AuthorizationException('Security data is restricted to Superadmin.');
        }
    }
}
