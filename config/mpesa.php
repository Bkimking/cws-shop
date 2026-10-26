<?php

return [
    'consumer_key' => env('MPESA_CONSUMER_KEY'),
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),
    'shortcode' => env('MPESA_SHORTCODE', '174379'),
    'passkey' => env('MPESA_PASSKEY'),
    'enabled' => env('MPESA_ENABLED', true),
    'fake' => env('MPESA_FAKE', false),
    'env' => env('MPESA_ENV', 'sandbox'),
    'callback_url' => env('MPESA_CALLBACK_URL'),
    'callback_secret' => env('MPESA_CALLBACK_SECRET'),
    'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
    'pending_timeout_minutes' => env('MPESA_PENDING_TIMEOUT_MINUTES', 5),
    'hard_timeout_minutes' => env('MPESA_HARD_TIMEOUT_MINUTES', 30),
    'reconcile_limit' => env('MPESA_RECONCILE_LIMIT', 50),
    'base_url' => env('MPESA_ENV', 'sandbox') === 'sandbox'
                            ? 'https://sandbox.safaricom.co.ke'
                            : 'https://api.safaricom.co.ke',
];
