<?php

namespace App\Ai;

use App\Models\AiInteraction;
use App\Models\ShopGuest;
use Illuminate\Database\Eloquent\Builder;

class AiGuestUsage
{
    public function canStart(ShopGuest $guest): bool
    {
        $query = $this->query($guest);

        $messageCap = (int) config('ai.limits.shop_chat.guest_messages', 30);

        if ((clone $query)->count() >= $messageCap) {
            return false;
        }

        $tokenCap = (int) config('ai.limits.shop_chat.daily_tokens', 100000);

        if ($tokenCap > 0 && (int) (clone $query)->sum('total_tokens') >= $tokenCap) {
            return false;
        }

        $costCap = (float) config('ai.limits.shop_chat.daily_cost', 2.00);

        if ($costCap > 0 && (float) (clone $query)->sum('cost') >= $costCap) {
            return false;
        }

        $globalCap = (float) config('ai.limits.global_daily_cost', 25.00);

        if ($globalCap > 0 && (float) AiInteraction::query()
            ->whereDate('created_at', today())
            ->sum('cost') >= $globalCap) {
            return false;
        }

        return true;
    }

    /**
     * @return array{messages:int, message_cap:int, tokens:int, token_cap:int, cost:float, cost_cap:float}
     */
    public function snapshot(ShopGuest $guest): array
    {
        $query = $this->query($guest);

        return [
            'messages' => (int) (clone $query)->count(),
            'message_cap' => (int) config('ai.limits.shop_chat.guest_messages', 30),
            'tokens' => (int) (clone $query)->sum('total_tokens'),
            'token_cap' => (int) config('ai.limits.shop_chat.daily_tokens', 100000),
            'cost' => (float) (clone $query)->sum('cost'),
            'cost_cap' => (float) config('ai.limits.shop_chat.daily_cost', 2.00),
        ];
    }

    /**
     * @return Builder<AiInteraction>
     */
    private function query(ShopGuest $guest): Builder
    {
        return AiInteraction::query()
            ->where('surface', 'shop_chat')
            ->where('participant_type', $guest->getMorphClass())
            ->where('participant_id', $guest->id)
            ->whereDate('created_at', today());
    }
}
