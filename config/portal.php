<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Portal connection
    |--------------------------------------------------------------------------
    | CWS does not own subscription state. It caches a signed snapshot from
    | the portal and keeps operating during a portal outage for the grace
    | period below.
    */
    'enabled' => (bool) env('PORTAL_ENABLED', true),
    'url' => env('PORTAL_URL', 'https://portal.codewithsky.co.ke'),
    'installation_id' => env('PORTAL_INSTALLATION_ID'),
    'api_key' => env('PORTAL_API_KEY'),
    'api_secret' => env('PORTAL_API_SECRET'),
    'signing_public_key' => env('PORTAL_SIGNING_PUBLIC_KEY'),

    'poll_minutes' => (int) env('PORTAL_POLL_MINUTES', 5),
    'grace_days' => (int) env('PORTAL_GRACE_DAYS', 14),

    /*
    |--------------------------------------------------------------------------
    | Control API
    |--------------------------------------------------------------------------
    | The portal is the only caller. Keep this API versioned and signed.
    */
    'control' => [
        'prefix' => 'api/control/v1',
        'tolerance_seconds' => (int) env('PORTAL_WEBHOOK_TOLERANCE_SECONDS', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Local cache
    |--------------------------------------------------------------------------
    | The signed snapshot is the source of truth while the portal is down.
    */
    'cache' => [
        'entitlement_ttl_hours' => (int) env('PORTAL_ENTITLEMENT_TTL_HOURS', 24),
    ],
];
