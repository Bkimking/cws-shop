<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_entitlements', function (Blueprint $table) {
            $table->id();
            $table->string('installation_id')->unique();
            $table->string('status')->default('active');
            $table->string('plan_code')->nullable();
            $table->json('features')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->timestamp('grace_until')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('snapshot_expires_at')->nullable();
            $table->text('signature')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_entitlements');
    }
};
