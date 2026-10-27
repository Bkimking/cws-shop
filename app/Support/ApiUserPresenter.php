<?php

namespace App\Support;

use App\Models\User;
use App\Services\TillReportService;
use App\Services\TillService;

class ApiUserPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function present(User $user): array
    {
        $user->loadMissing(['branch.region', 'roles']);
        $branch = $user->branch;
        $till = $branch !== null
            ? app(TillService::class)->current($branch)
            : null;

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ],
            'branch' => $branch !== null ? [
                'id' => $branch->id,
                'name' => $branch->name,
                'address' => $branch->address,
                'phone' => $branch->phone,
            ] : null,
            'region' => $branch?->region !== null ? [
                'id' => $branch->region->id,
                'name' => $branch->region->name,
                'currency_code' => $branch->region->currency_code,
                'tax_rate' => (float) $branch->region->tax_rate,
                'timezone' => $branch->region->timezone,
            ] : null,
            'till' => $till !== null ? app(TillReportService::class)->summary($till) : null,
        ];
    }
}
