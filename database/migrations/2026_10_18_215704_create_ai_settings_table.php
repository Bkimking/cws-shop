<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->string('scope_key')->default('global');
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->string('surface');
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('daily_token_cap')->nullable();
            $table->decimal('daily_cost_cap', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['scope_key', 'surface']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
