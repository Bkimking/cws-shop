<?php

namespace App\Services;

use App\Models\PaymentGatewayConfig;
use App\Models\Region;

class PaymentMethods
{
    /**
     * @return array<string, array{label:string, enabled:bool, available:bool, reason:string|null}>
     */
    public function forRegion(?Region $region): array
    {
        $methods = [];

        foreach ($this->definitions() as $gateway => $label) {
            $enabled = $this->isEnabled($gateway, $region);
            $available = $enabled && $this->driverAvailable($gateway);

            $methods[$gateway] = [
                'label' => $label,
                'enabled' => $enabled,
                'available' => $available,
                'reason' => match (true) {
                    ! $enabled => 'Disabled for this region',
                    ! $this->driverAvailable($gateway) => 'Not configured for this deployment',
                    default => null,
                },
            ];
        }

        return $methods;
    }

    public function isEnabled(string $gateway, ?Region $region): bool
    {
        if ($region === null) {
            return false;
        }

        $config = PaymentGatewayConfig::query()
            ->where('region_id', $region->id)
            ->where('gateway', $gateway)
            ->first();

        if ($config !== null) {
            return (bool) $config->is_enabled;
        }

        return $this->defaultEnabled($gateway, $region);
    }

    public function isAvailable(string $gateway, ?Region $region): bool
    {
        return $this->isEnabled($gateway, $region) && $this->driverAvailable($gateway);
    }

    /**
     * @return array<string, string>
     */
    public function definitions(): array
    {
        return [
            'cash' => 'Cash',
            'mpesa' => 'M-Pesa',
            'paypal' => 'PayPal',
            'airtel' => 'Airtel Money',
            'card' => 'Card',
        ];
    }

    private function defaultEnabled(string $gateway, Region $region): bool
    {
        return $gateway === 'cash';
    }

    private function driverAvailable(string $gateway): bool
    {
        return match ($gateway) {
            'cash' => true,
            'mpesa' => app(MpesaStkService::class)->isConfigured(),
            'paypal' => (bool) config('paypal.enabled'),
            default => false,
        };
    }
}
