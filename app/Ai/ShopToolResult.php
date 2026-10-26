<?php

namespace App\Ai;

use App\Models\Branch;

final class ShopToolResult
{
    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{key: string, label: string}>  $columns
     * @param  array<int, array{label: string, url: string}>  $sources
     */
    public static function make(
        Branch $branch,
        string $summary,
        array $rows = [],
        array $columns = [],
        array $sources = [],
    ): string {
        return json_encode([
            'ok' => true,
            'scope' => [
                'label' => $branch->name.' · '.$branch->region->currency_code,
                'branch_id' => $branch->id,
                'currency' => $branch->region->currency_code,
            ],
            'summary' => $summary,
            'columns' => $columns,
            'rows' => $rows,
            'sources' => $sources,
            'meta' => ['row_count' => count($rows), 'truncated' => false],
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    }
}
