<?php

use App\Ai\Agents\AdminAssistant;
use App\Ai\AiConversationService;
use App\Ai\AiPricing;
use App\Ai\AiScope;
use App\Ai\Tools\AdjustStockTool;
use App\Ai\Tools\CreateCategoryTool;
use App\Ai\Tools\CreateProductTool;
use App\Ai\Tools\FailedLoginsTool;
use App\Ai\Tools\ListUsersTool;
use App\Ai\Tools\LowStockTool;
use App\Ai\Tools\OrderLookupTool;
use App\Ai\Tools\SalesSummaryTool;
use App\Ai\Tools\SecurityOverviewTool;
use App\Ai\Tools\UpdateProductTool;
use App\Ai\Tools\UserAccessTool;
use App\Models\AiInteraction;
use App\Models\Branch;
use App\Models\Category;
use App\Models\LoginAttempt;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Region;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RegionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Tools\Request as ToolRequest;

beforeEach(function () {
    $this->withoutVite();
    $this->withSession(['_token' => 'ai-test-token']);
    $this->withHeader('X-CSRF-TOKEN', 'ai-test-token');

    $this->seed([
        PermissionSeeder::class,
        RoleSeeder::class,
        RegionSeeder::class,
        BranchSeeder::class,
    ]);

    $this->region = Region::firstOrFail();
    $this->branch = Branch::firstOrFail();

    $this->superadmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->superadmin->forceFill(['email_verified_at' => now()])->save();
    $this->superadmin->assignRole('Superadmin');

    $this->branchAdmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->branchAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->branchAdmin->assignRole('Branch Admin');

    $this->otherAdmin = User::factory()->create(['branch_id' => $this->branch->id]);
    $this->otherAdmin->forceFill(['email_verified_at' => now()])->save();
    $this->otherAdmin->assignRole('Branch Admin');

    $this->category = Category::create(['name' => 'AI Test Category']);
    $this->product = Product::create([
        'category_id' => $this->category->id,
        'name' => 'Milk 1L',
        'sku' => 'AI-MILK-1',
        'base_price' => 120,
        'is_active' => true,
    ]);
    $this->variant = ProductVariant::create([
        'product_id' => $this->product->id,
        'variant_name' => 'Default',
        'sku_suffix' => '-D',
        'price_delta' => 0,
    ]);
    $this->warehouse = Warehouse::create([
        'branch_id' => $this->branch->id,
        'name' => 'AI Test Store',
    ]);
    $this->stock = StockLevel::create([
        'warehouse_id' => $this->warehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 3,
        'reorder_point' => 10,
    ]);

    $this->secondBranch = Branch::create([
        'region_id' => $this->region->id,
        'name' => 'AI Second Branch',
        'slug' => 'ai-second-branch',
        'address' => 'Second address',
        'phone' => '+254700000002',
        'is_active' => true,
    ]);
    $this->secondWarehouse = Warehouse::create([
        'branch_id' => $this->secondBranch->id,
        'name' => 'AI Second Store',
    ]);
    StockLevel::create([
        'warehouse_id' => $this->secondWarehouse->id,
        'product_variant_id' => $this->variant->id,
        'quantity_on_hand' => 50,
        'reorder_point' => 10,
    ]);
});

test('low stock tool is scoped to the branch', function () {
    $scope = new AiScope($this->branchAdmin, $this->region, $this->branch);

    $result = json_decode(
        (new LowStockTool($scope))->handle(new ToolRequest(['limit' => 20])),
        true,
    );

    expect($result['rows'])->toHaveCount(1)
        ->and($result['rows'][0]['product'])->toBe('Milk 1L')
        ->and($result['rows'][0]['branch'])->toBe($this->branch->name)
        ->and($result['scope']['branch_id'])->toBe($this->branch->id);
});

test('specialists are filtered by the user permissions', function () {
    $branchScope = new AiScope($this->branchAdmin, $this->region, $this->branch);
    expect((new AdminAssistant($branchScope))->tools())->toHaveCount(9);

    $inventoryManager = User::factory()->create(['branch_id' => $this->branch->id]);
    $inventoryManager->forceFill(['email_verified_at' => now()])->save();
    $inventoryManager->assignRole('Inventory Manager');

    $inventoryScope = new AiScope($inventoryManager, $this->region, $this->branch);
    expect((new AdminAssistant($inventoryScope))->tools())->toHaveCount(5);
});

