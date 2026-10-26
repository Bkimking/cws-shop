<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentGatewayConfig;
use App\Models\Product;
use App\Models\Region;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogsController extends Controller
{
    /**
     * Models surfaced in the UI subject-type filter.
     *
     * @var array<class-string, string>
     */
    protected const SUBJECT_MODELS = [
        Region::class => 'Region',
        Branch::class => 'Branch',
        User::class => 'User',
        Category::class => 'Category',
        Product::class => 'Product',
        Order::class => 'Order',
        PaymentGatewayConfig::class => 'Payment Gateway',
        Warehouse::class => 'Warehouse',
    ];

    protected const EVENT_OPTIONS = ['created', 'updated', 'deleted'];

    public function index(Request $request): Response
    {
        $this->ensureCanView($request);

        $filters = $this->extractFilters($request);
        $base = $this->scopedQuery($request);

        $activities = $this->applyFilters(clone $base, $filters)
            ->with(['causer', 'subject'])
            ->latest()
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('admin/activity/index', [
            'activities' => $this->transformPaginator($activities),
            'filters' => $filters,
            'filterOptions' => $this->filterOptions($request),
            'chart' => $this->chartData($base, $filters),
            'counts' => [
                'today' => (clone $base)->whereDate('created_at', today())->count(),
                'week' => (clone $base)->where('created_at', '>=', now()->subDays(7))->count(),
                'total' => (clone $base)->count(),
            ],
        ]);
    }

    public function region(Request $request, Region $region): JsonResponse
    {
        return $this->detailResponse($request, Region::class, (string) $region->id, $region->name);
    }

    public function branch(Request $request, Branch $branch): JsonResponse
    {
        return $this->detailResponse($request, Branch::class, (string) $branch->id, $branch->name);
    }

    public function user(Request $request, User $user): JsonResponse
    {
        $this->ensureCanView($request);

        $activities = $this->scopedQuery($request)
            ->where('causer_type', User::class)
            ->where('causer_id', $user->id)
            ->with(['causer', 'subject'])
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return response()->json([
            'subject' => [
                'type' => 'User',
                'type_full' => User::class,
                'id' => (string) $user->id,
                'label' => $user->name,
            ],
            'activities' => $this->transformPaginator($activities),
        ]);
    }

    public function category(Request $request, Category $category): JsonResponse
    {
        return $this->detailResponse($request, Category::class, (string) $category->id, $category->name);
    }

    public function product(Request $request, Product $product): JsonResponse
    {
        return $this->detailResponse($request, Product::class, (string) $product->id, $product->name);
    }

    public function order(Request $request, Order $order): JsonResponse
    {
        return $this->detailResponse($request, Order::class, (string) $order->id, "Order #{$order->id}");
    }

    public function paymentGateway(Request $request, PaymentGatewayConfig $payment_gateway_config): JsonResponse
    {
        return $this->detailResponse($request, PaymentGatewayConfig::class, (string) $payment_gateway_config->id, $payment_gateway_config->gateway);
    }

    public function warehouse(Request $request, Warehouse $warehouse): JsonResponse
    {
        return $this->detailResponse($request, Warehouse::class, (string) $warehouse->id, $warehouse->name);
    }

    protected function detailResponse(Request $request, string $subjectType, string $subjectId, string $label): JsonResponse
    {
        $this->ensureCanView($request);

        $activities = $this->scopedQuery($request)
            ->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId)
            ->with(['causer', 'subject'])
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return response()->json([
            'subject' => [
                'type' => class_basename($subjectType),
                'type_full' => $subjectType,
                'id' => $subjectId,
                'label' => $label,
            ],
            'activities' => $this->transformPaginator($activities),
        ]);
    }

    protected function ensureCanView(Request $request): void
    {
        abort_unless($request->user()?->can('view activity log'), 403);
    }

    /**
     * @return array{causer_id:?int,subject_type:?string,event:?string,from:?string,to:?string}
     */
    protected function extractFilters(Request $request): array
    {
        return [
            'causer_id' => $request->integer('causer_id') ?: null,
            'subject_type' => $this->validSubjectType($request->string('subject_type')->toString()),
            'event' => in_array($request->string('event')->toString(), self::EVENT_OPTIONS, true)
                ? $request->string('event')->toString()
                : null,
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
        ];
    }

    protected function validSubjectType(?string $type): ?string
    {
        if (! $type) {
            return null;
        }

        return array_key_exists($type, self::SUBJECT_MODELS) ? $type : null;
    }

    /**
     * Region/branch scoping.
     *
     * The activity_log table is polymorphic; we scope by the CAUSER's assignment
     * rather than the subject's, because a Region Admin cares about "what did
     * my people do" — the subject's region would exclude actions performed by
     * region staff on shared resources. Superadmin sees everything.
     */
    protected function scopedQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Activity::query();

        if ($user->hasRole('Superadmin')) {
            return $query;
        }

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if (! $scopedBranchId && ! $scopedRegionId) {
            return $query->where('causer_type', User::class)->where('causer_id', $user->id);
        }

        return $query->whereHasMorph('causer', [User::class], function (Builder $q) use ($scopedBranchId, $scopedRegionId) {
            if ($scopedBranchId) {
                $q->where('branch_id', $scopedBranchId);
            }
            if ($scopedRegionId) {
                $q->where(function (Builder $inner) use ($scopedRegionId) {
                    $inner->where('region_id', $scopedRegionId)
                        ->orWhereHas('branch', fn (Builder $b) => $b->where('region_id', $scopedRegionId));
                });
            }
        });
    }

    protected function applyFilters(Builder $query, array $filters): Builder
    {
        if (! empty($filters['causer_id'])) {
            $query->where('causer_type', User::class)
                ->where('causer_id', $filters['causer_id']);
        }
        if (! empty($filters['subject_type'])) {
            $query->where('subject_type', $filters['subject_type']);
        }
        if (! empty($filters['event'])) {
            $query->where('event', $filters['event']);
        }
        if (! empty($filters['from'])) {
            $query->where('created_at', '>=', Carbon::parse($filters['from'])->startOfDay());
        }
        if (! empty($filters['to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['to'])->endOfDay());
        }

        return $query;
    }

    protected function filterOptions(Request $request): array
    {
        $user = $request->user();
        $userQuery = User::query()->orderBy('name');

        if (! $user->hasRole('Superadmin')) {
            $scopedBranchId = $request->attributes->get('scoped_branch_id');
            $scopedRegionId = $request->attributes->get('scoped_region_id');

            if ($scopedBranchId) {
                $userQuery->where('branch_id', $scopedBranchId);
            } elseif ($scopedRegionId) {
                $userQuery->where(function (Builder $q) use ($scopedRegionId) {
                    $q->where('region_id', $scopedRegionId)
                        ->orWhereHas('branch', fn (Builder $b) => $b->where('region_id', $scopedRegionId));
                });
            }
        }

        return [
            'users' => $userQuery->get(['id', 'name', 'email']),
            'subject_types' => collect(self::SUBJECT_MODELS)
                ->map(fn (string $label, string $class) => ['value' => $class, 'label' => $label])
                ->values(),
            'events' => self::EVENT_OPTIONS,
        ];
    }

    /**
     * @return array<int, array{day:string,total:int}>
     */
    protected function chartData(Builder $base, array $filters): array
    {
        // Simplified chart data to avoid timeout - last 7 days only
        $from = now()->subDays(6)->startOfDay();
        $to = now()->endOfDay();

        $rows = $this->applyFilters(clone $base, $filters)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        $series = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $from->copy()->addDays($i);
            $key = $date->toDateString();
            $series[] = ['day' => $key, 'total' => (int) ($rows[$key] ?? 0)];
        }

        return $series;
    }

    protected function transformPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())
                ->map(fn (Activity $a) => $this->transformActivity($a))
                ->all(),
            'links' => $paginator->linkCollection()->toArray(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    protected function transformActivity(Activity $activity): array
    {
        $properties = $activity->properties;
        $old = $properties['old'] ?? [];
        $attributes = $properties['attributes'] ?? [];

        return [
            'id' => $activity->id,
            'log_name' => $activity->log_name,
            'description' => $activity->description,
            'event' => $activity->event,
            'subject' => [
                'type' => $activity->subject_type ? class_basename($activity->subject_type) : null,
                'type_full' => $activity->subject_type,
                'id' => $activity->subject_id,
                'label' => $activity->subject?->name ?? null,
            ],
            'causer' => $activity->causer ? [
                'id' => $activity->causer->id,
                'name' => $activity->causer->name,
                'email' => $activity->causer->email,
            ] : null,
            'changes' => [
                'old' => $old,
                'attributes' => $attributes,
            ],
            'created_at' => optional($activity->created_at)->toIso8601String(),
            'created_at_human' => optional($activity->created_at)->diffForHumans(),
            'created_at_date' => optional($activity->created_at)->toDateString(),
        ];
    }
}
