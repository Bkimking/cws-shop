<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ngong = Branch::where('slug', 'ngong')->first();

        if (! $ngong) {
            $this->command->error('Ngong branch not found. Please run BranchSeeder first.');

            return;
        }

        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@cws.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'branch_id' => $ngong->id,
                'is_active' => true,
            ]
        );

        $superadminRole = Role::where('name', 'Superadmin')->first();
        if ($superadminRole) {
            $superadmin->assignRole($superadminRole);
        }

        $this->command->info('Superadmin user created: superadmin@cws.com / password');
    }
}
