<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Seeder;

class RegionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kenya = Region::firstOrCreate(
            ['slug' => 'kenya'],
            [
                'name' => 'kenya',
                'country_code' => 'KE',
                'currency_code' => 'KES',
                'tax_rate' => '16.00',
                'timezone' => 'Africa/Nairobi',
                'is_active' => true,
            ]
        );

        $this->command->info('Region created: Kenya');
    }
}
