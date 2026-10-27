<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\TillSession;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class TillService
{
    public function __construct(private readonly TillReportService $reports) {}

    public function current(Branch $branch): ?TillSession
    {
        return TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();
    }

    public function open(Branch $branch, User $user, float $openingCash): TillSession
    {
        $existing = $this->current($branch);

        if ($existing !== null) {
            throw ValidationException::withMessages([
                'till' => "The till at {$branch->name} is already open.",
            ]);
        }

        return TillSession::create([
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'opened_at' => now(),
            'opening_cash' => round($openingCash, 2),
            'closing_cash' => 0,
            'status' => 'OPEN',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function close(Branch $branch, float $closingCash, ?string $varianceReason = null): array
    {
        $till = $this->current($branch);

        if ($till === null) {
            throw ValidationException::withMessages([
                'till' => 'There is no open till to close.',
            ]);
        }

        $summary = $this->reports->summary($till);
        $closingCash = round($closingCash, 2);
        $variance = round($closingCash - (float) $summary['expected_cash'], 2);

        if (abs($variance) >= 0.01 && blank($varianceReason)) {
            throw ValidationException::withMessages([
                'variance_reason' => 'Add a reason for the cash variance before closing.',
            ]);
        }

        $till->update([
            'closing_cash' => $closingCash,
            'closed_at' => now(),
            'status' => 'CLOSED',
            'variance_reason' => $varianceReason,
        ]);

        return $this->reports->summary($till->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(TillSession $till): array
    {
        return $this->reports->summary($till);
    }
}
