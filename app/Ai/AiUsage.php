<?php

namespace App\Ai;

use App\Models\AiInteraction;

class AiUsage
{
    public function __construct(private readonly AiSettings $settings) {}

    public function tokensToday(AiScope $scope): int
    {
        return (int) AiInteraction::query()
            ->where('created_by', $scope->user->id)
            ->where('surface', $scope->surface)
            ->whereDate('created_at', today())
            ->sum('total_tokens');
    }

    public function costToday(AiScope $scope): float
    {
        return (float) AiInteraction::query()
            ->where('created_by', $scope->user->id)
            ->where('surface', $scope->surface)
            ->whereDate('created_at', today())
            ->sum('cost');
    }

    public function canStart(AiScope $scope): bool
    {
        $tokenCap = $this->settings->dailyTokenCap($scope);

        if ($tokenCap !== null && $this->tokensToday($scope) >= $tokenCap) {
            return false;
        }

        $costCap = $this->settings->dailyCostCap($scope);

        if ($costCap !== null && $this->costToday($scope) >= $costCap) {
            return false;
        }

        $globalCap = (float) config('ai.limits.global_daily_cost', 25.00);

        if ($globalCap > 0 && $this->globalCostToday() >= $globalCap) {
            return false;
        }

        return true;
    }

    public function globalCostToday(): float
    {
        return (float) AiInteraction::query()
            ->whereDate('created_at', today())
            ->sum('cost');
    }

    /**
     * @return array{tokens_used:int, token_cap:int|null, cost_used:float, cost_cap:float|null}
     */
    public function snapshot(AiScope $scope): array
    {
        return [
            'tokens_used' => $this->tokensToday($scope),
            'token_cap' => $this->settings->dailyTokenCap($scope),
            'cost_used' => $this->costToday($scope),
            'cost_cap' => $this->settings->dailyCostCap($scope),
        ];
    }
}
