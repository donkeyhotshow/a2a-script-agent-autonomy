<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SearchController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Search API routes
Route::prefix('v1')->group(function () {
    Route::prefix('search')->group(function () {
        Route::get('/', [SearchController::class, 'search']);
        Route::post('/index', [SearchController::class, 'index']);
        Route::post('/bulk-index', [SearchController::class, 'bulkIndex']);
        Route::delete('/{documentId}', [SearchController::class, 'remove']);
        Route::get('/algorithm-info', [SearchController::class, 'getAlgorithmInfo']);
    });
}); 