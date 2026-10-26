<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'branch_id' => null,
            'customer_id' => null,
            'source' => fake()->randomElement(['pos', 'storefront']),
            'status' => fake()->randomElement(['pending', 'completed', 'cancelled']),
            'subtotal' => fake()->randomFloat(2, 10, 1000),
            'tax' => fake()->randomFloat(2, 0, 100),
            'total' => fake()->randomFloat(2, 10, 1100),
            'currency_code' => 'KES',
        ];
    }
}
