<?php

namespace App\Console\Commands;

use App\Services\Portal\EntitlementService;
use Illuminate\Console\Command;

class SyncPortalEntitlement extends Command
{
    protected $signature = 'portal:sync';

    protected $description = 'Fetch the signed entitlement snapshot from the portal';

    public function handle(EntitlementService $entitlements): int
    {
        $entitlement = $entitlements->refresh();

        if ($entitlement === null) {
            $this->warn('No entitlement snapshot available. Check PORTAL_* configuration.');

            return self::FAILURE;
        }

        $this->info("Entitlement status: {$entitlements->status()} ({$entitlement->plan_code})");

        return self::SUCCESS;
    }
}
