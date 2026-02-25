<?php
namespace App\Console\Commands\Config;

trait FtpConfig
{
    protected array $dirs = [
        'public',
        'storage',
        'resources',
    ];

    protected function createFilesystem()
    {
        // Заглушка: возвращаем объект, совместимый с Laravel Filesystem
        return new \Illuminate\Filesystem\Filesystem();
    }

    protected function uploadFile(string $localPath, string $remotePath)
    {
        // TODO: реальная логика будет вынесена в libs/php/Config
        copy($localPath, $remotePath);
    }

    protected function setPermissions(string $remotePath)
    {
        @chmod($remotePath, 0644);
    }
}

<?php

namespace App\Console\Commands\Config;

use App\Facades\StorageManager;
use App\Hooks\FileFacade;
use Exception;
use League\Flysystem\Filesystem;
use League\Flysystem\PhpseclibV3\SftpAdapter;
use League\Flysystem\PhpseclibV3\SftpConnectionProvider;
use phpseclib3\Net\SFTP;
use App\Helpers\PathHelper;

trait FtpConfig
{
    protected Filesystem $filesystem;
    protected $sftpConnection; // Файловая система
    protected array $connection = [
        'host' => 'barberxxl.com.ua',   // Хост
        'username' => 'aleon',          // Логин
        'password' => '51202368DdP',    // Пароль
        'port' => 22,                   // Порт SFTP
        'timeout' => 60,                    // Таймаут в секундах
        'root' => '/home/aleon/apps/admin-app', // Путь к директории на сервере (корневой для адаптера)
    ];
    protected array $colors = [
        'df' => "\033[39m", // Default
        'gy' => "\033[90m", // Gray
        'gr' => "\033[32m", // Green
        'cy' => "\033[36m", // Cyan
        'yl' => "\033[33m", // Yellow
        'bl' => "\033[34m", // Blue
        'mg' => "\033[35m", // Magenta
        'rd' => "\033[31m", // Red
    ];
    protected array $dirs = [
        'app', 'config', 'bootstrap', 'database', 'lang', 'tests',
        'resources/backend', 'resources/views', 'resources/common',
        'resources/config', 'resources/frontend', 'routes',
        'install-modules'
    ];
    /**
     * PRODUCTION download mappings.
     * Key: Remote path (relative to SFTP root defined in $connection['root']).
     * Value: Local path (relative to base_path()).
     */
    protected array $downloadMappings = [
        'storage/logs/installer.log' => 'storage/logs/server_installer.log', // Example for installer log
        'storage/logs/laravel.log' => 'storage/logs/server_laravel.log', // Example for laravel log
        // 'storage/ai/question-to-user/results' => 'storage/app/qtu_results', // Example for QTU results
    ];
    /**
     * TEST download mappings. Use safe paths for testing.
     * Key: Remote path (relative to SFTP root defined in $connection['root']).
     * Value: Local path (relative to base_path()).
     */
    protected array $testDownloadMappings = [
        // --- ЗАПОЛНИТЕ ЭТИ ПУТИ ДЛЯ ТЕСТОВ ---
        'test_remote/source' => 'storage/app/test_local/destination', // Example test path
        // 'test_remote/logs/test.log' => 'storage/logs/server_test.log',
    ];
    private array $dirColors = ['cyan', 'yellow', 'green', 'blue', 'magenta', 'red'];

    public function __construct()
    {
        parent::__construct();
    }

    public function storagePath($caller = false): string
    {
        // Отримуємо ім'я класу виклику
        $className = class_basename(self::class);

        // Замінюємо символи некоректні для імені файлу
        $sanitizedClassName = str_replace('\\', '_', $className);

        $path = storage_path("commands/{$sanitizedClassName}.json");

        if (!FileFacade::exists(dirname($path))) {
            FileFacade::makeDirectory(dirname($path), 0777, true); // Створюємо директорію, якщо вона не існує
        }
        return $path;
    }

// Метод для подключения через SFTP

    public function dirColor(int $idx): string
    {
        return $this->dirColors[$idx % count($this->dirColors)];
    }

    public function uploadFile(string $localPath, string $remotePath): void
    {
        $sftp = $this->getSftpConnection(); // Получаем активное подключение
        $sftp->mkdir(dirname($remotePath), -1, true);

//        if (!$sftp->makeDirectory($directoryPath)) {}
//            $filesystem->createDirectory($directoryPath);
//            $this->msg('Directory created successfully: ' . $directoryPath, 'green');


        if (!$sftp->put($remotePath, $localPath, SFTP::SOURCE_LOCAL_FILE)) {
            throw new Exception("Failed to upload file: {$localPath} to {$remotePath}");
        }
        $this->msg("File uploaded successfully: {$remotePath}", 'green');
    }

    protected function getSftpConnection(): SFTP
    {
        // Если соединение уже существует, используем его
        if (!$this->sftpConnection) {
            $this->sftpConnection = $this->createSftpConnection();
        }

        return $this->sftpConnection;
    }

    protected function createSftpConnection(): SFTP
    {
        $sftp = new SFTP($this->connection['host'], $this->connection['port']);

        if (!$sftp->login($this->connection['username'], $this->connection['password'])) {
            throw new Exception('Login failed');
        }

        $this->msg('SSH connection established successfully.', 'green');
        return $sftp;
    }

    protected function msg(string $text, string $color = 'df'): void
    {
        $colorCode = $this->colors[$color] ?? $this->colors['df'];
        print "{$colorCode}{$text}\033[39m\n";
    }

    public function setPermissions(string $remotePath, int $permissions = 0777): void
    {
        $sftp = $this->getSftpConnection(); // Получаем активное подключение
        if (!$sftp->chmod($permissions, $remotePath)) {
            throw new Exception("Failed to set permissions on {$remotePath}");
        }
        $this->msg("Permissions set to {$permissions} for file: {$remotePath}", 'magenta');
    }

