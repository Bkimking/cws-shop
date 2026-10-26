<?php

namespace App\Http\Middleware;

use App\Ai\AiSettings;
use App\Services\MpesaStkService;
use App\Services\ShopCartService;
use App\Tour\TourService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $aiSettings = app(AiSettings::class);
        $tourSteps = $user ? app(TourService::class)->stepsFor($user) : [];
        $tourCompleted = $user !== null ? ($user->tour_completed_steps ?? []) : [];
        $tourCurrent = $user?->tour_current_step;
        $tourResume = $tourCurrent;

        if ($tourResume === null || in_array($tourResume, $tourCompleted, true)) {
            $tourResume = collect($tourSteps)
                ->pluck('key')
                ->first(fn (string $key) => ! in_array($key, $tourCompleted, true));
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user()?->getRoleNames()->all() ?? [],
                'permissions' => $request->user()?->getAllPermissions()->pluck('name')->all() ?? [],
            ],
            'shop' => [
                'cart_count' => app(ShopCartService::class)->count(),
                'mpesa_enabled' => app(MpesaStkService::class)->isConfigured(),
                'paypal_enabled' => (bool) config('paypal.enabled'),
            ],
            'tour' => [
                'steps' => $tourSteps,
                'completed_steps' => $tourCompleted,
                'current_step' => $tourCurrent,
                'resume_step' => $tourResume,
                'started' => $tourCurrent !== null,
                'should_prompt' => $user !== null
                    && $user->tour_completed_at === null
                    && $user->tour_skipped_at === null
                    && $tourSteps !== [],
                'completed_at' => $user?->tour_completed_at?->toIso8601String(),
                'skipped_at' => $user?->tour_skipped_at?->toIso8601String(),
                'guide_url' => $user?->can('access admin panel') ? route('admin.guide.index') : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'ai' => [
                'enabled' => $user ? $aiSettings->enabledFor('admin_chat', $user->region) : false,
                'can_use' => $user?->can('use ai assistant') ?? false,
                'can_view_insights' => $user?->can('view ai insights') ?? false,
                'can_manage' => $user?->can('manage ai settings') ?? false,
                'provider_configured' => $aiSettings->providerConfigured(),
            ],
            'flash' => [
                'toast' => $request->session()->get('toast'),
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'z_report' => $request->session()->get('z_report'),
            ],
        ];
    }
}
