<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoRoleUsersSeeder extends Seeder
{
    public function run(): void
    {
        $region = Region::query()->where('slug', 'kenya')->first();
        $branch = Branch::query()->where('slug', 'ngong')->first();

        if (! $region || ! $branch) {
            $this->command->error('Region and branch must exist before demo role users.');

            return;
        }

        $accounts = [
            [
                'role' => 'Region Admin',
                'name' => 'Region Admin',
                'email' => 'regionadmin@cws.com',
                'branch_id' => null,
                'region_id' => $region->id,
            ],
            [
                'role' => 'Branch Admin',
                'name' => 'Branch Admin',
                'email' => 'branchadmin@cws.com',
                'branch_id' => $branch->id,
                'region_id' => null,
            ],
            [
                'role' => 'Inventory Manager',
                'name' => 'Inventory Manager',
                'email' => 'inventory@cws.com',
                'branch_id' => $branch->id,
                'region_id' => null,
            ],
        ];

        foreach ($accounts as $account) {
            $user = User::query()->firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ],
            );

            $user->forceFill([
                'name' => $account['name'],
                'branch_id' => $account['branch_id'],
                'region_id' => $account['region_id'],
                'is_active' => true,
                'email_verified_at' => now(),
            ])->save();

            $role = Role::findOrCreate($account['role']);
            $user->syncRoles([$role]);

            $this->command->info($account['role'].' login: '.$account['email'].' / password');
        }
    }
}
