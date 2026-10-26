<?php

namespace Database\Factories;

use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Region>
 */
class RegionFactory extends Factory
{
    protected $model = Region::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'slug' => fake()->unique()->slug(2),
            'country_code' => fake()->unique()->bothify('??##'),
            'currency_code' => 'KES',
            'tax_rate' => '16',
            'timezone' => 'Africa/Nairobi',
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the region is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}