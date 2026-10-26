<?php

namespace App\Http\Controllers\Pos\Concerns;

use App\Models\Branch;
use Illuminate\Http\Request;

trait ResolvesTerminalBranch
{
    /**
     * The terminal is always branch-scoped. Cashiers and branch admins carry a
     * branch_id; an account with no branch cannot sell.
     */
    protected function terminalBranch(Request $request): Branch
    {
        $branch = $request->user()?->branch;

        abort_unless(
            $branch && $branch->is_active,
            403,
            'No active branch is assigned to this account.'
        );

        return $branch->loadMissing('region');
    }
}
