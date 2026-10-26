<?php

namespace App\Http\Controllers\Admin\Ai;

use App\Ai\AiConversationService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Models\Conversation;

class AiConversationController extends Controller
{
    public function store(Request $request, AiConversationService $conversations): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:4000'],
        ]);

        /** @var Conversation $conversation */
        $conversation = $conversations->create($request->user(), $validated['message'] ?? null);

        return response()->json([
            'id' => $conversation->getKey(),
            'title' => $conversation->getAttribute('title'),
        ], 201);
    }

    public function messages(Conversation $conversation, AiConversationService $conversations): JsonResponse
    {
        Gate::authorize('view', $conversation);

        return response()->json([
            'messages' => $conversations->uiMessages($conversation),
        ]);
    }

    public function update(Request $request, Conversation $conversation, AiConversationService $conversations): JsonResponse
    {
        Gate::authorize('update', $conversation);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:80'],
        ]);

        /** @var Conversation $conversation */
        $conversation = $conversations->rename($conversation, $validated['title']);

        return response()->json([
            'id' => $conversation->getKey(),
            'title' => $conversation->getAttribute('title'),
        ]);
    }

    public function destroy(Conversation $conversation, AiConversationService $conversations): JsonResponse
    {
        Gate::authorize('delete', $conversation);

        $conversations->delete($conversation);

        return response()->json(['deleted' => true]);
    }
}
