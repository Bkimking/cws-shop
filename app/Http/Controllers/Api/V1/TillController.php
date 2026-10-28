<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Models\TillSession;
use App\Services\NotificationService;
use App\Services\TillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TillController extends Controller
{
    use ResolvesTerminalBranch;

    public function current(Request $request, TillService $tills): JsonResponse
    {
        $branch = $this->terminalBranch($request);
        $till = $tills->current($branch);

        return response()->json([
            'message' => $till !== null ? 'Till is open.' : 'Till is closed.',
            'data' => [
                'till' => $till !== null ? $tills->summary($till) : null,
            ],
        ]);
    }

    public function open(Request $request, TillService $tills): JsonResponse
    {
        $validated = $request->validate([
            'opening_cash' => ['required', 'numeric', 'min:0'],
        ]);

        $branch = $this->terminalBranch($request);
        /** @var TillSession $till */
        $till = $tills->open($branch, $request->user(), (float) $validated['opening_cash']);
        app(NotificationService::class)->till($till, 'opened', $request->user());

        return response()->json([
            'message' => 'Till opened.',
            'data' => ['till' => $tills->summary($till)],
        ], 201);
    }

    public function close(Request $request, TillService $tills): JsonResponse
    {
        $validated = $request->validate([
            'closing_cash' => ['required', 'numeric', 'min:0'],
            'variance_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $branch = $this->terminalBranch($request);
        $summary = $tills->close(
            $branch,
            (float) $validated['closing_cash'],
            $validated['variance_reason'] ?? null,
        );
        /** @var TillSession|null $closedTill */
        $closedTill = TillSession::query()->find($summary['id']);
        if ($closedTill !== null) {
            app(NotificationService::class)->till($closedTill, 'closed', $request->user());
        }

        return response()->json([
            'message' => 'Till closed.',
            'data' => ['till' => $summary, 'z_report' => $summary],
        ]);
    }

    public function xReport(Request $request, TillService $tills): JsonResponse
    {
        $branch = $this->terminalBranch($request);
        $till = $tills->current($branch);

        if ($till === null) {
            return response()->json(['message' => 'Till is closed.', 'code' => 'till_closed'], 422);
        }

        return response()->json([
            'message' => 'X report loaded.',
            'data' => ['till' => $tills->summary($till)],
        ]);
    }
}
