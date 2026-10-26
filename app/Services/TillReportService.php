<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\TillSession;

class TillReportService
{
    /**
     * X/Z report figures for one till session.
     *
     * @return array<string, mixed>
     */
    public function summary(TillSession $till): array
    {
        $till->loadMissing(['branch.region', 'user']);

        $completedOrders = Order::query()
            ->where('till_session_id', $till->id)
            ->where('status', 'completed');

        $salesCount = (clone $completedOrders)->count();
        $gross = (float) (clone $completedOrders)->sum('total');

        $cash = (float) Payment::query()
            ->where('gateway', 'cash')
            ->where('status', 'completed')
            ->whereHas('order', fn ($query) => $query
                ->where('till_session_id', $till->id)
                ->where('status', 'completed'))
            ->sum('amount');

        $openingCash = (float) $till->opening_cash;
        $timezone = $till->branch->region->timezone;
        $closingCash = (float) $till->closing_cash;
        $expectedCash = round($openingCash + $cash, 2);

        return [
            'id' => $till->id,
            'status' => $till->status,
            'opened_at' => $till->opened_at->toIso8601String(),
            'opened_at_label' => $till->opened_at->timezone($timezone)->format('D, d M · H:i'),
            'closed_at_label' => $till->closed_at?->timezone($timezone)->format('D, d M · H:i'),
            'cashier' => $till->user->name,
            'opening_cash' => round($openingCash, 2),
            'sales_count' => $salesCount,
            'gross' => round($gross, 2),
            'cash' => round($cash, 2),
            'expected_cash' => $expectedCash,
            'closing_cash' => round($closingCash, 2),
            'variance' => $till->closed_at ? round($closingCash - $expectedCash, 2) : null,
            'variance_reason' => $till->variance_reason,
        ];
    }
}
