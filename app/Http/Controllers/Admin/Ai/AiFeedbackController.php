<?php

namespace App\Http\Controllers\Admin\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiInteraction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Models\Conversation;

class AiFeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => ['required', 'string', 'exists:agent_conversations,id'],
            'message_id' => ['required', 'string', 'max:36'],
            'rating' => ['required', 'string', 'in:helpful,not_helpful'],
        ]);

        /** @var Conversation $conversation */
        $conversation = Conversation::query()->findOrFail($validated['conversation_id']);
        Gate::authorize('view', $conversation);

        AiInteraction::query()
            ->where('conversation_id', $conversation->getKey())
            ->where('assistant_message_id', $validated['message_id'])
            ->latest('id')
            ->first()
            ?->update(['feedback' => $validated['rating']]);

        return response()->json(['saved' => true]);
    }
}
