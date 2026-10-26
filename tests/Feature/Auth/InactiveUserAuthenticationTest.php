<?php

use App\Models\Branch;
use App\Models\Region;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('inactive users cannot authenticate with a valid password', function () {
    $user = User::factory()->inactive()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('users assigned to an inactive branch cannot authenticate', function () {
    $branch = createBranch(active: false);
    $user = User::factory()->create(['branch_id' => $branch->id]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('users assigned to a branch in an inactive region cannot authenticate', function () {
    $region = createRegion(active: false);
    $branch = createBranch(active: true, region: $region);
    $user = User::factory()->create(['branch_id' => $branch->id]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('users assigned to an inactive region cannot authenticate', function () {
    $region = createRegion(active: false);
    $user = User::factory()->create(['region_id' => $region->id]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('superadmins can authenticate when their assigned branch is inactive', function () {
    $branch = createBranch(active: false);
    $user = User::factory()->create(['branch_id' => $branch->id]);
    $user->assignRole(Role::findOrCreate('Superadmin'));

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(config('fortify.home'));
});

test('deactivated users are logged out on the next request', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();

    $user->update(['is_active' => false]);

    $this->actingAs($user->fresh())
        ->get(route('profile.edit'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('users are logged out when their assigned branch is deactivated', function () {
    $branch = createBranch(active: true);
    $user = User::factory()->create(['branch_id' => $branch->id]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();

    $branch->update(['is_active' => false]);

    $this->actingAs($user->fresh())
        ->get(route('profile.edit'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

function createRegion(bool $active = true): Region
{
    return Region::query()->create([
        'name' => fake()->unique()->company(),
        'slug' => fake()->unique()->slug(2),
        'country_code' => fake()->unique()->bothify('??##'),
        'currency_code' => 'KES',
        'tax_rate' => '16',
        'timezone' => 'Africa/Nairobi',
        'is_active' => $active,
    ]);
}

function createBranch(bool $active = true, ?Region $region = null): Branch
{
    return Branch::query()->create([
        'region_id' => ($region ?? createRegion())->id,
        'name' => fake()->unique()->company(),
        'slug' => fake()->unique()->slug(2),
        'address' => fake()->address(),
        'phone' => fake()->numerify('07########'),
        'is_active' => $active,
    ]);
}
