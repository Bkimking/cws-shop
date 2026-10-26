<?php

namespace App\Ai;

final class AiProviders
{
    private const ALIASES = [
        'claude' => 'anthropic',
        'chatgpt' => 'openai',
        'google' => 'gemini',
        'google-gemini' => 'gemini',
    ];

    /**
     * Provider => model pairs for the chat orchestrator.
     *
     * @return array<string, string|null>
     */
    public static function forChat(): array
    {
        $providers = [];

        foreach (self::chain() as $entry) {
            if ($entry['configured']) {
                $providers[$entry['provider']] = $entry['model'];
            }
        }

        if ($providers === []) {
            return [self::primary() => self::model(self::primary())];
        }

        return $providers;
    }

    /**
     * Numeric provider list for isolated specialist agents. Null models let
     * each provider pick its cheapest/default model.
     *
     * @return list<string>
     */
    public static function forSpecialists(): array
    {
        return array_keys(self::forChat());
    }

    public static function hasConfigured(): bool
    {
        foreach (self::chain() as $entry) {
            if ($entry['configured']) {
                return true;
            }
        }

        return false;
    }

    /**
     * The full provider chain, including providers without keys so the UI can
     * show what is ready and what is waiting for configuration.
     *
     * @return list<array{provider: string, model: string|null, configured: bool, primary: bool}>
     */
    public static function chain(): array
    {
        $providers = [self::primary()];

        if (config('ai.failover.enabled', true)) {
            foreach ((array) config('ai.failover.providers', []) as $provider) {
                if (is_string($provider) && trim($provider) !== '') {
                    $providers[] = self::normalize($provider);
                }
            }
        }

        $seen = [];
        $chain = [];

        foreach ($providers as $provider) {
            if (isset($seen[$provider])) {
                continue;
            }

            $seen[$provider] = true;
            $chain[] = [
                'provider' => $provider,
                'model' => self::model($provider),
                'configured' => self::configured($provider),
                'primary' => $provider === self::primary(),
            ];
        }

        return $chain;
    }

    public static function primary(): string
    {
        return self::normalize((string) config('ai.default', 'deepseek'));
    }

    public static function configured(string $provider): bool
    {
        $configuration = (array) config("ai.providers.{$provider}", []);

        $driver = $configuration['driver'] ?? $provider;

        if ($driver === 'ollama') {
            return true;
        }

        if ($driver === 'openai-compatible') {
            return filled($configuration['url'] ?? null);
        }

        if ($driver === 'bedrock') {
            return filled($configuration['key'] ?? null)
                || filled($configuration['access_key_id'] ?? null);
        }

        return filled($configuration['key'] ?? null);
    }

    public static function model(string $provider): ?string
    {
        if ($provider === self::primary()) {
            return config('ai.models.admin') ?: null;
        }

        return config("ai.failover.models.{$provider}") ?: null;
    }

    private static function normalize(string $provider): string
    {
        $provider = strtolower(trim($provider));

        return self::ALIASES[$provider] ?? $provider;
    }
}
