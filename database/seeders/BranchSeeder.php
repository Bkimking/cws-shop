<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Region;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kenya = Region::where('slug', 'kenya')->first();

        if (! $kenya) {
            $this->command->error('kenya region not found. Please run RegionSeeder first.');

            return;
        }

        $ngong = Branch::firstOrCreate(
            ['slug' => 'ngong'],
            [
                'region_id' => $kenya->id,
                'name' => 'Ngong',
                'address' => 'Ngong Town, Kajiado County',
                'phone' => '+254700000000',
                'is_active' => true,
            ]
        );

        $this->command->info('Branch created: Ngong');
    }
}
