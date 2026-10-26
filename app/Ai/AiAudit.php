<?php

namespace App\Ai;

use App\Models\AiInteraction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Ai\Responses\StreamedAgentResponse;
use Throwable;

class AiAudit
{
    public function __construct(private readonly AiPricing $pricing) {}

    /**
     * @param  array{type?: string, id?: int|null}|null  $context
     */
    public function start(
        AiScope $scope,
        string $agent,
        string $conversationId,
        string $input,
        ?array $context = null,
    ): AiInteraction {
        return AiInteraction::create([
            'type' => 'chat',
            'agent' => $agent,
            'surface' => $scope->surface,
            'conversation_id' => $conversationId,
            'participant_type' => $scope->user->getMorphClass(),
            'participant_id' => $scope->user->getKey(),
            'region_id' => $scope->region?->id,
            'branch_id' => $scope->branch?->id,
            'input' => Str::limit($input, 60000, ''),
            'output' => '',
            'status' => 'running',
            'created_by' => $scope->user->id,
            'context_type' => $context['type'] ?? null,
            'context_id' => $context['id'] ?? null,
        ]);
    }

    public function finish(AiInteraction $interaction, StreamedAgentResponse $response, int $startedAt): void
    {
        $usage = $response->usage;

        $interaction->update([
            'output' => $response->text ?? '',
            'provider' => $response->meta->provider,
            'model' => $response->meta->model,
            'usage' => $usage->toArray(),
            'input_tokens' => $usage->inputTokens,
            'output_tokens' => $usage->outputTokens,
            'total_tokens' => $usage->totalTokens(),
            'tool_calls' => $response->toolCalls
                ->map(fn ($call) => $call->toArray())
                ->values()
                ->all(),
            'assistant_message_id' => $response->assistantMessageId,
            'cost' => $this->pricing->estimate(
                $response->meta->provider,
                $response->meta->model,
                $usage->inputTokens,
                $usage->outputTokens,
            ),
            'status' => $response->hasPendingApprovals() ? 'awaiting_approval' : 'completed',
            'latency_ms' => max(0, (int) (microtime(true) * 1000) - $startedAt),
        ]);
    }

    public function fail(AiInteraction $interaction, Throwable $exception, int $startedAt): void
    {
        Log::error('AI request failed.', [
            'interaction_id' => $interaction->getKey(),
            'conversation_id' => $interaction->conversation_id,
            'exception' => $exception::class,
            'message' => $exception->getMessage(),
        ]);

        $interaction->update([
            'status' => 'failed',
            'output' => AiErrorPresenter::forUser($exception),
            'latency_ms' => max(0, (int) (microtime(true) * 1000) - $startedAt),
        ]);
    }
}
