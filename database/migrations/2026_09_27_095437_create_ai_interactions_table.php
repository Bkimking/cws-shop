<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_interactions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // forecast, chat, anomaly, promo, report
            $table->string('context_type')->nullable(); // e.g., 'App\Models\Order', 'App\Models\Product'
            $table->unsignedBigInteger('context_id')->nullable();
            $table->index(['context_type', 'context_id']);
            $table->text('input');
            $table->text('output');
            $table->foreignId('created_by')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_interactions');
    }
};
