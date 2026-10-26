<?php

use App\Ai\Agents\ShopAssistant;
use App\Ai\AiInputGuard;
use App\Ai\Tools\ShopAddToCartTool;
use App\Ai\Tools\ShopListPickupsTool;
use App\Ai\Tools\ShopOrderStatusTool;
use App\Ai\Tools\ShopSearchProductsTool;
use App\Ai\Tools\ShopSelectPickupTool;
use App\Mail\OrderConfirmed;
use App\Mail\OrderReadyForPickup;
use App\Models\AiInteraction;
use App\Models\Branch;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentGatewayConfig;
use App\Models\ProductVariant;
use App\Models\ShopGuest;
use App\Models\StockLevel;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\DemoPosSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Tools\Request;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'shop-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'shop-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
        PaymentGatewaySeeder::class,
        DemoPosSeeder::class,
    ]);

    $this->variant = ProductVariant::query()
        ->whereHas('product', fn ($query) => $query->where('sku', 'MILK-1L'))
        ->firstOrFail();
    $this->stock = StockLevel::query()
        ->where('product_variant_id', $this->variant->id)
        ->firstOrFail();
    $this->pickup = Warehouse::query()
        ->where('branch_id', Branch::query()->firstOrFail()->id)
        ->firstOrFail();

    Mail::fake();

    config([
        'mpesa.enabled' => true,
        'mpesa.consumer_key' => 'test-key',
        'mpesa.consumer_secret' => 'test-secret',
        'mpesa.shortcode' => '174379',
        'mpesa.passkey' => 'test-passkey',
        'mpesa.base_url' => 'https://sandbox.safaricom.co.ke',
        'mpesa.callback_url' => 'https://example.test/api/payments/mpesa/callback',
        'mpesa.callback_secret' => null,
        'paypal.enabled' => false,
    ]);

    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'stk-token']),
        '*stkpush/v1/processrequest*' => Http::response([
            'ResponseCode' => '0',
            'ResponseDescription' => 'Success. Request accepted for processing',
            'MerchantRequestID' => 'merchant-1',
            'CheckoutRequestID' => 'checkout-1',
        ]),
    ]);
});

test('public landing, shop and about pages render', function () {
    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('shop/landing'));
    $this->get('/shop')->assertOk()->assertInertia(fn ($page) => $page->component('shop/index'));
    $this->get('/shop/about')->assertOk()->assertInertia(fn ($page) => $page->component('shop/about'));
    $this->get('/shop/contact')->assertOk()->assertInertia(fn ($page) => $page->component('shop/contact'));
});

test('guest can add to cart and place an M-Pesa order', function () {
    $this->withSession([
        'shop_cart' => [$this->variant->id => 2],
    ]);

    $response = $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
        'notes' => 'Call on arrival',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();

    $response->assertRedirect(route('shop.order', $order->public_token));

    expect($order->status)->toBe('pending')
        ->and($order->source)->toBe('storefront')
        ->and($order->pickup_warehouse_id)->toBe($this->pickup->id)
        ->and($order->customer_email)->toBe('guest@example.com')
        ->and($order->total)->toBe('260.00')
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(22);

    $payment = Payment::query()->where('order_id', $order->id)->firstOrFail();

    expect($payment->gateway)->toBe('mpesa')
        ->and($payment->status)->toBe('pending')
        ->and($payment->gateway_reference)->toBe('checkout-1');
});

test('mpesa callback completes the public order', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();

    $this->postJson('/api/payments/mpesa/callback', [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'checkout-1',
                'ResultCode' => 0,
                'ResultDesc' => 'The service request is processed successfully.',
                'CallbackMetadata' => [
                    'Item' => [
                        ['Name' => 'MpesaReceiptNumber', 'Value' => 'MPESA123'],
                        ['Name' => 'PhoneNumber', 'Value' => '254712345678'],
                    ],
                ],
            ],
        ],
    ])->assertOk();

    $order->refresh();

    expect($order->status)->toBe('completed')
        ->and($order->pickup_status)->toBe('pending')
        ->and($order->payments()->first()->status)->toBe('completed')
        ->and($order->pickup_ready_at)->toBeNull()
        ->and($order->confirmation_notified_at)->not->toBeNull();

    Mail::assertSent(OrderConfirmed::class, fn (OrderConfirmed $mail) => $mail->hasTo('guest@example.com'));
    Mail::assertNotSent(OrderReadyForPickup::class);

    $staff = User::factory()->create(['branch_id' => $order->branch_id]);
    $staff->forceFill(['email_verified_at' => now()])->save();
    $staff->assignRole('Branch Admin');

    $this->actingAs($staff)
        ->post('/admin/orders/'.$order->id.'/pickup/ready')
        ->assertRedirect();

    expect($order->fresh()->pickup_status)->toBe('ready')
        ->and($order->fresh()->pickup_ready_at)->not->toBeNull()
        ->and($order->fresh()->pickup_notified_at)->not->toBeNull();

    Mail::assertSent(OrderReadyForPickup::class, fn (OrderReadyForPickup $mail) => $mail->hasTo('guest@example.com'));

    $this->actingAs($staff)
        ->post('/admin/orders/'.$order->id.'/pickup/collected')
        ->assertRedirect();

    expect($order->fresh()->pickup_status)->toBe('collected')
        ->and($order->fresh()->collected_at)->not->toBeNull();

    $this->post('/shop/orders/'.$order->public_token.'/email')
        ->assertRedirect();

    Mail::assertSent(OrderConfirmed::class, 2);
});

