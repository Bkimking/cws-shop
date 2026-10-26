<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('pickup_status')->default('pending')->after('status');
            $table->timestamp('collected_at')->nullable()->after('pickup_notified_at');
            $table->foreignId('collected_by')->nullable()->after('collected_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('collected_by');
            $table->dropColumn(['pickup_status', 'collected_at']);
        });
    }
};
