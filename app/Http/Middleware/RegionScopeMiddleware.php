<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RegionScopeMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user->hasRole('Superadmin')) {
            $regionId = $user->effectiveRegionId();

            if (! $regionId) {
                abort(403, 'No region assigned to this account.');
            }

            $request->attributes->set('scoped_region_id', $regionId);
        }

        return $next($request);
    }
}
