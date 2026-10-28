<?php

use App\Models\Branch;
use App\Models\Order;
use App\Models\User;
use App\Services\NotificationService;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'notification-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'notification-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
    ]);

    $this->branch = Branch::query()->firstOrFail();
    $this->admin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->admin->forceFill(['email_verified_at' => now()])->save();
    $this->admin->assignRole('Branch Admin');
});

test('a new order creates a dashboard notification that can be marked read', function () {
    $order = Order::create([
        'branch_id' => $this->branch->id,
        'source' => 'storefront',
        'status' => 'pending',
        'subtotal' => 100,
        'tax' => 0,
        'total' => 100,
        'currency_code' => 'KES',
    ]);

    app(NotificationService::class)->newOrder($order);

    expect($this->admin->unreadNotifications()->count())->toBe(1);

    $notification = $this->admin->notifications()->firstOrFail();

    $this->actingAs($this->admin)
        ->get('/admin')
        ->assertInertia(fn ($page) => $page->where('notifications.unread', 1));

    $this->actingAs($this->admin)
        ->post('/admin/notifications/'.$notification->id.'/read')
        ->assertRedirect();

    expect($this->admin->unreadNotifications()->count())->toBe(0);
});

test('opening and closing a till notifies dashboard staff', function () {
    $cashier = User::factory()->create(['branch_id' => $this->branch->id]);
    $cashier->forceFill(['email_verified_at' => now()])->save();
    $cashier->assignRole('Cashier');

    $this->actingAs($cashier)->post('/pos/till/open', ['opening_cash' => 500])->assertRedirect();

    expect($this->admin->unreadNotifications()->count())->toBe(1)
        ->and($this->admin->notifications()->first()->data['title'])->toBe('Till opened');

    $this->actingAs($cashier)->post('/pos/till/close', [
        'closing_cash' => 500,
        'variance_reason' => null,
    ])->assertRedirect();

    expect($this->admin->unreadNotifications()->count())->toBe(2);
});
