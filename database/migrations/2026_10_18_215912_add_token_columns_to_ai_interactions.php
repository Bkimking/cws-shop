<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_interactions', function (Blueprint $table) {
            $table->unsignedInteger('input_tokens')->nullable()->after('usage');
            $table->unsignedInteger('output_tokens')->nullable()->after('input_tokens');
            $table->unsignedInteger('total_tokens')->nullable()->after('output_tokens');
            $table->index(['created_by', 'surface', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_interactions', function (Blueprint $table) {
            $table->dropIndex(['created_by', 'surface', 'created_at']);
            $table->dropColumn(['input_tokens', 'output_tokens', 'total_tokens']);
        });
    }
};
