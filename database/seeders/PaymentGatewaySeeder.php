<?php

namespace Database\Seeders;

use App\Models\PaymentGatewayConfig;
use App\Models\Region;
use Illuminate\Database\Seeder;

class PaymentGatewaySeeder extends Seeder
{
    public function run(): void
    {
        foreach (Region::query()->get() as $region) {
            $defaults = [
                'cash' => true,
                'mpesa' => strtoupper((string) $region->country_code) === 'KE',
                'paypal' => false,
                'airtel' => false,
                'card' => false,
            ];

            foreach ($defaults as $gateway => $enabled) {
                PaymentGatewayConfig::query()->firstOrCreate(
                    [
                        'region_id' => $region->id,
                        'gateway' => $gateway,
                    ],
                    [
                        'is_enabled' => $enabled,
                        'encrypted_credentials' => [],
                    ],
                );
            }

            $this->command->info('Payment gateways seeded for '.$region->name.'.');
        }
    }
}
