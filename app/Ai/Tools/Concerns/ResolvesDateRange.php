<?php

namespace App\Ai\Tools\Concerns;

use App\Ai\AiScope;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;
use Laravel\Ai\Tools\Request;

trait ResolvesDateRange
{
    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    protected function dateRange(Request $request, AiScope $scope): array
    {
        $timezone = $scope->timezone();

        $from = CarbonImmutable::parse(
            $request['from'] ?? now($timezone)->subDays(6)->toDateString(),
            $timezone
        )->startOfDay()->utc();

        $to = CarbonImmutable::parse(
            $request['to'] ?? now($timezone)->toDateString(),
            $timezone
        )->endOfDay()->utc();

        if ($from->greaterThan($to)) {
            throw ValidationException::withMessages([
                'from' => 'The from date must be before the to date.',
            ]);
        }

        if ($from->diffInDays($to) > 366) {
            throw ValidationException::withMessages([
                'from' => 'Date ranges are limited to 366 days.',
            ]);
        }

        return [$from, $to];
    }

    protected function dateLabel(CarbonImmutable $from, CarbonImmutable $to, AiScope $scope): string
    {
        $timezone = $scope->timezone();

        return $from->timezone($timezone)->format('d M Y')
            .' – '.$to->timezone($timezone)->format('d M Y');
    }
}
