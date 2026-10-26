<?php

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Region;
use App\Models\User;

beforeEach(function () {
    $this->superadmin = User::factory()->create();
    $this->superadmin->assignRole('Superadmin');

    $this->region = Region::factory()->create();
    $this->branch = Branch::factory()->create(['region_id' => $this->region->id]);
    $this->customer = Customer::factory()->create(['region_id' => $this->region->id]);
    $this->product = Product::factory()->create();
    $this->productVariant = ProductVariant::factory()->create(['product_id' => $this->product->id]);
});

test('superadmin can view orders index', function () {
    $response = $this->actingAs($this->superadmin)
        ->get(route('admin.orders.index'));

    $response->assertStatus(200);
});

test('unauthenticated user cannot view orders index', function () {
    $response = $this->get(route('admin.orders.index'));

    $response->assertRedirect('/login');
});

test('superadmin can create order', function () {
    $response = $this->actingAs($this->superadmin)
        ->post(route('admin.orders.store'), [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'source' => 'pos',
            'status' => 'pending',
            'items' => [
                [
                    'product_variant_id' => $this->productVariant->id,
                    'quantity' => 2,
                    'unit_price' => '100.00',
                    'discount' => '0',
                ],
            ],
            'subtotal' => '200.00',
            'tax' => '32.00',
            'total' => '232.00',
            'currency_code' => 'KES',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'status' => 'pending',
    ]);
    $this->assertDatabaseHas('order_items', [
        'product_variant_id' => $this->productVariant->id,
        'quantity' => 2,
    ]);
});

test('superadmin can view order details', function () {
    $order = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
    ]);

    $response = $this->actingAs($this->superadmin)
        ->get(route('admin.orders.show', $order));

    $response->assertStatus(200);
});

test('superadmin can update order', function () {
    $order = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->superadmin)
        ->put(route('admin.orders.update', $order), [
            'status' => 'completed',
            'items' => [
                [
                    'product_variant_id' => $this->productVariant->id,
                    'quantity' => 1,
                    'unit_price' => '100.00',
                    'discount' => '0',
                ],
            ],
            'subtotal' => '100.00',
            'tax' => '16.00',
            'total' => '116.00',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'status' => 'completed',
    ]);
});

test('superadmin can refund order', function () {
    $order = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'status' => 'completed',
    ]);

    Payment::factory()->create([
        'order_id' => $order->id,
        'status' => 'completed',
    ]);

    $response = $this->actingAs($this->superadmin)
        ->post(route('admin.orders.refund', $order));

    $response->assertRedirect();
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'status' => 'cancelled',
    ]);
    $this->assertDatabaseHas('payments', [
        'order_id' => $order->id,
        'status' => 'refunded',
    ]);
});

test('cannot refund cancelled order', function () {
    $order = Order::factory()->create([
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'status' => 'cancelled',
    ]);

    $response = $this->actingAs($this->superadmin)
        ->post(route('admin.orders.refund', $order));

    $response->assertRedirect();
    $response->assertSessionHasErrors();
});
