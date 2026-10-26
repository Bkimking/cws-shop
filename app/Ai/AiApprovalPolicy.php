<?php

namespace App\Ai;

final class AiApprovalPolicy
{
    public function alwaysRequire(): bool
    {
        return (string) config('ai.approvals.mode', 'always') !== 'high_value';
    }

    public function stockChangeRequiresApproval(int $quantityChange): bool
    {
        if ($this->alwaysRequire()) {
            return true;
        }

        return abs($quantityChange) >= (int) config('ai.approvals.stock_unit_threshold', 50);
    }

    public function productPriceRequiresApproval(?float $basePrice): bool
    {
        if ($this->alwaysRequire()) {
            return true;
        }

        if ($basePrice === null) {
            return false;
        }

        return $basePrice >= (float) config('ai.approvals.product_price_threshold', 1000);
    }
}
