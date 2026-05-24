<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // boundary é geography NOT NULL mas farms precisam ser criadas antes do polígono ser definido
        DB::statement('ALTER TABLE farms ALTER COLUMN boundary DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE farms ALTER COLUMN boundary SET NOT NULL');
    }
};
