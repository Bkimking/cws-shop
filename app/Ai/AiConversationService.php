<?php

namespace App\Ai;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Vercel\Vercel;

class AiConversationService
{
    public function __construct(private readonly ConversationStore $store) {}

    public function create(Model $participant, ?string $firstMessage = null): Conversation
    {
        $title = filled($firstMessage)
            ? Str::limit(trim($firstMessage), 60)
            : 'New chat';

        $id = $this->store->storeConversation(
            Conversation::participantType($participant),
            Conversation::participantKey($participant),
            $title,
        );

        return Conversation::query()->findOrFail($id);
    }

    /**
     * @return Collection<int, Conversation>
     */
    public function forParticipant(Model $participant): Collection
    {
        return Conversation::query()
            ->where('participant_type', Conversation::participantType($participant))
            ->where('participant_id', Conversation::participantKey($participant))
            ->latest('updated_at')
            ->get();
    }

    /**
     * @return Collection<int, Conversation>
     */
    public function forUser(Model $user): Collection
    {
        return $this->forParticipant($user);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function uiMessages(Conversation $conversation): array
    {
        return Vercel::toUiMessages(
            $conversation->messages()->oldest()->get()
        );
    }

    public function rename(Conversation $conversation, string $title): Conversation
    {
        $conversation->update(['title' => Str::limit(trim($title), 80)]);

        return $conversation;
    }

    public function delete(Conversation $conversation): void
    {
        $conversation->messages()->delete();
        $conversation->delete();
    }
}
