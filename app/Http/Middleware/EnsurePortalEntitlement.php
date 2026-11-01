<?php

namespace App\Http\Middleware;

use App\Services\Portal\EntitlementService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalEntitlement
{
    public function __construct(private readonly EntitlementService $entitlements) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->entitlements->current() === null || $this->entitlements->allowsSales()) {
            return $next($request);
        }

        $message = 'This CWSPOS installation is suspended. Contact support or view billing instructions.';

        if ($request->is('admin/*') && $request->user()?->getRoleNames()->contains('Superadmin')) {
            return $next($request);
        }

        if ($request->is('admin/*')) {
            return redirect('/system/suspended');
        }

        if ($request->expectsJson() || $request->is('pos/*') || $request->is('api/*')) {
            return response()->json([
                'message' => $message,
                'code' => 'system_suspended',
                'entitlement' => $this->entitlements->frontend(),
            ], 423);
        }

        return redirect()->back()->with('error', $message);
    }
}
