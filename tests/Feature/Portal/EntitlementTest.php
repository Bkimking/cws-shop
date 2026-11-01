<?php

use App\Models\Branch;
use App\Models\TillSession;
use App\Models\User;
use App\Services\Portal\EntitlementService;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::firstOrFail();
    $this->cashier = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->cashier->assignRole('Cashier');

    config()->set('portal.enabled', true);
    config()->set('portal.installation_id', 'ins_test');
    config()->set('portal.api_secret', 'test-secret');
    config()->set('portal.url', 'https://portal.test');
});

test('an HMAC signed entitlement is verified and stored', function () {
    $snapshot = [
        'installation_id' => 'ins_test',
        'status' => 'active',
        'plan' => ['code' => 'annual', 'name' => 'Annual', 'interval' => 'year'],
        'features' => ['pos'],
        'period_end' => now()->addYear()->toIso8601String(),
        'grace_until' => now()->addYear()->addDays(14)->toIso8601String(),
        'issued_at' => now()->toIso8601String(),
        'expires_at' => now()->addDay()->toIso8601String(),
    ];
    $snapshot['signature'] = hash_hmac(
        'sha256',
        json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        'test-secret',
    );

    $stored = app(EntitlementService::class)->store($snapshot);

    expect($stored->status)->toBe('active')
        ->and($stored->plan_code)->toBe('annual')
        ->and(app(EntitlementService::class)->allowsSales())->toBeTrue();
});

test('a suspended entitlement blocks POS sales', function () {
    $snapshot = [
        'installation_id' => 'ins_test',
        'status' => 'suspended',
        'plan' => ['code' => 'monthly', 'name' => 'Monthly', 'interval' => 'month'],
        'features' => ['pos'],
        'period_end' => now()->subMonth()->toIso8601String(),
        'grace_until' => now()->subDays(16)->toIso8601String(),
        'issued_at' => now()->toIso8601String(),
        'expires_at' => now()->addDay()->toIso8601String(),
    ];
    $snapshot['signature'] = hash_hmac(
        'sha256',
        json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        'test-secret',
    );
    app(EntitlementService::class)->store($snapshot);

    TillSession::create([
        'branch_id' => $this->branch->id,
        'user_id' => $this->cashier->id,
        'opened_at' => now(),
        'opening_cash' => 0,
        'closing_cash' => 0,
        'status' => 'OPEN',
    ]);

    $this->actingAs($this->cashier)
        ->postJson('/pos/sales', [
            'items' => [],
            'payment_method' => 'cash',
        ])
        ->assertStatus(423)
        ->assertJsonPath('code', 'system_suspended');
});
