<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class, // must run first
            RoleSeeder::class,       // depends on permissions existing
            RegionSeeder::class,     // must run before branches
            PaymentGatewaySeeder::class, // region-level payment defaults
            BranchSeeder::class,     // depends on regions existing
            SuperadminSeeder::class, // depends on branches existing
            DemoRoleUsersSeeder::class, // region/branch/inventory demo desks
            DemoPosSeeder::class,    // Demo POS
            TransactionSeeder::class, // 10 days of realistic transaction data
        ]);
    }
}