test('sales tools read completed orders in scope', function () {
    $order = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => 'completed',
        'subtotal' => 100,
        'tax' => 16,
        'total' => 116,
        'currency_code' => 'KES',
    ]);

    $scope = new AiScope($this->branchAdmin, $this->region, $this->branch);
    $today = now($scope->timezone())->toDateString();
    $filters = ['from' => $today, 'to' => $today];

    $summary = json_decode(
        (new SalesSummaryTool($scope))->handle(new ToolRequest($filters)),
        true,
    );

    expect($summary['rows'][0]['orders'])->toBe(1)
        ->and((float) $summary['rows'][0]['revenue'])->toBe(116.0);

    $lookup = json_decode(
        (new OrderLookupTool($scope))->handle(new ToolRequest(['order_id' => $order->id])),
        true,
    );

    expect($lookup['rows'][0]['order'])->toBe('#'.$order->id)
        ->and((float) $lookup['rows'][0]['total'])->toBe(116.0);
});

test('write tools create a category, product and stock adjustment with permission', function () {
    $scope = new AiScope($this->superadmin, $this->region, $this->branch);

    $category = json_decode(
        (new CreateCategoryTool($scope))->handle(new ToolRequest(['name' => 'AI Pantry'])),
        true,
    );

    expect($category['rows'][0]['name'])->toBe('AI Pantry');

    $product = json_decode(
        (new CreateProductTool($scope))->handle(new ToolRequest([
            'name' => 'AI Tea',
            'category_id' => $category['rows'][0]['category_id'],
            'base_price' => 250,
            'variant_name' => '500g',
        ])),
        true,
    );

    expect($product['rows'][0]['name'])->toBe('AI Tea')
        ->and($product['rows'][0]['sku'])->not->toBeNull();

    $stock = json_decode(
        (new AdjustStockTool($scope))->handle(new ToolRequest([
            'stock_level_id' => $this->stock->id,
            'quantity_change' => 5,
            'reason' => 'AI test receipt',
        ])),
        true,
    );

    expect($stock['rows'][0]['new_quantity'])->toBe(8)
        ->and($this->stock->fresh()->quantity_on_hand)->toBe(8)
        ->and(StockMovement::query()->where('reference_id', 'AI-'.$this->stock->id)->exists())->toBeTrue();
});

test('write tools are approvable', function () {
    $scope = new AiScope($this->superadmin, $this->region, $this->branch);

    $approval = (new AdjustStockTool($scope))->shouldRequestApproval(new ToolRequest([
        'stock_level_id' => $this->stock->id,
        'quantity_change' => 2,
        'reason' => 'Test',
    ]));

    expect($approval)->not->toBeNull()
        ->and($approval->reason)->toContain('Adjust stock level');
});

test('superadmin can inspect users and security risks', function () {
    $scope = new AiScope($this->superadmin, $this->region, $this->branch);

    expect((new AdminAssistant($scope))->tools())->toHaveCount(10);

    $users = json_decode(
        (new ListUsersTool($scope))->handle(new ToolRequest(['limit' => 10])),
        true,
    );

    expect($users['rows'])->not->toBeEmpty()
        ->and(collect($users['rows'])->pluck('name'))->toContain($this->superadmin->name);

    $overview = json_decode(
        (new SecurityOverviewTool($scope))->handle(new ToolRequest([])),
        true,
    );

    expect($overview['rows'])->not->toBeEmpty()
        ->and(collect($overview['rows'])->pluck('risk'))->toContain('Superadmins without 2FA');

    $access = json_decode(
        (new UserAccessTool($scope))->handle(new ToolRequest([
            'user_id' => $this->superadmin->id,
        ])),
        true,
    );

    expect($access['rows'][0]['roles'])->toContain('Superadmin');
});

test('security tools reject non superadmin users', function () {
    $scope = new AiScope($this->branchAdmin, $this->region, $this->branch);

    expect(fn () => (new ListUsersTool($scope))->handle(new ToolRequest([])))
        ->toThrow(AuthorizationException::class);
});

test('a conversation is private to its owner', function () {
    $this->actingAs($this->superadmin)
        ->postJson(route('admin.ai.conversations.store'), ['message' => 'Private chat'])
        ->assertCreated();

    $conversation = Conversation::query()->latest('created_at')->firstOrFail();

    $this->actingAs($this->otherAdmin)
        ->get(route('admin.ai.show', $conversation))
        ->assertForbidden();
});

