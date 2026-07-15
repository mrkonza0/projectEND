<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProposalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResearcherController;
use Illuminate\Support\Facades\Route;

// Public
Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::get('/ping', fn () => response()->json(['status' => 'ok']));
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/auth/login',    [AuthController::class, 'login'])->middleware('throttle:auth');

// Protected (Bearer token via Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);

    Route::get('/profile',  [ProfileController::class, 'show']);
    Route::put('/profile',  [ProfileController::class, 'update']);
    Route::get('/me',       [ProfileController::class, 'show']);
    Route::put('/me',       [ProfileController::class, 'update']);
    Route::post('/me/photo', [ProfileController::class, 'uploadPhoto']);
    Route::delete('/me/photo', [ProfileController::class, 'deletePhoto']);
    Route::put('/password', [ProfileController::class, 'changePassword']);

    Route::get('/ref/research-types', fn () => response()->json([
        ['id' => 1, 'name' => 'Research project'],
        ['id' => 2, 'name' => 'Academic service'],
        ['id' => 3, 'name' => 'Innovation'],
    ]));
    Route::get('/ref/journal-types', fn () => response()->json([
        ['id' => 1, 'name' => 'National journal'],
        ['id' => 2, 'name' => 'International journal'],
        ['id' => 3, 'name' => 'Conference'],
    ]));
    Route::get('/notifications', fn () => response()->json(['fallback' => true]));
    Route::patch('/notifications/{id}/read', fn () => response()->json(['status' => 'ok']));
    Route::post('/notifications/read-all', fn () => response()->json(['status' => 'ok']));
    Route::delete('/notifications/{id}', fn () => response()->json(null, 204));

    Route::apiResource('projects',    ProjectController::class);
    Route::apiResource('researches',   ProjectController::class);
    Route::apiResource('articles',    ArticleController::class);
    Route::apiResource('journals',     ArticleController::class);
    Route::apiResource('researchers', ResearcherController::class);
    Route::apiResource('proposals',   ProposalController::class);
    Route::apiResource('reports',     ReportController::class);
    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::apiResource('files', FileController::class)->only(['index', 'store', 'show', 'destroy']);

    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::patch('/admin/users/{user}/role', [AdminUserController::class, 'updateRole']);
    Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy']);
});