    public function storeAndUploadCode(string $path, string $code): void
    {
        $fullPath = base_path($path);
        FileFacade::ensureDirectoryExists(dirname($fullPath)); // Убедимся, что директория существует
        $code = stripslashes($code);
        // Сохраняем код в локальный файл
        FileFacade::put($fullPath, $code);
        $this->msg("Received code for:" . $path, 'green');
        $this->msg("Code to write:" . $code, 'green');
        $this->msg("Code stored locally: {$fullPath}", 'green');

        /*    try {
                // Используем метод uploadFile для загрузки на сервер
                $remotePath = $this->connection['root'] . '/' . $path; // Формируем путь на сервере
                $this->uploadFile($fullPath,PathHelper::normalizePath($remotePath)); // Загрузка файла на сервер
                $this->msg("Code uploaded: {$remotePath}", 'cyan');
            } catch (\Exception $e) {
                $this->msg("Error uploading code: {$e->getMessage()}", 'red');
            }*/
    }

    public function downloadFile(string $remotePath, string $localPath): bool // Return bool for success/failure
    {
        $sftp = $this->getSftpConnection();
        $localDir = dirname($localPath);

        // Ensure local directory exists
        if (!FileFacade::isDirectory($localDir)) {
            FileFacade::makeDirectory($localDir, 0777, true, true);
            $this->msg("Local directory created: {$localDir}", 'bl');
        }

        $this->msg("Attempting to download: {$remotePath} -> {$localPath}", 'yl');

        // Use the 'get' method of phpseclib SFTP object
        $fileContent = $sftp->get($remotePath);

        if ($fileContent === false) {
            // Check if the error is simply 'file not found' - this might not be a fatal error during sync
            $errors = $sftp->getSFTPErrors(); // Use getSFTPErrors()
            $isNotFoundError = false;
            // Basic check, might need refinement based on actual error messages
            if (is_array($errors) && !empty($errors)) {
                $lastError = end($errors);
                if (is_string($lastError) && (stripos($lastError, 'No such file') !== false || stripos($lastError, 'does not exist') !== false)) {
                    $isNotFoundError = true;
                }
            }

            if ($isNotFoundError) {
                $this->msg("Remote file not found (skipped): {$remotePath}", 'gy');
                return false; // Indicate file not found/skipped
            } else {
                // Log the actual error for better diagnosis
                $errorString = is_array($errors) ? implode('; ', $errors) : 'Unknown SFTP error';
                throw new Exception("Failed to download file: {$remotePath}. SFTP Errors: " . $errorString);
            }
        }

        // Write content to local file
        FileFacade::put($localPath, $fileContent);

        $this->msg("File downloaded successfully: {$localPath}", 'gr');
        return true; // Indicate success
    }

    protected function scanDirectory(string $path): array
    {
        $files = [];
        $items = scandir($path);

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $fullPath = realpath("{$path}/{$item}");
            if (is_dir($fullPath)) {
                $files = array_merge($files, $this->scanDirectory($fullPath));
            } else {
                $files[] = $fullPath;
            }
        }

        return $files;
    }

    protected function createFilesystem(): Filesystem
    {
        try {
            $connectionProvider = new SftpConnectionProvider(
                $this->connection['host'],       // Хост
                $this->connection['username'],   // Логин
                $this->connection['password'],   // Пароль
                null,                            // Приватный ключ (null, если не используется)
                $this->connection['port'],       // Порт (обычно 22 для SFTP)
                $this->connection['timeout']     // Таймаут подключения
            );

            $this->msg('Connection established successfully.', 'green');

            return new Filesystem(new SftpAdapter($connectionProvider, $this->connection['root']));
        } catch (Exception $e) {
            $this->msg('Failed to connect: ' . $e->getMessage(), 'red');
            throw $e;
        }
    }

    // NEW: Helper method for downloading

    protected function cleanRemovedFiles(): void
    {
        $manifest = json_decode(FileFacade::get(storage_path(implode("/", ["commands", "ftp"]) . ".json")), true);
        $remoteFiles = array_keys($manifest);

        foreach ($remoteFiles as $remoteFile) {
            if (!file_exists(base_path($remoteFile))) {
                try {
                    $this->getSftpConnection()->delete($remoteFile);
                    unset($manifest[$remoteFile]);
                    $this->msg("Deleted: {$remoteFile}", 'red');
                } catch (Exception $e) {
                    $this->msg("Error deleting {$remoteFile}: {$e->getMessage()}", 'red');
                }
            }
        }

        $this->saveManifest($manifest);
    }

    // NEW: Helper to list remote directory contents (basic version)

    protected function listRemoteDirectory(string $remoteDirPath): array
    {
        $sftp = $this->getSftpConnection();
        $this->msg("Listing remote directory: {$remoteDirPath}", 'bl');
        // Ensure the path format is correct for phpseclib (usually just the path)
        $normalizedPath = rtrim($remoteDirPath, '/'); // Remove trailing slash if present
        if (empty($normalizedPath)) $normalizedPath = '.'; // Use current dir if path is empty

        $files = $sftp->nlist($normalizedPath);

        if ($files === false) {
            // Handle directory not found or other errors
            $errors = $sftp->getSFTPErrors();
            $errorString = is_array($errors) ? implode('; ', $errors) : 'Unknown SFTP error';
            $this->msg("Failed to list remote directory '{$normalizedPath}'. SFTP Errors: " . $errorString, 'rd');
            return []; // Return empty array on error
        }

        // Filter out '.' and '..' which might be included by nlist
        return array_filter($files, function ($file) {
            return $file !== '.' && $file !== '..';
        });
    }

}
