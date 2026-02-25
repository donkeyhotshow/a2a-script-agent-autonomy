<?php

namespace App\Providers;

//use App\AiRudeDepot\ModuleRenderer\Box\Box\Box\UnifiedStorage;
//use App\AiRudeDepot\ModuleRenderer\Box\StorageProcessor;
//use App\Console\Commands\Root\ModuleRenderer\Helpers\Storage;
//use App\Console\Commands\Root\ModuleRenderer\Processor;
use App\AiRudeDepot\Storage\DataHub;
use App\AiRudeDepot\Storage\UrlStorage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use App\Console\Commands\Listeners\ComponentLevelFilterListener;
use App\Console\Commands\Listeners\EnhancedSuggestionListener;
use App\Models\User;
use App\Models\LoggedIn;

//use App\Services\ResponseDataCollector;

class AppServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function register(): void
    {
        // Bind StorageSession as a singleton, providing the default disk name.
        $this->app->singleton(StorageSession::class, function ($app) {
            $defaultDiskName = 'ai'; // Use 'ai' as the default disk

            // Ensure the disk configuration exists (optional check)
            if (!config("filesystems.disks.{$defaultDiskName}")) {
                Log::warning("[AppServiceProvider] Disk configuration for '{$defaultDiskName}' not found. Ensure it exists in filesystems.php.");
            }
            // REMOVED: Storage::disk($defaultDiskName)->makeDirectory('.');

            Log::debug("[AppServiceProvider] Binding StorageSession (singleton) to use default disk: '{$defaultDiskName}'.");
            return new StorageSession($defaultDiskName);
        });

        // Bind UrlStorage as a singleton, providing the disk name and relative base path.
        $this->app->singleton(UrlStorage::class, function ($app) {
            $defaultDiskName = 'ai';
            $relativePermalinkPath = 'permalinks'; // Relative path within the 'ai' disk

            Log::debug("[AppServiceProvider] Binding UrlStorage (singleton) with disk '{$defaultDiskName}' and relative path '{$relativePermalinkPath}'.");
            // Pass disk name and relative path to constructor
            return new UrlStorage($defaultDiskName, $relativePermalinkPath);
        });

        // Add this binding (Keep existing binding if correct)
        // Assuming Data depends on DataHub now, not StorageSession? Or maybe Data needs adjustment?
        // Let's keep the existing binding for now, review 'Data' class if needed.
        $this->app->bind(Data::class, function ($app) {
            // Resolve StorageSession from the container.
            // Assumes StorageSession is resolvable (likely as singleton via AiServiceProvider)
            // $storageSession = $app->make(StorageSession::class); // Keep if Data uses StorageSession
            // Create Data instance, passing the resolved StorageSession
            // return new Data($storageSession);

            // If Data now needs DataHub:
            $dataHub = $app->make(DataHub::class); // Assumes DataHub is resolvable (e.g., via its own constructor)
            return new Data($dataHub); // Assuming Data constructor accepts DataHub

            // --> REVIEW REQUIRED for Data class binding <--
        });

        // Register ComponentLevelFilterListener first (other listeners depend on it)
        $this->app->singleton(ComponentLevelFilterListener::class, function ($app) {
            return new ComponentLevelFilterListener();
        });
        
        // Then register EnhancedSuggestionListener with ComponentLevelFilterListener injected
        $this->app->singleton(EnhancedSuggestionListener::class, function ($app) {
            return new EnhancedSuggestionListener(
                $app->make(ComponentLevelFilterListener::class)
            );
        });
    }

    public function boot(): void
    {
        //
    }
}