test('paypal remains muted for public checkout', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'paypal',
    ])->assertSessionHasErrors('payment_method');

    expect(Order::query()->count())->toBe(0);
});

test('cashier can send a POS M-Pesa STK push', function () {
    $cashier = User::query()->where('email', 'cashier@cws.com')->firstOrFail();

    $this->actingAs($cashier)->post('/pos/till/open', ['opening_cash' => 0])->assertRedirect();

    $response = $this->actingAs($cashier)->postJson('/pos/sales', [
        'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 1]],
        'payment_method' => 'mpesa',
        'phone' => '0712345678',
    ]);

    $response->assertCreated()
        ->assertJsonPath('payment_status', 'pending')
        ->assertJsonPath('order.payment.gateway', 'mpesa');

    $order = Order::query()->latest('id')->firstOrFail();

    $this->postJson('/api/payments/mpesa/callback', [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'checkout-1',
                'ResultCode' => 0,
                'ResultDesc' => 'Success',
            ],
        ],
    ])->assertOk();

    $this->actingAs($cashier)
        ->getJson('/pos/sales/'.$order->id.'/status')
        ->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('payment_status', 'completed');
});

test('shop assistant page and cart tool work for a guest', function () {
    $this->get('/shop/assistant')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('shop/assistant'));

    $branch = Branch::query()->firstOrFail();
    $scope = new ShopAddToCartTool($branch);

    $result = json_decode(
        $scope->handle(new Request([
            'variant_id' => $this->variant->id,
            'quantity' => 1,
        ])),
        true,
    );

    expect($result['rows'][0]['name'])->toBe('Milk 1L')
        ->and(session('shop_cart'))->toHaveKey($this->variant->id);

    $this->get('/shop/cart')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('lines', 1)
            ->where('lines.0.variant_id', $this->variant->id));

    $this->get('/shop/checkout')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('lines', 1));
});

test('shop assistant streams a guest answer and persists the conversation', function () {
    ShopAssistant::fake(['I found milk for you.']);

    $this->get('/shop/assistant')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('shop/assistant'));

    $guest = ShopGuest::query()->latest('id')->firstOrFail();
    $conversation = Conversation::query()
        ->where('participant_type', $guest->getMorphClass())
        ->where('participant_id', $guest->id)
        ->latest('updated_at')
        ->firstOrFail();

    $response = $this->postJson('/shop/assistant/chat', [
        'conversation_id' => $conversation->id,
        'messages' => [[
            'id' => 'user-1',
            'role' => 'user',
            'parts' => [['type' => 'text', 'text' => 'I need milk']],
        ]],
    ]);

    $response->assertOk();

    $text = collect(explode("\n", $response->streamedContent()))
        ->filter(fn (string $line) => str_starts_with($line, 'data: {'))
        ->map(fn (string $line) => json_decode(substr($line, 6), true))
        ->filter(fn (array $event) => ($event['type'] ?? null) === 'text-delta')
        ->pluck('delta')
        ->implode('');

    expect($text)->toContain('I found milk')
        ->and($conversation->messages()->count())->toBeGreaterThan(0);
});

test('shop assistant can retrieve the guest latest order', function () {
    $guest = ShopGuest::create([
        'token' => (string) Str::uuid(),
        'email' => 'guest@example.com',
        'phone' => '0712345678',
    ]);

    $order = Order::create([
        'public_token' => (string) Str::uuid(),
        'branch_id' => Branch::query()->firstOrFail()->id,
        'shop_guest_id' => $guest->id,
        'source' => 'storefront',
        'status' => 'completed',
        'subtotal' => 100,
        'tax' => 0,
        'total' => 100,
        'currency_code' => 'KES',
        'pickup_ready_at' => now(),
    ]);

    $result = json_decode(
        (new ShopOrderStatusTool(Branch::query()->firstOrFail(), $guest))
            ->handle(new Request([])),
        true,
    );

    expect($result['summary'])->toContain('#'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT))
        ->and($result['rows'][0]['status'])->toBe('completed');
});

