<?php

namespace App\Ai;

class AiToolResult
{
    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{key:string,label:string}>  $columns
     * @param  array<int, array{label:string,url:string}>  $sources
     * @param  array<string, mixed>|null  $chart
     * @param  array<string, mixed>  $meta
     */
    public static function make(
        AiScope $scope,
        string $summary,
        array $rows = [],
        array $columns = [],
        array $sources = [],
        ?array $chart = null,
        array $meta = [],
    ): string {
        return json_encode([
            'ok' => true,
            'scope' => [
                'label' => $scope->label(),
                'region_id' => $scope->region?->id,
                'branch_id' => $scope->branch?->id,
                'currency' => $scope->currency(),
            ],
            'summary' => $summary,
            'columns' => $columns,
            'rows' => $rows,
            'chart' => $chart,
            'sources' => $sources,
            'meta' => [
                'row_count' => count($rows),
                'truncated' => false,
                ...$meta,
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    }
}
