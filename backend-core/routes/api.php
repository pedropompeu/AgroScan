<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\ScoutingController;
use App\Http\Controllers\Api\S3ConfigController;

// Autenticação pública
Route::post('/auth/login', [AuthController::class, 'login']);

// Rotas protegidas por token de usuário
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $request) => $request->user());
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::apiResource('farms', FarmController::class);

    Route::get('/scoutings', [ScoutingController::class, 'index']);
    Route::get('/scoutings/heatmap', [ScoutingController::class, 'heatmap']);
    Route::post('/scoutings/sync', [ScoutingController::class, 'sync']);
    Route::post('/storage/presigned-url', [S3ConfigController::class, 'getPresignedUrl']);
});

// Callback interno do Motor de IA — protegido por secret compartilhado, não por token de usuário
Route::post('/scoutings/ai-callback', [ScoutingController::class, 'aiCallback']);

Route::put('/mock-upload', function () {
    return response()->json(['status' => 'uploaded']);
});
