<?php

namespace App\Http\Controllers\Shop;

use App\Ai\Agents\ShopAssistant;
use App\Ai\AiConversationService;
use App\Ai\AiGuestUsage;
use App\Ai\AiInputGuard;
use App\Ai\AiPricing;
use App\Ai\AiProviders;
use App\Http\Controllers\Controller;
use App\Models\AiInteraction;
use App\Models\Order;
use App\Services\ShopCatalogService;
use App\Services\ShopGuestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Laravel\Ai\Vercel\Vercel;
use Throwable;

class ShopAssistantController extends Controller
{
    public function index(
        Request $request,
        ShopCatalogService $catalog,
        ShopGuestService $guests,
        AiConversationService $conversations,
        AiGuestUsage $usage,
    ): Response {
        $branch = $catalog->branch((int) $request->session()->get('shop_branch_id', 0) ?: null);
        $guest = $guests->resolve($request);
        $conversation = $conversations->forParticipant($guest)->first()
            ?? $conversations->create($guest);

        $latestOrder = Order::query()
            ->with('pickupWarehouse:id,name')
            ->where('shop_guest_id', $guest->id)
            ->latest('created_at')
            ->first();

        return Inertia::render('shop/assistant', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'currency' => $branch->region->currency_code,
            ],
            'conversationId' => $conversation->id,
            'initialMessages' => $conversations->uiMessages($conversation),
            'latestOrder' => $latestOrder !== null ? [
                'number' => '#'.str_pad((string) $latestOrder->id, 4, '0', STR_PAD_LEFT),
                'public_token' => $latestOrder->public_token,
                'status' => $latestOrder->status,
                'pickup_status' => $latestOrder->pickup_status,
                'payment_status' => $latestOrder->payments()->latest()->value('status'),
                'pickup' => $latestOrder->pickupWarehouse?->name,
                'ready' => $latestOrder->pickup_ready_at !== null,
            ] : null,
            'guestUsage' => $usage->snapshot($guest),
            'aiEnabled' => (bool) config('ai.enabled') && (bool) config('ai.surfaces.shop_chat'),
            'providerConfigured' => AiProviders::hasConfigured(),
        ]);
    }

    public function chat(
        Request $request,
        ShopCatalogService $catalog,
        ShopGuestService $guests,
        AiGuestUsage $usage,
        AiPricing $pricing,
        AiInputGuard $guard,
    ): StreamableAgentResponse|JsonResponse {
        $validated = $request->validate([
            'conversation_id' => ['required', 'string', 'exists:agent_conversations,id'],
            'messages' => ['required', 'array'],
        ]);

        if (! config('ai.enabled') || ! config('ai.surfaces.shop_chat')) {
            return response()->json(['message' => 'The shop assistant is turned off.'], 403);
        }

        if (! AiProviders::hasConfigured()) {
            return response()->json(['message' => 'No AI provider is configured. Add a provider key.'], 503);
        }

        $branch = $catalog->branch((int) $request->session()->get('shop_branch_id', 0) ?: null);
        $guest = $guests->resolve($request);

        /** @var Conversation $conversation */
        $conversation = Conversation::query()
            ->whereKey($validated['conversation_id'])
            ->where('participant_type', $guest->getMorphClass())
            ->where('participant_id', $guest->id)
            ->firstOrFail();

        if (! $usage->canStart($guest)) {
            return response()->json([
                'message' => 'The guest assistant limit for today is used up. Please use the shop or contact the branch.',
            ], 429);
        }

        $chat = Vercel::chat($request);
        $message = $chat->message();
        $input = $message !== null ? (string) $message->content : 'Shop message';

        if (($refusal = $guard->refusal($input)) !== null) {
            return response()->json(['message' => $refusal], 422);
        }

        $interaction = AiInteraction::create([
            'type' => 'shop_chat',
            'agent' => ShopAssistant::class,
            'surface' => 'shop_chat',
            'conversation_id' => $conversation->id,
            'participant_type' => $guest->getMorphClass(),
            'participant_id' => $guest->id,
            'region_id' => $branch->region_id,
            'branch_id' => $branch->id,
            'input' => Str::limit($input, 4000, ''),
            'output' => '',
            'status' => 'running',
        ]);

        $startedAt = (int) (microtime(true) * 1000);

        return (new ShopAssistant($branch, $guest))
            ->continue($conversation->id, as: $guest)
            ->stream(
                $chat,
                provider: AiProviders::forChat(),
                model: null,
                timeout: 60,
            )
            ->usingProtocol($chat->protocol())
            ->then(function ($response) use ($interaction, $pricing, $startedAt): void {
                $usage = $response->usage;

                $interaction->update([
                    'output' => $response->text ?? '',
                    'provider' => $response->meta->provider,
                    'model' => $response->meta->model,
                    'usage' => $usage->toArray(),
                    'input_tokens' => $usage->inputTokens,
                    'output_tokens' => $usage->outputTokens,
                    'total_tokens' => $usage->totalTokens(),
                    'cost' => $pricing->estimate(
                        $response->meta->provider,
                        $response->meta->model,
                        $usage->inputTokens,
                        $usage->outputTokens,
                    ),
                    'tool_calls' => $response->toolCalls->map(fn ($call) => $call->toArray())->values()->all(),
                    'status' => $response->hasPendingApprovals() ? 'awaiting_approval' : 'completed',
                    'latency_ms' => max(0, (int) (microtime(true) * 1000) - $startedAt),
                ]);
            })
            ->catch(function (Throwable $exception) use ($interaction, $startedAt): void {
                $interaction->update([
                    'status' => 'failed',
                    'output' => 'The shop assistant could not complete that request.',
                    'latency_ms' => max(0, (int) (microtime(true) * 1000) - $startedAt),
                ]);
            });
    }
}
