<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Laravel\Ai\Models\Conversation;

/**
 * @property int $id
 * @property string $type
 * @property string|null $agent
 * @property string|null $surface
 * @property string|null $conversation_id
 * @property string|null $assistant_message_id
 * @property string|null $participant_type
 * @property int|null $participant_id
 * @property int|null $region_id
 * @property int|null $branch_id
 * @property string|null $provider
 * @property string|null $model
 * @property array|null $usage
 * @property array|null $tool_calls
 * @property int|null $input_tokens
 * @property int|null $output_tokens
 * @property int|null $total_tokens
 * @property string $status
 * @property int|null $latency_ms
 * @property string|null $cost
 * @property string|null $feedback
 * @property string|null $context_type
 * @property int|null $context_id
 * @property string $input
 * @property string $output
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $createdBy
 * @property-read Model|null $context
 * @property-read Conversation|null $conversation
 * @property-read Region|null $region
 * @property-read Branch|null $branch
 */
#[Fillable([
    'type',
    'agent',
    'surface',
    'conversation_id',
    'assistant_message_id',
    'participant_type',
    'participant_id',
    'region_id',
    'branch_id',
    'provider',
    'model',
    'usage',
    'tool_calls',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'status',
    'latency_ms',
    'cost',
    'feedback',
    'context_type',
    'context_id',
    'input',
    'output',
    'created_by',
])]
class AiInteraction extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'usage' => 'array',
            'tool_calls' => 'array',
            'input_tokens' => 'integer',
            'output_tokens' => 'integer',
            'total_tokens' => 'integer',
            'latency_ms' => 'integer',
            'cost' => 'decimal:6',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function context()
    {
        return $this->morphTo();
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
