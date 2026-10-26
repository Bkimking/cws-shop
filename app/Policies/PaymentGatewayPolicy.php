<?php

namespace App\Policies;

use App\Models\PaymentGatewayConfig;
use App\Models\User;

class PaymentGatewayPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('manage payment gateways');
    }

    public function view(User $user, PaymentGatewayConfig $paymentGatewayConfig): bool
    {
        return $user->can('manage payment gateways')
            && $this->inScope($user, $paymentGatewayConfig);
    }

    public function create(User $user): bool
    {
        return $user->can('create payment gateways');
    }

    public function update(User $user, PaymentGatewayConfig $paymentGatewayConfig): bool
    {
        return $user->can('edit payment gateways')
            && $this->inScope($user, $paymentGatewayConfig);
    }

    public function activate(User $user, PaymentGatewayConfig $paymentGatewayConfig): bool
    {
        return $user->can('activate payment gateways')
            && $this->inScope($user, $paymentGatewayConfig);
    }

    public function delete(User $user, PaymentGatewayConfig $paymentGatewayConfig): bool
    {
        return $user->can('delete payment gateways')
            && $this->inScope($user, $paymentGatewayConfig);
    }

    private function inScope(User $user, PaymentGatewayConfig $gateway): bool
    {
        if ($user->hasRole('Superadmin')) {
            return true;
        }

        return (int) $gateway->region_id === (int) $user->effectiveRegionId();
    }
}
