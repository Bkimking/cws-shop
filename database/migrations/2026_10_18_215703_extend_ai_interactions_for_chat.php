<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_interactions', function (Blueprint $table) {
            $table->string('agent')->nullable()->after('type');
            $table->string('surface')->nullable()->after('agent');
            $table->string('conversation_id', 36)->nullable()->after('surface')->index();
            $table->string('assistant_message_id', 36)->nullable()->after('conversation_id');
            $table->string('participant_type')->nullable()->after('assistant_message_id');
            $table->unsignedBigInteger('participant_id')->nullable()->after('participant_type');
            $table->foreignId('region_id')->nullable()->after('participant_id')->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->after('region_id')->constrained()->nullOnDelete();
            $table->string('provider')->nullable()->after('branch_id');
            $table->string('model')->nullable()->after('provider');
            $table->json('usage')->nullable()->after('model');
            $table->json('tool_calls')->nullable()->after('usage');
            $table->string('status')->default('completed')->after('tool_calls');
            $table->unsignedInteger('latency_ms')->nullable()->after('status');
            $table->decimal('cost', 10, 6)->nullable()->after('latency_ms');
            $table->string('feedback')->nullable()->after('cost');

            $table->index(['surface', 'created_at']);
            $table->index(['region_id', 'branch_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_interactions', function (Blueprint $table) {
            $table->dropIndex(['surface', 'created_at']);
            $table->dropIndex(['region_id', 'branch_id', 'created_at']);
            $table->dropConstrainedForeignId('region_id');
            $table->dropConstrainedForeignId('branch_id');
            $table->dropColumn([
                'agent',
                'surface',
                'conversation_id',
                'assistant_message_id',
                'participant_type',
                'participant_id',
                'provider',
                'model',
                'usage',
                'tool_calls',
                'status',
                'latency_ms',
                'cost',
                'feedback',
            ]);
        });
    }
};
