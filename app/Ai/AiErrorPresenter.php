<?php

namespace App\Ai;

use Illuminate\Support\Str;
use Throwable;

final class AiErrorPresenter
{
    public static function forUser(Throwable $exception): string
    {
        $message = Str::lower($exception->getMessage());

        return match (true) {
            str_contains($message, 'rate limit'),
            str_contains($message, 'too many requests'),
            str_contains($message, '429') => 'All configured AI providers are busy right now. Try again in a moment.',

            str_contains($message, 'quota'),
            str_contains($message, 'insufficient'),
            str_contains($message, 'billing') => 'The AI provider quota is exhausted. Top up the provider account or add another key.',

            str_contains($message, 'api key'),
            str_contains($message, 'unauthorized'),
            str_contains($message, '401'),
            str_contains($message, '403') => 'An AI provider rejected its API key. Check the provider keys in .env.',

            str_contains($message, 'timeout'),
            str_contains($message, 'timed out') => 'The AI providers took too long to respond. Try again.',

            str_contains($message, 'model') && str_contains($message, 'not found') => 'The configured AI model is unavailable. Check the model settings.',

            default => 'The AI assistant could not complete that request. Try again.',
        };
    }
}
