<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['projects', 'articles', 'proposals', 'reports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'owner_user_id')) {
                    $table->foreignId('owner_user_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('users')
                        ->nullOnDelete();
                }
            });
        }

        DB::table('projects')
            ->join('users', 'projects.researcher', '=', 'users.name')
            ->whereNull('projects.owner_user_id')
            ->update(['projects.owner_user_id' => DB::raw('users.id')]);

        DB::table('articles')
            ->join('users', 'articles.author', '=', 'users.name')
            ->whereNull('articles.owner_user_id')
            ->update(['articles.owner_user_id' => DB::raw('users.id')]);

        DB::table('proposals')
            ->join('users', 'proposals.researcher', '=', 'users.name')
            ->whereNull('proposals.owner_user_id')
            ->update(['proposals.owner_user_id' => DB::raw('users.id')]);

        DB::table('reports')
            ->join('users', 'reports.researcher', '=', 'users.name')
            ->whereNull('reports.owner_user_id')
            ->update(['reports.owner_user_id' => DB::raw('users.id')]);
    }

    public function down(): void
    {
        foreach (['projects', 'articles', 'proposals', 'reports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'owner_user_id')) {
                    $table->dropConstrainedForeignId('owner_user_id');
                }
            });
        }
    }
};