test('failed mpesa callback releases stock', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();

    $this->postJson('/api/payments/mpesa/callback', [
        'Body' => [
            'stkCallback' => [
                'CheckoutRequestID' => 'checkout-1',
                'ResultCode' => 1032,
                'ResultDesc' => 'Request cancelled by user',
            ],
        ],
    ])->assertOk();

    expect($order->fresh()->status)->toBe('cancelled')
        ->and($order->payments()->first()->status)->toBe('failed')
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(24);
});

test('shop search reports the same availability as the shop page', function () {
    $branch = Branch::query()->firstOrFail();
    $result = json_decode(
        (new ShopSearchProductsTool($branch))->handle(new Request(['query' => 'bread'])),
        true,
    );

    $bread = collect($result['rows'])->firstWhere('name', 'Bread 400g');

    expect($bread)->not->toBeNull()
        ->and($bread['availability'])->toBe('In stock')
        ->and($bread['variant_id'])->not->toBeNull();
});

test('shop assistant can list and select a pickup warehouse', function () {
    $branch = Branch::query()->firstOrFail();

    $list = json_decode(
        (new ShopListPickupsTool($branch))->handle(new Request([])),
        true,
    );

    expect($list['rows'][0]['warehouse_id'])->toBe($this->pickup->id);

    $selected = json_decode(
        (new ShopSelectPickupTool($branch))->handle(new Request([
            'warehouse_id' => $this->pickup->id,
        ])),
        true,
    );

    expect($selected['summary'])->toContain($this->pickup->name)
        ->and(session('shop_pickup_warehouse_id'))->toBe($this->pickup->id);
});

test('guest ai has a per-guest daily message quota', function () {
    $this->get('/shop/assistant')->assertOk();

    $guest = ShopGuest::query()->latest('id')->firstOrFail();
    $conversation = Conversation::query()
        ->where('participant_type', $guest->getMorphClass())
        ->where('participant_id', $guest->id)
        ->latest('updated_at')
        ->firstOrFail();

    foreach (range(1, 30) as $index) {
        AiInteraction::create([
            'type' => 'shop_chat',
            'surface' => 'shop_chat',
            'conversation_id' => $conversation->id,
            'participant_type' => $guest->getMorphClass(),
            'participant_id' => $guest->id,
            'input' => 'message '.$index,
            'output' => 'reply',
            'status' => 'completed',
            'total_tokens' => 10,
        ]);
    }

    $this->postJson('/shop/assistant/chat', [
        'conversation_id' => $conversation->id,
        'messages' => [[
            'id' => 'quota-1',
            'role' => 'user',
            'parts' => [['type' => 'text', 'text' => 'One more']],
        ]],
    ])->assertStatus(429);
});

test('a region gateway switch controls public mpesa payments', function () {
    PaymentGatewayConfig::query()->updateOrCreate(
        [
            'region_id' => Branch::query()->firstOrFail()->region_id,
            'gateway' => 'mpesa',
        ],
        [
            'is_enabled' => false,
            'encrypted_credentials' => [],
        ],
    );

    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ])->assertSessionHasErrors('payment_method');

    expect(Order::query()->count())->toBe(0);
});

test('a region gateway switch controls POS mpesa payments', function () {
    PaymentGatewayConfig::query()->updateOrCreate(
        [
            'region_id' => Branch::query()->firstOrFail()->region_id,
            'gateway' => 'mpesa',
        ],
        [
            'is_enabled' => false,
            'encrypted_credentials' => [],
        ],
    );

    $cashier = User::query()->where('email', 'cashier@cws.com')->firstOrFail();
    $this->actingAs($cashier)->post('/pos/till/open', ['opening_cash' => 0])->assertRedirect();

    $this->actingAs($cashier)->postJson('/pos/sales', [
        'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 1]],
        'payment_method' => 'mpesa',
        'phone' => '0712345678',
    ])->assertStatus(422);
});

