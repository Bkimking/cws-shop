<?php

namespace App\Tour;

use App\Models\User;

class TourService
{
    /**
     * @return list<array{key:string, title:string, description:string, href:string, icon:string}>
     */
    public function stepsFor(User $user): array
    {
        if (! $user->can('access admin panel')) {
            return [];
        }

        $steps = [
            $this->step('dashboard', 'Dashboard', 'Your daily starting point: sales, orders, branch activity and quick actions.', '/admin', 'layout-dashboard'),
        ];

        if ($user->can('view region reports')) {
            $steps[] = $this->step('region', 'Region desk', 'See every branch in your region, compare performance and spot low stock.', '/admin/region', 'globe');
        }

        if ($user->can('view branch reports')) {
            $steps[] = $this->step('branch', 'Branch desk', 'Open your branch command centre: tills, team, orders and stock.', '/admin/branch', 'store');
        }

        if ($user->can('view stock')) {
            $steps[] = $this->step('inventory', 'Inventory desk', 'Track stock health, replenishment and recent stock movements.', '/admin/inventory', 'warehouse');
        }

        if ($user->can('use pos terminal')) {
            $steps[] = $this->step('pos', 'Sell at the POS', 'Open a till, scan products, take cash or M-Pesa and print the receipt.', '/pos', 'scan');
        }

        if ($user->can('view products')) {
            $steps[] = $this->step('products', 'Products', 'Find catalog items, prices and variants — and edit where your role allows.', '/admin/products', 'box');
        }

        if ($user->can('view stock')) {
            $steps[] = $this->step('stock', 'Stock', 'Review on-hand quantities, reorder points and adjustments.', '/admin/stock', 'boxes');
        }

        if ($user->can('manage warehouses')) {
            $steps[] = $this->step('warehouses', 'Warehouses', 'Manage the physical locations where stock is held.', '/admin/warehouses', 'building');
        }

        if ($user->can('view orders')) {
            $steps[] = $this->step('orders', 'Orders', 'Review sales and pickup orders, their payments and fulfilment status.', '/admin/orders', 'receipt');
        }

        if ($user->can('manage payment gateways')) {
            $steps[] = $this->step('payments', 'Payment gateways', 'Choose which payment methods are enabled for each region.', '/admin/payment-gateways', 'credit-card');
        }

        if ($user->can('view users') || $user->can('manage users')) {
            $steps[] = $this->step('users', 'People and access', 'Manage staff accounts, roles and the scope each person can see.', '/admin/users', 'users');
        }

        if ($user->can('view reports')) {
            $steps[] = $this->step('reports', 'Reports', 'Understand the numbers behind sales, stock and branch performance.', '/admin/reports', 'chart');
        }

        if ($user->can('view activity log')) {
            $steps[] = $this->step('activity', 'Activity log', 'Audit important changes made by people and the AI assistant.', '/admin/activity', 'history');
        }

        if ($user->can('use ai assistant')) {
            $steps[] = $this->step('ai', 'AI assistant', 'Ask questions about sales, stock and orders without writing reports by hand.', '/admin/ai', 'sparkles');
        }

        return $steps;
    }

    /**
     * @return array{key:string, title:string, description:string, href:string, icon:string}
     */
    private function step(string $key, string $title, string $description, string $href, string $icon): array
    {
        return compact('key', 'title', 'description', 'href', 'icon');
    }
}
