<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('researchers', function (Blueprint $table) {
            $table->string('prefix')->nullable()->after('id');
            $table->string('first_name')->nullable()->after('prefix');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('work_type')->nullable()->after('last_name');   // วิชาการ / สายสนับสนุน
            $table->string('program')->nullable()->after('faculty');       // หลักสูตร/ฝ่าย
            $table->string('position')->nullable()->after('program');
            $table->text('address')->nullable()->after('position');
            $table->string('birthday')->nullable()->after('address');
            $table->string('line_id')->nullable()->after('phone');
            $table->string('national_id', 13)->nullable()->after('line_id');
            $table->json('education')->nullable()->after('national_id');
            $table->json('expertise_detail')->nullable()->after('education');
        });
    }

    public function down(): void
    {
        Schema::table('researchers', function (Blueprint $table) {
            $table->dropColumn([
                'prefix', 'first_name', 'last_name', 'work_type',
                'program', 'position', 'address', 'birthday',
                'line_id', 'national_id', 'education', 'expertise_detail',
            ]);
        });
    }
};
