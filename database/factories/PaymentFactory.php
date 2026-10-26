<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'gateway' => fake()->randomElement(['cash', 'mpesa', 'airtel', 'card', 'paypal']),
            'amount' => fake()->randomFloat(2, 10, 1000),
            'status' => fake()->randomElement(['pending', 'completed', 'failed', 'refunded']),
            'gateway_reference' => fake()->uuid(),
        ];
    }
}
