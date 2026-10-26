<?php

namespace App\Ai\Concerns;

use App\Ai\AiProviders;

trait UsesProviderFailover
{
    /**
     * @return list<string>
     */
    public function provider(): array
    {
        return AiProviders::forSpecialists();
    }
}
