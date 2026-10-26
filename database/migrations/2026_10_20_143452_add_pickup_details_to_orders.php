<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('pickup_warehouse_id')->nullable()->after('branch_id')->constrained('warehouses')->nullOnDelete();
            $table->string('customer_name')->nullable()->after('customer_id');
            $table->string('customer_email')->nullable()->after('customer_name');
            $table->string('customer_phone')->nullable()->after('customer_email');
            $table->timestamp('pickup_ready_at')->nullable()->after('currency_code');
            $table->timestamp('pickup_notified_at')->nullable()->after('pickup_ready_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pickup_warehouse_id');
            $table->dropColumn(['customer_name', 'customer_email', 'customer_phone', 'pickup_ready_at', 'pickup_notified_at']);
        });
    }
};
