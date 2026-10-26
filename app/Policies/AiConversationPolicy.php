<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;
use Laravel\Ai\Models\Conversation;

class AiConversationPolicy
{
    public function view(User|Customer $user, Conversation $conversation): bool
    {
        return $this->owns($user, $conversation);
    }

    public function update(User|Customer $user, Conversation $conversation): bool
    {
        return $this->owns($user, $conversation);
    }

    public function delete(User|Customer $user, Conversation $conversation): bool
    {
        return $this->owns($user, $conversation);
    }

    private function owns(User|Customer $user, Conversation $conversation): bool
    {
        return $conversation->getAttribute('participant_type') === $user->getMorphClass()
            && (string) $conversation->getAttribute('participant_id') === (string) $user->getKey();
    }
}
