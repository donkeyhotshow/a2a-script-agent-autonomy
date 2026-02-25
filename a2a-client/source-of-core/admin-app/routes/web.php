<?php

use App\Http\Controllers\Common\Background\ImagesController;
use App\Http\Controllers\Backend\UrlController;
use Illuminate\Support\Facades\Route;

// use App\Http\Controllers\Frontend\UrlController as FrontendUrlController; // Moved to planning
use App\Http\Controllers\Common\ModuleController;
use App\Http\Controllers\Frontend\ModuleResolverController;
use App\AiRudeDepot\Managers\PermanentLinkManager;
use Illuminate\Foundation\Application;

// use App\Http\Controllers\Backend\JsonPathEditorController; // Moved to planning
use Illuminate\Http\Request;

//Route::inertia('/', 'Static/Index',['title'=>'Home11']);

// // Dashboard для панели администратора - COMMENTED OUT due to missing controller
// Route::get('/panel', [App\Http\Controllers\Backend\DashboardController::class, 'index'])
//     ->middleware(['auth'])
//     ->name('dashboard');

// Загрузка административных маршрутов
// require __DIR__ . '/auth.php';
require __DIR__ . '/admin.php';
require __DIR__ . '/panel.php';

// // Тестовый маршрут для просмотра всех пермалинков
// Route::get('/test-permalinks', function () {
//     $linkManager = PermanentLinkManager::getInstance();
//     $permalinks = $linkManager->getAllPermalinks();

//     return response()->json([
//         'count' => count($permalinks),
//         'permalinks' => $permalinks
//     ]);
// })->middleware(['auth'])->name('test.permalinks');

// Admin module routes - администраторские модули через permalink (защищены auth)
Route::middleware(['auth'])->group(function () {
    Route::get('admin/{slug}', [ModuleController::class, 'runAdminModule'])
        ->where('slug', '.*')
        ->name('admin.module.run');
});

// Public module routes - COMMENTED OUT old Common/Resolver
// Route::get('module/{slug}', [App\Http\Controllers\Common\ModuleResolverController::class, 'processPermalinkFromPath'])
//     ->where('slug', '[a-z0-9\-\/]+')
//     ->name('public.module.run');

// NEW: Public module routes using Frontend/Resolver
Route::get('module/{slug}', [ModuleResolverController::class, 'handle'])
    ->where('slug', '[a-z0-9\-\/]+')
    ->name('public.module.run');

// Images
Route::get('/img/{path}', [ImagesController::class, 'show'])
    ->where('path', '.*')
    ->name('image');

// UrlController routes (Moved to planning)
// Route::get('/url/{url}', [FrontendUrlController::class, 'resolve']);
// Route::get('/redirect/{url}', [FrontendUrlController::class, 'handleRedirect']);
// Route::get('/404', [FrontendUrlController::class, 'notFound'])->name('frontend.url.notfound');

// Sitemap routes
Route::get('/sitemap.xml', [App\Http\Controllers\Frontend\SitemapController::class, 'index'])->name('sitemap.index');
Route::get('/sitemap-index.xml', [App\Http\Controllers\Frontend\SitemapController::class, 'sitemapIndex'])->name('sitemap.index');
Route::get('/sitemap-{module}.xml', [App\Http\Controllers\Frontend\SitemapController::class, 'module'])
    ->where('module', '(page|blog|product|custom)')
    ->name('sitemap.module');

// Обработка корневого URL (главная страница) - COMMENTED OUT old Common/ModuleController
// Route::get('/', [ModuleController::class, 'runHomepage'])->name('homepage');
// NEW: Use Frontend/Resolver for homepage (assuming it handles '/' or gets resolved via permalink)
Route::get('/', [ModuleResolverController::class, 'handle'])->name('homepage');

// Обработка прямых URL через permalink (должны быть последними)
// COMMENTED OUT old Common/Resolver
// Route::get('/{path}', [App\Http\Controllers\Common\ModuleResolverController::class, 'processPermalinkFromPath'])
//     ->where('path', '.*')
//     ->name('permalink.direct');
// Route::post('/{path}', [App\Http\Controllers\Common\ModuleResolverController::class, 'handleModuleAction'])
//     ->where('path', '.*')
//     ->name('permalink.direct.post');

// NEW: Direct permalinks using Frontend/Resolver
Route::get('/{path}', [ModuleResolverController::class, 'handle'])
    ->where('path', '.*') // Ensure this matches expected paths
    ->name('permalink.direct');

Route::post('/{path}', [ModuleResolverController::class, 'handle'])
    ->where('path', '.*') // Ensure this matches expected paths
    ->name('permalink.direct.post');

// Мы больше не используем устаревший формат URL, но оставляем его для обратной совместимости
// Route::get('{module}/{slug}', [UrlController::class, 'resolve'])
//     ->where('module', '(page|blog|product|custom)')
//     ->where('slug', '[a-z0-9\-/]+')
//     ->name('url.resolve');

// Comment out these routes related to JsonPathEditorController (Moved to planning)
// ... existing code ...

// Обработка корневого или необязательного пути - COMMENTED OUT old Common/Resolver
// Route::get('/{path?}', [App\Http\Controllers\Common\ModuleResolverController::class, 'processPermalinkFromPath'])
//     ->where('path', '.*');

// NEW: Catch-all/Optional path using Frontend/Resolver
// Note: This might conflict with the previous '/{path}'. Review if both are needed.
// Keeping the more specific '/{path}' above it.
// If this should handle ONLY the root '/' if not handled by homepage, adjust accordingly.
// For now, assuming it acts as a fallback like the old one.
// Route::get('/{path?}', [ModuleResolverController::class, 'handle'])
//    ->where('path', '.*'); // Commenting out for now due to potential conflict


// Маршрут для обработки permalinks через artisan
Route::post('/process-permalink', function (Request $request) {
    $command = base_path('artisan process:permalinks');
    $path = escapeshellarg($request->input('path'));
    $method = $request->input('method', 'generate');
    $data = escapeshellarg(json_encode($request->input('data', [])));

    $output = shell_exec("php {$command} {$path} {$method} {$data} 2>&1");

    return response()->json([
        'output' => $output,
        'status' => 'processed'
    ]);
})->middleware('auth')->name('permalink.process');

// Add a dummy login route for testing purposes
Route::get('/login', function () {
    // In a real app, this would show a login form
    // For tests, just returning a response is enough to define the route
    return response('Login page', 200);
})->name('login');


// Route::get('/{path}', [ModuleResolverController::class, 'processPermalinkFromPath'])
//     ->where('path', '.*')
//     ->name('permalink.direct');

// Route::get('/', [ModuleResolverController::class, 'processPermalinkFromPath']);

// Fallback or catch-all if needed, though the above should cover most
// Route::fallback([ModuleController::class, 'runModule']);

