<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            if (!Schema::hasColumn('files', 'entity_type')) {
                $table->string('entity_type')->nullable()->after('owner_user_id');
            }
            if (!Schema::hasColumn('files', 'entity_id')) {
                $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            if (Schema::hasColumn('files', 'entity_type')) {
                $table->dropColumn('entity_type');
            }
            if (Schema::hasColumn('files', 'entity_id')) {
                $table->dropColumn('entity_id');
            }
        });
    }
};
