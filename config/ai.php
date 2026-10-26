<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default AI Provider Names
    |--------------------------------------------------------------------------
    |
    | Here you may specify which of the AI providers below should be the
    | default for AI operations when no explicit provider is provided
    | for the operation. This should be any provider defined below.
    |
    */

    'default' => env('AI_PROVIDER', 'openai'),
    'default_for_images' => 'gemini',
    'default_for_audio' => 'openai',
    'default_for_transcription' => 'openai',
    'default_for_embeddings' => 'openai',
    'default_for_reranking' => 'cohere',
    'default_for_classification' => 'typesafe',

    /*
    |--------------------------------------------------------------------------
    | CWSPOS AI Settings
    |--------------------------------------------------------------------------
    |
    | These values are the deployment defaults. Runtime toggles and caps are
    | stored in ai_settings and resolved by App\Ai\AiSettingsService.
    |
    */

    'enabled' => env('AI_ENABLED', false),

    'models' => [
        'admin' => env('AI_ADMIN_MODEL'),
        'specialist' => env('AI_SPECIALIST_MODEL'),
        'shop' => env('AI_SHOP_MODEL'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Provider Failover
    |--------------------------------------------------------------------------
    |
    | The primary provider is `ai.default`. If it is rate-limited, unavailable
    | or otherwise failover-able, the SDK retries each configured fallback in
    | order. Missing API keys are skipped by App\Ai\AiProviders.
    |
    */

    'failover' => [
        'enabled' => env('AI_FAILOVER_ENABLED', true),
        'providers' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('AI_FAILOVER_PROVIDERS', 'gemini,anthropic,openai,mistral,groq,xai,openrouter')),
        ))),
        'models' => [
            'gemini' => env('AI_GEMINI_MODEL'),
            'anthropic' => env('AI_ANTHROPIC_MODEL'),
            'openai' => env('AI_OPENAI_MODEL'),
            'mistral' => env('AI_MISTRAL_MODEL'),
            'groq' => env('AI_GROQ_MODEL'),
            'xai' => env('AI_XAI_MODEL'),
            'openrouter' => env('AI_OPENROUTER_MODEL'),
            'openai-compatible' => env('AI_OPENAI_COMPATIBLE_MODEL'),
        ],
    ],

    'surfaces' => [
        'admin_chat' => env('AI_ADMIN_CHAT_ENABLED', true),
        'admin_insights' => env('AI_ADMIN_INSIGHTS_ENABLED', true),
        'shop_chat' => env('AI_SHOP_CHAT_ENABLED', false),
    ],

    'limits' => [
        'per_minute' => env('AI_RATE_LIMIT', 20),
        'admin_chat' => [
            'daily_tokens' => env('AI_ADMIN_DAILY_TOKENS', 200000),
            'daily_cost' => env('AI_ADMIN_DAILY_COST', 5.00),
        ],
        'shop_chat' => [
            'guest_messages' => env('AI_SHOP_GUEST_DAILY_MESSAGES', 30),
            'daily_tokens' => env('AI_SHOP_DAILY_TOKENS', 100000),
            'daily_cost' => env('AI_SHOP_DAILY_COST', 2.00),
        ],
        'global_daily_cost' => env('AI_GLOBAL_DAILY_COST', 25.00),
    ],

    /*
    |--------------------------------------------------------------------------
    | Usage Pricing
    |--------------------------------------------------------------------------
    |
    | Rates are per one million tokens. Set the rates for the providers you
    | use so daily cost budgets and cost reporting are meaningful.
    |
    */

    'pricing' => [
        'deepseek' => [
            'input' => env('AI_DEEPSEEK_INPUT_COST', 0.0),
            'output' => env('AI_DEEPSEEK_OUTPUT_COST', 0.0),
        ],
        'gemini' => [
            'input' => env('AI_GEMINI_INPUT_COST', 0.0),
            'output' => env('AI_GEMINI_OUTPUT_COST', 0.0),
        ],
        'anthropic' => [
            'input' => env('AI_ANTHROPIC_INPUT_COST', 0.0),
            'output' => env('AI_ANTHROPIC_OUTPUT_COST', 0.0),
        ],
        'openai' => [
            'input' => env('AI_OPENAI_INPUT_COST', 0.0),
            'output' => env('AI_OPENAI_OUTPUT_COST', 0.0),
        ],
        'groq' => [
            'input' => env('AI_GROQ_INPUT_COST', 0.0),
            'output' => env('AI_GROQ_OUTPUT_COST', 0.0),
        ],
        'mistral' => [
            'input' => env('AI_MISTRAL_INPUT_COST', 0.0),
            'output' => env('AI_MISTRAL_OUTPUT_COST', 0.0),
        ],
        'xai' => [
            'input' => env('AI_XAI_INPUT_COST', 0.0),
            'output' => env('AI_XAI_OUTPUT_COST', 0.0),
        ],
    ],

    'approvals' => [
        'mode' => env('AI_APPROVALS_MODE', 'always'),
        'stock_unit_threshold' => env('AI_APPROVAL_STOCK_UNITS', 50),
        'product_price_threshold' => env('AI_APPROVAL_PRODUCT_PRICE', 1000),
    ],

    'readonly_connection' => env('AI_DB_CONNECTION'),

    'retention' => [
        'staff_days' => env('AI_STAFF_RETENTION_DAYS', 90),
        'customer_days' => env('AI_CUSTOMER_RETENTION_DAYS', 30),
    ],

    'conversations' => [
        'connection' => env('AI_CONVERSATION_CONNECTION'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Caching
    |--------------------------------------------------------------------------
    |
    | Below you may configure caching strategies for AI related operations
    | such as embedding generation. You are free to adjust these values
    | based on your application's available caching stores and needs.
    |
    */

    'caching' => [
        'embeddings' => [
            'cache' => false,
            'store' => env('CACHE_STORE', 'database'),
            'individually' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Providers
    |--------------------------------------------------------------------------
    |
    | Below are each of your AI providers defined for this application. Each
    | represents an AI provider and API key combination which can be used
    | to perform tasks like text, image, and audio creation via agents.
    |
    */

    'providers' => [
        'anthropic' => [
            'driver' => 'anthropic',
            'key' => env('ANTHROPIC_API_KEY'),
            'url' => env('ANTHROPIC_URL', 'https://api.anthropic.com/v1'),
        ],

        'azure' => [
            'driver' => 'azure',
            'key' => env('AZURE_OPENAI_API_KEY'),
            'url' => env('AZURE_OPENAI_URL'),
            'api_version' => env('AZURE_OPENAI_API_VERSION', '2025-04-01-preview'),
            'deployment' => env('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-sol'),
            'embedding_deployment' => env('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-small'),
            'image_deployment' => env('AZURE_OPENAI_IMAGE_DEPLOYMENT', 'gpt-image-2.5-flare'),
            'store' => env('AZURE_OPENAI_STORE', true),
        ],

        'bedrock' => [
            'driver' => 'bedrock',
            'region' => env('AWS_BEDROCK_REGION', 'us-east-1'),
            'key' => env('AWS_BEARER_TOKEN_BEDROCK'),
            'access_key_id' => env('AWS_ACCESS_KEY_ID'),
            'secret_access_key' => env('AWS_SECRET_ACCESS_KEY'),
            'session_token' => env('AWS_SESSION_TOKEN'),
            'use_default_credential_provider' => env('AWS_USE_DEFAULT_CREDENTIALS', true),
            'assume_role' => [
                'arn' => env('AWS_BEDROCK_ASSUME_ROLE_ARN'),
                'session_name' => env('AWS_BEDROCK_ASSUME_ROLE_SESSION_NAME'),
                'duration_seconds' => env('AWS_BEDROCK_ASSUME_ROLE_DURATION_SECONDS'),
                'external_id' => env('AWS_BEDROCK_ASSUME_ROLE_EXTERNAL_ID'),
            ],
        ],

        'cohere' => [
            'driver' => 'cohere',
            'key' => env('COHERE_API_KEY'),
        ],

        'deepseek' => [
            'driver' => 'deepseek',
            'key' => env('DEEPSEEK_API_KEY'),
        ],

        'eleven' => [
            'driver' => 'eleven',
            'key' => env('ELEVENLABS_API_KEY'),
        ],

        'gemini' => [
            'driver' => 'gemini',
            'key' => env('GEMINI_API_KEY'),
            'url' => env('GEMINI_URL', 'https://generativelanguage.googleapis.com/v1beta/'),
        ],

        'groq' => [
            'driver' => 'groq',
            'key' => env('GROQ_API_KEY'),
        ],

        'jina' => [
            'driver' => 'jina',
            'key' => env('JINA_API_KEY'),
        ],

        'mistral' => [
            'driver' => 'mistral',
            'key' => env('MISTRAL_API_KEY'),
        ],

        'ollama' => [
            'driver' => 'ollama',
            'key' => env('OLLAMA_API_KEY', ''),
            'url' => env('OLLAMA_URL', 'http://localhost:11434'),
        ],

        'openai' => [
            'driver' => 'openai',
            'key' => env('OPENAI_API_KEY'),
            'url' => env('OPENAI_URL', 'https://api.openai.com/v1'),
            'store' => env('OPENAI_STORE', true),
        ],

        'openai-compatible' => [
            'driver' => 'openai-compatible',
            'url' => env('OPENAI_COMPATIBLE_URL'),
            'key' => env('OPENAI_COMPATIBLE_API_KEY'),
        ],

        'openrouter' => [
            'driver' => 'openrouter',
            'key' => env('OPENROUTER_API_KEY'),
        ],

        'typesafe' => [
            'driver' => 'typesafe',
            'key' => env('TYPESAFE_API_KEY'),
        ],

        'voyageai' => [
            'driver' => 'voyageai',
            'key' => env('VOYAGEAI_API_KEY'),
        ],

        'xai' => [
            'driver' => 'xai',
            'key' => env('XAI_API_KEY'),
        ],
    ],

];
