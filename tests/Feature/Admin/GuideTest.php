<?php

use App\Models\Branch;
use App\Models\Region;
use App\Models\User;
use App\Tour\TourService;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'guide-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'guide-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
    ]);

    $this->region = Region::query()->firstOrFail();
    $this->branch = Branch::query()->firstOrFail();
});

test('a new admin user is prompted with a role-aware tour and can complete it', function () {
    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole('Branch Admin');

    $this->actingAs($user)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tour.should_prompt', true)
            ->has('tour.steps', 11));

    $this->actingAs($user)->post('/admin/guide/complete')->assertRedirect();

    expect($user->fresh()->tour_completed_at)->not->toBeNull();

    $this->actingAs($user)
        ->get('/admin')
        ->assertInertia(fn ($page) => $page->where('tour.should_prompt', false));
});

test('a user can skip and later reset the tour', function () {
    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole('Branch Admin');

    $this->actingAs($user)->post('/admin/guide/skip')->assertRedirect();
    expect($user->fresh()->tour_skipped_at)->not->toBeNull();

    $this->actingAs($user)->post('/admin/guide/reset')->assertRedirect();
    expect($user->fresh()->tour_skipped_at)->toBeNull()
        ->and($user->fresh()->tour_completed_at)->toBeNull();
});

test('tour steps follow the user permissions', function () {
    $branchAdmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $branchAdmin->forceFill(['email_verified_at' => now()])->save();
    $branchAdmin->assignRole('Branch Admin');

    $inventoryManager = User::factory()->create(['branch_id' => $this->branch->id]);
    $inventoryManager->forceFill(['email_verified_at' => now()])->save();
    $inventoryManager->assignRole('Inventory Manager');

    $branchSteps = collect(app(TourService::class)->stepsFor($branchAdmin))->pluck('key');
    $inventorySteps = collect(app(TourService::class)->stepsFor($inventoryManager))->pluck('key');

    expect($branchSteps)->toContain('branch', 'users', 'pos')
        ->not->toContain('region', 'payments')
        ->and($inventorySteps)->toContain('inventory', 'warehouses')
        ->not->toContain('users', 'orders');
});

test('the guide page is repeatable and lists every process', function () {
    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole('Branch Admin');

    $this->actingAs($user)
        ->get('/admin/guide')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/guide')
            ->has('steps', 11));
});

test('step progress is saved and resumed instead of restarting', function () {
    $user = User::factory()->create(['branch_id' => $this->branch->id]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->assignRole('Branch Admin');

    $steps = app(TourService::class)->stepsFor($user);
    $first = $steps[0]['key'];
    $second = $steps[1]['key'];

    $this->actingAs($user)->post('/admin/guide/step', [
        'step_key' => $first,
        'completed' => false,
    ])->assertRedirect();

    expect($user->fresh()->tour_current_step)->toBe($first);

    $this->actingAs($user)->post('/admin/guide/step', [
        'step_key' => $first,
        'completed' => true,
        'next_step_key' => $second,
    ])->assertRedirect();

    $user->refresh();

    expect($user->tour_current_step)->toBe($second)
        ->and($user->tour_completed_steps)->toContain($first);

    $this->actingAs($user)
        ->get('/admin')
        ->assertInertia(fn ($page) => $page
            ->where('tour.resume_step', $second)
            ->where('tour.started', true));
});
