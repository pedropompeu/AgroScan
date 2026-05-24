<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('farms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->geography('boundary', 'polygon', 4326);
            $table->timestamps();
        });

        // Add GIST index for spatial performance
        DB::statement('CREATE INDEX farms_boundary_gist ON farms USING GIST (boundary)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('farms');
    }
};
