<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Portal\EntitlementService;
use App\Services\Portal\PortalClient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function index(Request $request, EntitlementService $entitlements, PortalClient $client)
    {
        abort_unless($request->user()?->getRoleNames()->contains('Superadmin'), 403);
        $invoices = [];

        if ($entitlements->configured()) {
            try {
                $response = $client->status();
                $invoices = $response['invoices'] ?? [];
            } catch (\Throwable) {
                $invoices = [];
            }
        }

        return Inertia::render('admin/billing/index', [
            'entitlement' => $entitlements->frontend(),
            'invoices' => $invoices,
        ]);
    }
}
