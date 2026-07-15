<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('faculty')->nullable()->after('name');
            $table->string('major')->nullable()->after('faculty');
            $table->string('position')->nullable()->after('major');
            $table->string('phone', 20)->nullable()->after('position');
            $table->string('role')->default('user')->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['faculty', 'major', 'position', 'phone', 'role']);
        });
    }
};
