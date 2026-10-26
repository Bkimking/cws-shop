<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BranchScopeMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user->hasRole(['Superadmin', 'Region Admin'])) {
            if (! $user->branch_id) {
                abort(403, 'No branch assigned to this account.');
            }

            $request->attributes->set('scoped_branch_id', $user->branch_id);
        }

        return $next($request);
    }
}
