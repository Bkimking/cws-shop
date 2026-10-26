<?php

namespace App\Ai;

final class AiPricing
{
    public function estimate(string $provider, ?string $model, int $inputTokens, int $outputTokens): float
    {
        $pricing = (array) config("ai.pricing.{$provider}", []);
        $inputRate = (float) ($pricing['input'] ?? 0);
        $outputRate = (float) ($pricing['output'] ?? 0);

        return round(
            ($inputTokens / 1_000_000) * $inputRate
            + ($outputTokens / 1_000_000) * $outputRate,
            6,
        );
    }
}
