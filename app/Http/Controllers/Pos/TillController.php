<?php

namespace App\Http\Controllers\Pos;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Models\TillSession;
use App\Services\NotificationService;
use App\Services\TillReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TillController extends Controller
{
    use ResolvesTerminalBranch;

    public function open(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_cash' => ['required', 'numeric', 'min:0'],
        ]);

        $branch = $this->terminalBranch($request);

        $existing = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        if ($existing) {
            ToastHelper::error("The till at {$branch->name} is already open.");

            return back();
        }

        $till = TillSession::create([
            'branch_id' => $branch->id,
            'user_id' => $request->user()->id,
            'opened_at' => now(),
            'opening_cash' => round((float) $validated['opening_cash'], 2),
            'closing_cash' => 0,
            'status' => 'OPEN',
        ]);

        app(NotificationService::class)->till($till, 'opened', $request->user());

        ToastHelper::success('Till opened. You can start selling.');

        return back();
    }

    public function close(Request $request, TillReportService $reports): RedirectResponse
    {
        $validated = $request->validate([
            'closing_cash' => ['required', 'numeric', 'min:0'],
            'variance_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $branch = $this->terminalBranch($request);

        $till = TillSession::query()
            ->where('branch_id', $branch->id)
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        if (! $till) {
            ToastHelper::error('There is no open till to close.');

            return back();
        }

        $summary = $reports->summary($till);
        $closingCash = round((float) $validated['closing_cash'], 2);
        $variance = round($closingCash - (float) $summary['expected_cash'], 2);

        if (abs($variance) >= 0.01 && blank($validated['variance_reason'] ?? null)) {
            throw ValidationException::withMessages([
                'variance_reason' => 'Add a reason for the cash variance before closing.',
            ]);
        }

        $till->update([
            'closing_cash' => $closingCash,
            'closed_at' => now(),
            'status' => 'CLOSED',
            'variance_reason' => $validated['variance_reason'] ?? null,
        ]);

        app(NotificationService::class)->till($till->fresh(), 'closed', $request->user());

        session()->flash('z_report', $reports->summary($till->fresh()));

        ToastHelper::success('Till closed. Z report ready.');

        return back();
    }
}
