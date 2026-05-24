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
        Schema::create('field_scoutings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained();
            $table->geography('location', 'point', 4326);
            $table->string('disease_detected')->nullable();
            $table->float('confidence_score')->nullable();
            $table->string('image_path')->nullable();
            $table->enum('status', ['pending', 'synced'])->default('pending');
            $table->uuid('farm_id')->nullable();
            $table->foreign('farm_id')->references('id')->on('farms')->onDelete('cascade');
            $table->timestamps();
        });

        // Add GIST index for spatial performance
        DB::statement('CREATE INDEX field_scoutings_location_gist ON field_scoutings USING GIST (location)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('field_scoutings');
    }
};
