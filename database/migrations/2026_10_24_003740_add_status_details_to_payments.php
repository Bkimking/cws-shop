<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->after('status');
            $table->timestamp('last_checked_at')->nullable()->after('expires_at');
            $table->string('failure_reason')->nullable()->after('last_checked_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['expires_at', 'last_checked_at', 'failure_reason']);
        });
    }
};
