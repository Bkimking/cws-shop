<?php

namespace App\Ai\Tools;

use App\Ai\AiReadOnly;
use App\Ai\AiScope;
use App\Ai\AiToolResult;
use App\Ai\Tools\Concerns\ResolvesDateRange;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Stringable;

class SecurityEventsTool implements Tool
{
    use ResolvesDateRange;

    public function __construct(protected AiScope $scope) {}

    public function description(): Stringable|string
    {
        return 'Lists recent user, role and permission activity from the audit log. It never returns attribute values or secrets. Superadmin only.';
    }

    public function handle(Request $request): string
    {
        $this->ensureSuperadmin();

        [$from, $to] = $this->dateRange($request, $this->scope);
        $limit = max(1, min(50, (int) ($request['limit'] ?? 25)));

        $events = DB::connection(AiReadOnly::connection())
            ->table('activity_log')
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('subject_type', [User::class, Role::class, Permission::class])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['description', 'event', 'subject_type', 'subject_id', 'causer_type', 'causer_id', 'created_at']);

        $causerIds = $events->pluck('causer_id')->filter()->unique();
        $causers = $causerIds->isEmpty()
            ? collect()
            : AiReadOnly::query(User::class)->whereIn('id', $causerIds)->pluck('name', 'id');

        $rows = $events->map(fn ($event) => [
            'event' => $event->event,
            'description' => $event->description,
            'subject' => class_basename($event->subject_type).' #'.$event->subject_id,
            'causer' => $causers[$event->causer_id] ?? 'System',
            'created_at' => (string) $event->created_at,
        ])->all();

        return AiToolResult::make(
            $this->scope,
            $this->dateLabel($from, $to, $this->scope).': '.count($rows).' security-related events.',
            $rows,
            [
                ['key' => 'event', 'label' => 'Event'],
                ['key' => 'description', 'label' => 'Description'],
                ['key' => 'subject', 'label' => 'Subject'],
                ['key' => 'causer', 'label' => 'Causer'],
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
