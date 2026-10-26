<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('till_session_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('till_sessions')
                ->nullOnDelete();
        });

        Schema::table('till_sessions', function (Blueprint $table) {
            $table->string('variance_reason')->nullable()->after('closing_cash');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('till_session_id');
        });

        Schema::table('till_sessions', function (Blueprint $table) {
            $table->dropColumn('variance_reason');
        });
    }
};
