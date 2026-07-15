<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('researchers', function (Blueprint $table) {
            if (!Schema::hasColumn('researchers', 'owner_user_id')) {
                $table->foreignId('owner_user_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });

        DB::table('researchers')
            ->join('users', 'researchers.email', '=', 'users.email')
            ->whereNull('researchers.owner_user_id')
            ->update(['researchers.owner_user_id' => DB::raw('users.id')]);
    }

    public function down(): void
    {
        Schema::table('researchers', function (Blueprint $table) {
            if (Schema::hasColumn('researchers', 'owner_user_id')) {
                $table->dropConstrainedForeignId('owner_user_id');
            }
        });
    }
};
