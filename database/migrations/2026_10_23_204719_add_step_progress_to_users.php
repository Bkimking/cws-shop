<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('tour_current_step')->nullable()->after('tour_skipped_at');
            $table->json('tour_completed_steps')->nullable()->after('tour_current_step');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tour_current_step', 'tour_completed_steps']);
        });
    }
};
