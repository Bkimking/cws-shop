<?php

namespace App\Ai;

use App\Models\AiSetting;
use App\Models\Region;

class AiSettings
{
    public function enabled(AiScope $scope): bool
    {
        return $this->enabledFor($scope->surface, $scope->region);
    }

    public function enabledFor(string $surface, ?Region $region = null): bool
    {
        if (! config('ai.enabled')) {
            return false;
        }

        $setting = $this->setting($surface, $region);

        if ($setting !== null) {
            return (bool) $setting->enabled;
        }

        return (bool) config("ai.surfaces.{$surface}", false);
    }

    public function providerConfigured(): bool
    {
        return AiProviders::hasConfigured();
    }

    public function dailyTokenCap(AiScope $scope): ?int
    {
        $setting = $this->setting($scope->surface, $scope->region);

        if ($setting?->daily_token_cap !== null) {
            return (int) $setting->daily_token_cap;
        }

        $cap = config("ai.limits.{$scope->surface}.daily_tokens");

        return $cap !== null ? (int) $cap : null;
    }

    public function dailyCostCap(AiScope $scope): ?float
    {
        $setting = $this->setting($scope->surface, $scope->region);

        if ($setting?->daily_cost_cap !== null) {
            return (float) $setting->daily_cost_cap;
        }

        $cap = config("ai.limits.{$scope->surface}.daily_cost");

        return $cap !== null ? (float) $cap : null;
    }

    private function setting(string $surface, ?Region $region): ?AiSetting
    {
        if ($region !== null) {
            $setting = AiSetting::query()
                ->where('scope_key', 'region:'.$region->id)
                ->where('surface', $surface)
                ->first();

            if ($setting !== null) {
                return $setting;
            }
        }

        return AiSetting::query()
            ->where('scope_key', 'global')
            ->where('surface', $surface)
            ->first();
    }
}
