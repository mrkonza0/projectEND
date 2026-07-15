<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('researcher');
            $table->string('type')->default('ทุนภายใน');
            $table->string('budget')->nullable();
            $table->string('year')->nullable();
            $table->string('status')->default('รอพิจารณา');
            $table->string('contract_no')->nullable();
            $table->string('contract_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};
