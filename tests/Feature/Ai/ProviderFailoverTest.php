<?php

use App\Ai\AiProviders;
use App\Ai\AiSettings;

beforeEach(function () {
    config([
        'ai.default' => 'deepseek',
        'ai.models.admin' => 'deepseek-chat',
        'ai.failover.enabled' => true,
        'ai.failover.providers' => ['gemini', 'anthropic', 'openai', 'mistral', 'groq', 'xai'],
        'ai.failover.models' => [
            'gemini' => null,
            'anthropic' => null,
            'openai' => null,
            'mistral' => null,
            'groq' => null,
            'xai' => null,
        ],
        'ai.providers.deepseek.key' => null,
        'ai.providers.gemini.key' => null,
        'ai.providers.anthropic.key' => null,
        'ai.providers.openai.key' => null,
        'ai.providers.mistral.key' => null,
        'ai.providers.groq.key' => null,
        'ai.providers.xai.key' => null,
    ]);
});

test('configured providers are tried in order, missing keys are skipped', function () {
    config([
        'ai.providers.deepseek.key' => 'deepseek-key',
        'ai.providers.gemini.key' => 'gemini-key',
        'ai.providers.openai.key' => 'openai-key',
    ]);

    expect(array_keys(AiProviders::forChat()))
        ->toBe(['deepseek', 'gemini', 'openai'])
        ->and(AiProviders::forChat()['deepseek'])->toBe('deepseek-chat')
        ->and(AiProviders::forChat()['gemini'])->toBeNull()
        ->and(AiProviders::forSpecialists())
        ->toBe(['deepseek', 'gemini', 'openai'])
        ->and(AiProviders::hasConfigured())->toBeTrue();
});

test('a missing primary falls through to the first configured fallback', function () {
    config([
        'ai.providers.gemini.key' => 'gemini-key',
    ]);

    expect(AiProviders::forChat())
        ->toBe(['gemini' => null])
        ->and(app(AiSettings::class)->providerConfigured())->toBeTrue();
});

test('provider aliases resolve to sdk provider names', function () {
    config([
        'ai.failover.providers' => ['claude', 'chatgpt'],
        'ai.providers.anthropic.key' => 'anthropic-key',
        'ai.providers.openai.key' => 'openai-key',
    ]);

    expect(array_keys(AiProviders::forChat()))
        ->toBe(['anthropic', 'openai']);
});

test('no configured provider reports unavailable', function () {
    expect(AiProviders::hasConfigured())->toBeFalse()
        ->and(app(AiSettings::class)->providerConfigured())->toBeFalse();
});
