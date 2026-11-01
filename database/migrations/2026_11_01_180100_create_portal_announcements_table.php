<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_announcements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portal_id')->unique();
            $table->string('title');
            $table->text('body');
            $table->string('type')->default('update');
            $table->boolean('pinned')->default(false);
            $table->string('download_url')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_announcements');
    }
};
