<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Order;
use App\Models\TillSession;
use App\Models\User;
use App\Notifications\NewOrderNotification;
use App\Notifications\TillNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    public function newOrder(Order $order): void
    {
        $order->loadMissing('branch.region');

        $users = $this->dashboardUsers(
            $order->branch,
            'view orders',
        );

        if ($users->isEmpty()) {
            return;
        }

        Notification::send($users, new NewOrderNotification([
            'kind' => 'new_order',
            'title' => 'New order received',
            'message' => 'Order #'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT)
                .' · '.ucfirst($order->source).' · '.$order->currency_code.' '.number_format((float) $order->total, 2),
            'order_id' => $order->id,
            'branch_id' => $order->branch_id,
            'url' => route('admin.orders.show', $order),
        ]));
    }

    public function till(TillSession $till, string $event, User $actor): void
    {
        $till->loadMissing('branch');
        $users = $this->dashboardUsers($till->branch, 'view reports');

        if ($users->isEmpty()) {
            return;
        }

        $title = $event === 'opened' ? 'Till opened' : 'Till closed';
        $verb = $event === 'opened' ? 'opened' : 'closed';

        Notification::send($users, new TillNotification([
            'kind' => 'till_'.$event,
            'title' => $title,
            'message' => $actor->name.' '.$verb.' the till at '.$till->branch->name.'.',
            'till_id' => $till->id,
            'branch_id' => $till->branch_id,
            'url' => route('admin.dashboard'),
        ]));
    }

    /**
     * @return Collection<int, User>
     */
    private function dashboardUsers(?Branch $branch, string $permission): Collection
    {
        if ($branch === null) {
            return collect();
        }

        return User::query()
            ->where('is_active', true)
            ->where(function ($query) use ($branch) {
                $query->where('branch_id', $branch->id)
                    ->orWhere('region_id', $branch->region_id)
                    ->orWhereHas('roles', fn ($role) => $role->where('name', 'Superadmin'));
            })
            ->get()
            ->filter(fn (User $user) => $user->can($permission))
            ->values();
    }
}
