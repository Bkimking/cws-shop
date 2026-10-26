<?php

namespace App\Ai;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class AiReadOnly
{
    public static function connection(): string
    {
        $connection = config('ai.readonly_connection');

        if (blank($connection) && app()->isProduction()) {
            throw new RuntimeException(
                'AI_DB_CONNECTION must point at a SELECT-only database connection in production.'
            );
        }

        return $connection ?: config('database.default');
    }

    /**
     * @param  class-string<Model>  $model
     * @return Builder<Model>
     */
    public static function query(string $model): Builder
    {
        return $model::on(self::connection());
    }
}
