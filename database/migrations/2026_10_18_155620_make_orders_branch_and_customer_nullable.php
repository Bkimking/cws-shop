<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * POS walk-in sales and online-only orders do not always have a customer
     * or a branch. The original migration chained nullable() after the foreign
     * key, which did not reach the column definition, so the live table was
     * created NOT NULL. Correct it here.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->change();
            $table->unsignedBigInteger('customer_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable(false)->change();
            $table->unsignedBigInteger('customer_id')->nullable(false)->change();
        });
    }
};
