<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->unique(['region_id', 'gateway']);
        });
    }

    public function down(): void
    {
        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->dropUnique(['region_id', 'gateway']);
        });
    }
};
