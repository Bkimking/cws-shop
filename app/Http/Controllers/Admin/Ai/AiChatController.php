<?php

namespace App\Http\Controllers\Admin\Ai;

use App\Ai\Agents\AdminAssistant;
use App\Ai\AiAudit;
use App\Ai\AiInputGuard;
use App\Ai\AiProviders;
use App\Ai\AiScope;
use App\Ai\AiSettings;
use App\Ai\AiUsage;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Laravel\Ai\Vercel\Vercel;
use Throwable;

class AiChatController extends Controller
{
    public function store(
        Request $request,
        AiSettings $settings,
        AiUsage $usage,
        AiAudit $audit,
        AiInputGuard $guard,
    ): StreamableAgentResponse|JsonResponse {
        $validated = $request->validate([
            'conversation_id' => ['required', 'string', 'exists:agent_conversations,id'],
            'surface' => ['nullable', 'string', 'in:admin_chat'],
            'region_id' => ['nullable', 'integer'],
            'branch_id' => ['nullable', 'integer'],
            'context' => ['nullable', 'array'],
            'context.type' => ['nullable', 'string', 'in:order,product,stock_level'],
            'context.id' => ['nullable', 'integer'],
            'messages' => ['required', 'array'],
        ]);

        /** @var Conversation $conversation */
        $conversation = Conversation::query()->findOrFail($validated['conversation_id']);
        Gate::authorize('view', $conversation);

        $scope = AiScope::forStaff($request->user(), $request);

        if (! $settings->enabled($scope)) {
            return response()->json(['message' => 'AI assistant is turned off.'], 403);
        }

        if (! $scope->hasAdminSpecialistAccess()) {
            return response()->json(['message' => 'You do not have access to an AI specialist.'], 403);
        }

        if (! $usage->canStart($scope)) {
            return response()->json([
                'message' => 'Today\'s AI limit is used up. It resets at midnight.',
            ], 429);
        }

        if (! $settings->providerConfigured()) {
            return response()->json([
                'message' => 'No AI provider is configured. Add a key for DeepSeek, Gemini, Anthropic, OpenAI, Mistral, Groq or xAI and try again.',
            ], 503);
        }

        $providers = AiProviders::forChat();

        $chat = Vercel::chat($request);
        $message = $chat->message();
        $input = $message !== null ? (string) $message->content : 'Chat message';

        if (($refusal = $guard->refusal($input)) !== null) {
            return response()->json(['message' => $refusal], 422);
        }

        $interaction = $audit->start(
            $scope,
            AdminAssistant::class,
            $conversation->getKey(),
            $input,
            $validated['context'] ?? null,
        );

        $startedAt = (int) (microtime(true) * 1000);

        $agent = (new AdminAssistant($scope))->continue($conversation->getKey(), as: $request->user());

        return $agent
            ->stream(
                $chat,
                provider: $providers,
                model: null,
                timeout: 90,
            )
            ->usingProtocol($chat->protocol())
            ->then(fn ($response) => $audit->finish($interaction, $response, $startedAt))
            ->catch(function (Throwable $exception) use ($audit, $interaction, $startedAt): void {
                $audit->fail($interaction, $exception, $startedAt);
            });
    }
}
