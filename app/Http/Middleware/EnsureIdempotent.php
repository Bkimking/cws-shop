<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotent
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key') ?: $request->header('X-Idempotency-Key');

        if (! $request->isMethod('post') || blank($key)) {
            return $next($request);
        }

        $cacheKey = 'idempotency:'.sha1((string) $request->user()?->id.'|'.$key);
        $cached = Cache::get($cacheKey);

        if (is_array($cached) && isset($cached['status'], $cached['body'])) {
            return response()->json($cached['body'], (int) $cached['status']);
        }

        $response = $next($request);

        if ($response->getStatusCode() < 500) {
            $body = json_decode($response->getContent(), true);

            if (is_array($body)) {
                Cache::put($cacheKey, [
                    'status' => $response->getStatusCode(),
                    'body' => $body,
                ], now()->addDay());
            }
        }

        return $response;
    }
}