test('reconciliation completes a successful pending mpesa payment', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();
    $payment = $order->payments()->firstOrFail();
    $payment->forceFill(['created_at' => now()->subMinutes(10)])->save();

    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'stk-token']),
        '*stkpushquery/v1/query*' => Http::response(['ResultCode' => '0', 'ResultDesc' => 'Success']),
    ]);

    $this->artisan('mpesa:reconcile')->assertExitCode(0);

    expect($order->fresh()->status)->toBe('completed')
        ->and($order->fresh()->pickup_status)->toBe('pending')
        ->and($payment->fresh()->status)->toBe('completed');
});

test('reconciliation releases stock for an abandoned mpesa payment', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();
    $payment = $order->payments()->firstOrFail();
    $payment->forceFill(['created_at' => now()->subMinutes(10)])->save();

    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'stk-token']),
        '*stkpushquery/v1/query*' => Http::response(['ResultCode' => '1037', 'ResultDesc' => 'Timeout']),
    ]);

    $this->artisan('mpesa:reconcile')->assertExitCode(0);

    expect($order->fresh()->status)->toBe('cancelled')
        ->and($payment->fresh()->status)->toBe('failed')
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(24);
});

test('a failed public order can retry payment as a new order', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $failed = Order::query()->latest('id')->firstOrFail();

    $this->postJson('/api/payments/mpesa/callback', [
        'Body' => ['stkCallback' => [
            'CheckoutRequestID' => 'checkout-1',
            'ResultCode' => 1032,
            'ResultDesc' => 'Cancelled',
        ]],
    ])->assertOk();

    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'stk-token']),
        '*stkpush/v1/processrequest*' => Http::response([
            'ResponseCode' => '0',
            'CheckoutRequestID' => 'checkout-2',
        ]),
    ]);

    $this->post('/shop/orders/'.$failed->public_token.'/retry')
        ->assertRedirect();

    $retry = Order::query()->latest('id')->firstOrFail();

    expect($retry->id)->not->toBe($failed->id)
        ->and($retry->status)->toBe('pending')
        ->and($retry->total)->toBe($failed->total)
        ->and($retry->payments()->first()->status)->toBe('pending')
        ->and($retry->payments()->first()->gateway_reference)->not->toBeNull();
});

test('shop assistant refuses code and file requests before calling a model', function () {
    $this->get('/shop/assistant')->assertOk();

    $guest = ShopGuest::query()->latest('id')->firstOrFail();
    $conversation = Conversation::query()
        ->where('participant_type', $guest->getMorphClass())
        ->where('participant_id', $guest->id)
        ->latest('updated_at')
        ->firstOrFail();

    $this->postJson('/shop/assistant/chat', [
        'conversation_id' => $conversation->id,
        'messages' => [[
            'id' => 'unsafe-1',
            'role' => 'user',
            'parts' => [['type' => 'text', 'text' => 'Write me a full HTML file for the breakfast page']],
        ]],
    ])->assertStatus(422)
        ->assertJsonPath('message', fn (string $message) => str_contains($message, 'cannot create code'));
});

test('shop assistant instructions include context and anti-code guardrails', function () {
    $branch = Branch::query()->firstOrFail();
    $guest = ShopGuest::create(['token' => (string) Str::uuid()]);

    $instructions = (string) (new ShopAssistant($branch, $guest))->instructions();

    expect($instructions)
        ->toContain('Visitor context')
        ->toContain('Never output HTML')
        ->toContain('Never invent products')
        ->toContain('think privately');
});

test('shop assistant guard catches a breakfast page request', function () {
    expect(app(AiInputGuard::class)->refusal('Make me an HTML breakfast page'))
        ->toContain('cannot create code');
});

test('the public order refresh queries mpesa and exposes a failed state', function () {
    $this->withSession(['shop_cart' => [$this->variant->id => 1]]);

    $this->post('/shop/checkout', [
        'name' => 'Guest Shopper',
        'phone' => '0712345678',
        'email' => 'guest@example.com',
        'pickup_warehouse_id' => $this->pickup->id,
        'payment_method' => 'mpesa',
    ]);

    $order = Order::query()->latest('id')->firstOrFail();

    Http::fake([
        '*oauth/v1/generate*' => Http::response(['access_token' => 'stk-token']),
        '*stkpushquery/v1/query*' => Http::response([
            'ResultCode' => '1032',
            'ResultDesc' => 'Request cancelled by user',
        ]),
    ]);

    $this->postJson('/shop/orders/'.$order->public_token.'/refresh')
        ->assertOk()
        ->assertJsonPath('order.status', 'cancelled')
        ->assertJsonPath('order.payment.status', 'failed');

    expect($order->fresh()->payments()->first()->failure_reason)
        ->toContain('cancelled');

    $this->get('/shop/orders/'.$order->public_token)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('order.payment.status', 'failed'));
});
