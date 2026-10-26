<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_guests', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_guests');
    }
};
