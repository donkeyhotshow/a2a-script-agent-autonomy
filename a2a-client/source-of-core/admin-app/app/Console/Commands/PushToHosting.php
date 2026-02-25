<?php

namespace App\Console\Commands;

use App\Facades\StorageManager;
use App\Helpers\JsonHelper;
use App\Hooks\FileFacade;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;


class PushToHosting extends Command
{
    use Config\FtpConfig;

    public Filesystem $filesReadWrite;
    protected $signature = 'files:set {path? : File or directory to upload} {code? : Code to store and upload directly} {--clean : Remove files from hosting that no longer exist locally}';
    protected $description = 'Push files via SFTP with options to clean removed files, upload specific paths, or store and upload code directly.';
    protected $disable_write = true;

    public function handle()
    {
        $this->filesReadWrite = new Filesystem;

        $this->filesystem = $this->createFilesystem();

        $path = $this->argument('path');
        $code = $this->argument('code');
        $clean = $this->option('clean');

        if ($clean) {
            $this->msg('Cleaning removed files...', 'rd');
            $this->cleanRemovedFiles();
            return;
        }

        if ($code) {
            $this->msg("Storing code to {$path} and uploading...", 'cy');
            $this->storeAndUploadCode($path, $code);
            return;
        }

        if ($path) {
            $this->msg("Uploading specific path: {$path}", 'cy');
            $this->uploadPath($path);
            return;
        }

        $this->msg('Loading manifest...', 'bl');

        $manifest = json_decode(FileFacade::get(storage_path(implode("/", ["commands", "ftp"]) . ".json")), true);

        $updatedFiles = 0;

        foreach ($this->dirs as $idx => $dir) {
            $color = $this->dirColor($idx);
            $this->msg("Scanning: {$dir}", $color);
            $localPath = base_path($dir);

            if (!file_exists($localPath)) {
                $this->msg("Missing: {$dir}", 'rd');
                continue;
            }

            $files = $this->scanDirectory($localPath);

            foreach ($files as $file) {
                $relativePath = str_replace(base_path() . 'PushToHosting.php/', '', $file);
                $relativePath = str_replace("\\", '/', str_replace("C:\\", "", $relativePath));

                $hash = md5_file($file);

                if (isset($manifest[$relativePath]) && $manifest[$relativePath] === $hash) {
                    $this->msg("Unchanged: {$relativePath}", 'gy');
                    continue;
                }

                $this->msg("Uploading: {$relativePath}", 'gr');
                try {
                    $this->uploadFile($file, $relativePath);
                    $this->setPermissions($relativePath);
                    $this->msg("Uploaded: {$relativePath}", 'cy');
                    $updatedFiles++;
                    $manifest[$relativePath] = $hash;
                } catch (Exception $e) {
                    $this->msg("Error: {$relativePath}, {$e->getMessage()}", 'rd');
                }
            }


        }

        $manifestPath = storage_path(implode("/", ["commands", "ftp"]) . ".json");
        FileFacade::ensureDirectoryExists(dirname($manifestPath));
        FileFacade::put($manifestPath, JsonHelper::encode($manifest));
//        $this->saveManifest($manifest);

        $this->msg(
            $updatedFiles > 0 ? "Done. Updated: {$updatedFiles}" : 'No updates.',
            'yl'
        );
    }
}
