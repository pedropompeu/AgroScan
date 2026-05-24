<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('field_scoutings', function (Blueprint $table) {
            $table->string('disease_code')->nullable()->after('disease_detected');
        });
    }

    public function down(): void
    {
        Schema::table('field_scoutings', function (Blueprint $table) {
            $table->dropColumn('disease_code');
        });
    }
};
