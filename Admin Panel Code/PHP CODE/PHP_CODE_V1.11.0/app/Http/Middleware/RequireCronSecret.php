<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireCronSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.cron.secret');

        if (!is_string($secret) || $secret === '') {
            return response()->json(['message' => 'Cron endpoint is not configured.'], 503);
        }

        $providedSecret = $request->header('X-Cron-Secret');
        if (!is_string($providedSecret) || !hash_equals($secret, $providedSecret)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
