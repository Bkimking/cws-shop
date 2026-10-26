<?php

namespace App\Providers;

use App\Http\Responses\LoginResponse;
use App\Models\Branch;
use App\Models\Category;
use App\Models\LoginAttempt;
use App\Models\Order;
use App\Models\PaymentGatewayConfig;
use App\Models\Product;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\User;
use App\Policies\AiConversationPolicy;
use App\Policies\BranchPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\OrderPolicy;
use App\Policies\PaymentGatewayPolicy;
use App\Policies\ProductPolicy;
use App\Policies\RegionPolicy;
use App\Policies\RolePolicy;
use App\Policies\StockPolicy;
use App\Policies\UserPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Ai\Events\AgentFailedOver;
use Laravel\Ai\Models\Conversation;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Spatie\Permission\Models\Role;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Region::class, RegionPolicy::class);
        Gate::policy(Branch::class, BranchPolicy::class);
        Gate::policy(Category::class, CategoryPolicy::class);
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(StockLevel::class, StockPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(PaymentGatewayConfig::class, PaymentGatewayPolicy::class);
        Gate::policy(Conversation::class, AiConversationPolicy::class);

        $this->configureRateLimiting();
        $this->configureAiFailoverLogging();
        $this->configureFailedLoginTracking();
        $this->configureDefaults();
    }

    protected function configureAiFailoverLogging(): void
    {
        Event::listen(AgentFailedOver::class, function (AgentFailedOver $event): void {
            Log::warning('AI provider failed over.', [
                'agent' => $event->agent::class,
                'provider' => $event->provider->name(),
                'model' => $event->model,
                'exception' => $event->exception::class,
            ]);
        });
    }

    protected function configureFailedLoginTracking(): void
    {
        Event::listen(Failed::class, function (Failed $event): void {
            $email = (string) ($event->credentials['email'] ?? '');

            if ($email === '') {
                return;
            }

            try {
                $user = $event->user ?? User::query()->where('email', $email)->first();

                LoginAttempt::create([
                    'email' => $email,
                    'user_id' => $user?->getKey(),
                    'ip' => request()->ip(),
                    'user_agent' => substr((string) request()->userAgent(), 0, 1000),
                    'guard' => $event->guard,
                    'created_at' => now(),
                ]);
            } catch (Throwable $exception) {
                Log::warning('Failed sign-in could not be recorded.', [
                    'message' => $exception->getMessage(),
                ]);
            }
        });
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('ai-chat', function (Request $request) {
            return Limit::perMinute((int) config('ai.limits.per_minute', 20))
                ->by($request->user()?->getAuthIdentifier() ?: $request->ip())
                ->response(fn () => response()->json([
                    'message' => 'Too many AI requests. Try again in a minute.',
                ], 429));
        });

        RateLimiter::for('shop-ai', function (Request $request) {
            return Limit::perMinute(10)
                ->by($request->ip())
                ->response(fn () => response()->json([
                    'message' => 'Too many shop assistant requests. Try again in a minute.',
                ], 429));
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