test('the chat endpoint streams and audits a response', function () {
    config(['ai.providers.openai.key' => 'test-key']);

    AdminAssistant::fake(['Here is the answer from the assistant.']);

    $conversation = app(AiConversationService::class)
        ->create($this->superadmin, 'Hello');

    $response = $this->actingAs($this->superadmin)->postJson(route('admin.ai.chat'), [
        'conversation_id' => $conversation->id,
        'messages' => [[
            'id' => 'user-message',
            'role' => 'user',
            'parts' => [['type' => 'text', 'text' => 'Hello']],
        ]],
    ]);

    $response->assertOk();

    $stream = $response->streamedContent();
    $text = collect(explode("\n", $stream))
        ->filter(fn (string $line) => str_starts_with($line, 'data: {'))
        ->map(fn (string $line) => json_decode(substr($line, 6), true))
        ->filter(fn (array $event) => ($event['type'] ?? null) === 'text-delta')
        ->pluck('delta')
        ->implode('');

    expect($text)->toContain('Here is the answer');

    $interaction = AiInteraction::query()->latest('id')->firstOrFail();

    expect($interaction->conversation_id)->toBe($conversation->id)
        ->and($interaction->agent)->toBe(AdminAssistant::class)
        ->and($interaction->status)->toBe('completed')
        ->and($interaction->output)->toContain('Here is the answer');
});

test('the ai center page renders for a superadmin', function () {
    $this->actingAs($this->superadmin)
        ->get(route('admin.ai.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/ai/index'));
});

test('ai settings are superadmin only', function () {
    $this->actingAs($this->superadmin)
        ->get(route('admin.ai.settings.edit'))
        ->assertOk();

    $this->actingAs($this->branchAdmin)
        ->get(route('admin.ai.settings.edit'))
        ->assertForbidden();
});

test('ai settings can switch a surface off', function () {
    $this->actingAs($this->superadmin)
        ->put(route('admin.ai.settings.update'), [
            'settings' => [[
                'surface' => 'admin_chat',
                'enabled' => false,
                'daily_token_cap' => 1000,
                'daily_cost_cap' => 1,
            ]],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('ai_settings', [
        'scope_key' => 'global',
        'surface' => 'admin_chat',
        'enabled' => false,
    ]);
});

test('a cashier cannot reach the ai center', function () {
    $cashier = User::factory()->create(['branch_id' => $this->branch->id]);
    $cashier->forceFill(['email_verified_at' => now()])->save();
    $cashier->assignRole('Cashier');

    $this->actingAs($cashier)
        ->get(route('admin.ai.index'))
        ->assertForbidden();
});

test('failed sign-ins are recorded and available to the security agent', function () {
    $this->post('/login', [
        'email' => $this->superadmin->email,
        'password' => 'definitely-wrong',
    ])->assertSessionHasErrors();

    $attempt = LoginAttempt::query()->latest('id')->firstOrFail();

    expect($attempt->email)->toBe($this->superadmin->email)
        ->and($attempt->user_id)->toBe($this->superadmin->id);

    $scope = new AiScope($this->superadmin, $this->region, $this->branch);
    $result = json_decode(
        (new FailedLoginsTool($scope))->handle(new ToolRequest(['limit' => 10])),
        true,
    );

    expect($result['rows'][0]['email'])->toBe($this->superadmin->email)
        ->and($result['summary'])->toContain('failed sign-in');
});

test('high-value approval mode only gates large stock or price changes', function () {
    config([
        'ai.approvals.mode' => 'high_value',
        'ai.approvals.stock_unit_threshold' => 50,
        'ai.approvals.product_price_threshold' => 1000,
    ]);

    $scope = new AiScope($this->superadmin, $this->region, $this->branch);

    expect((new AdjustStockTool($scope))->shouldRequestApproval(new ToolRequest([
        'stock_level_id' => $this->stock->id,
        'quantity_change' => 1,
        'reason' => 'Small correction',
    ])))->toBeNull()
        ->and((new AdjustStockTool($scope))->shouldRequestApproval(new ToolRequest([
            'stock_level_id' => $this->stock->id,
            'quantity_change' => 100,
            'reason' => 'Large correction',
        ])))->not->toBeNull();

    expect((new UpdateProductTool($scope))->shouldRequestApproval(new ToolRequest([
        'product_id' => $this->product->id,
        'base_price' => 200,
    ])))->toBeNull()
        ->and((new UpdateProductTool($scope))->shouldRequestApproval(new ToolRequest([
            'product_id' => $this->product->id,
            'base_price' => 2000,
        ])))->not->toBeNull();
});

test('ai usage cost is calculated from configurable model rates', function () {
    config([
        'ai.pricing.deepseek' => ['input' => 1.0, 'output' => 2.0],
    ]);

    expect((new AiPricing)->estimate('deepseek', 'deepseek-chat', 1_000_000, 1_000_000))
        ->toBe(3.0);
});
