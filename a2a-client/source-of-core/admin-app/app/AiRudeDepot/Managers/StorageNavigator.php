<?php

namespace App\AiRudeDepot\Managers;

use App\Helpers\PathHelper as Path;
use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Log;

class StorageNavigator
{
    public $itemLabel;
    protected Path $path;
    protected DataHub $storage;

    /**
     * Конструктор.
     *
     * @param string $pathString Строка пути.
     * @param string $itemType Тип элемента.
     * @param string|null $itemLabel Метка элемента (опционально).
     * @param string $diskName Имя диска для DataHub.
     * @throws InvalidArgumentException
     */
    public function __construct(string $pathString, string $itemType, ?string $itemLabel = null, string $diskName)
    {
        $this->storage = new DataHub($diskName);
        $this->path = new Path($pathString, true, $itemType);
        $this->itemLabel = $itemLabel;
    }

    /**
     * Возвращает список элементов внутри текущего пути.
     * Если элемент — каталог, через файловые операции;
     * если — JSON, разбирает содержимое файла.
     *
     * @return array
     */

    public function itemsList(bool $formatted = false): array
    {
        // Validate the storage path - This might need review if path isn't OS path
        // if (!StorageNavigatorHelper::validatePath($this->path->storagePath)) {
        //     throw new \Exception("Invalid storage path.");
        // }

        $items = [];
        $disk = $this->storage->getDisk(); // Get the correct disk instance
        $relativePath = $this->path->storagePath; // Use the relative path from the PathHelper object

        if ($this->path->isDir()) {
            // Use Storage facade methods on the correct disk
            if ($disk->exists($relativePath)) { // Check if directory exists on the disk
                // Add subdirectories
                foreach ($disk->directories($relativePath) as $d) {
                    $dirName = basename($d);
                    $fullSubPath = $relativePath ? $relativePath . '/' . $dirName : $dirName;
                    // Pass the correct disk name from the current storage instance
                    $items[] = new StorageNavigator("directory!$fullSubPath", 'directory', $dirName, $this->storage->getDiskName());
                }
                // Add files with extension .json
                foreach ($disk->files($relativePath) as $f) {
                    $fileNameWithExt = basename($f);
                    if (Str::endsWith($fileNameWithExt, '.json')) {
                        $fileName = basename($fileNameWithExt, '.json');
                        $fullSubPath = $relativePath ? $relativePath . '/' . $fileName : $fileName;
                        // Pass the correct disk name from the current storage instance
                        $items[] = new StorageNavigator("file!$fullSubPath", 'file', $fileNameWithExt, $this->storage->getDiskName());
                    }
                }
            } else {
                // Optionally log or handle non-existent directory on disk
                Log::warning("[StorageNavigator::itemsList] Directory not found on disk '{$this->storage->getDiskName()}'", ['path' => $relativePath]);
            }

        } elseif ($this->path->isFile() || $this->path->isVarArray() || $this->path->isVariable()) {
            // Handling JSON - Uses DataHub which uses the correct disk, likely okay
            $address = $this->storage->address($this->path->getFullPath());
            $currentLevel = $address->get();

            if (is_array($currentLevel)) {
                foreach ($currentLevel as $key => $value) {
                    $itType = is_array($value) ? 'arrayvariable' : 'variable';
                    $path = $this->path->storagePath;
                    $keyPart = ":" . implode('.', array_merge($this->path->keyPathList, [$key]));
                    // Pass the correct disk name from the current storage instance
                    $items[] = new StorageNavigator("file!$path$keyPart", $itType, $key, $this->storage->getDiskName());
                }
            }
        }
        if ($formatted) {
            return $this->formatItems($items);
        } else {
            return $items;
        }
    }

    /**
     * Форматирует элементы для ответа.
     *
     * @param array $items
     * @return array
     */
    private function formatItems(array $items): array
    {
        return array_map(function ($item) {
            return $this->formatItem($item);
        }, $items);
    }

    private function formatItem($item)
    {
        return [
            'label' => $item->label(),
            'path' => $item->path->getFullPath(),
            'itemType' => $item->path->itemType,
        ];
    }

    /**
     * Возвращает метку текущего элемента.
     */
    public function label(): string
    {
        return $this->itemLabel ?? $this->path->label;
    }

    /**
     * Возвращает список всех родительских элементов для хлебных крошек.
     *
     * @return array
     */
    public function parentsList(bool $formatted = false, bool $includeHome = true): array|StorageNavigator
    {
        $items = [];
        $currentItem = $this->parent(false, $includeHome);

        while ($currentItem !== null) {
            array_unshift($items, $currentItem);
            $currentItem = $currentItem->parent();
        }

        if ($formatted) {
            return $this->formatItems($items);
        } else {
            return $items;
        }
    }

    /**
     * Возвращает родительский элемент.
     *
     * @return Path|null
     */

    public function parent(bool $formatted = false, bool $includeHome = true): StorageNavigator|array|null
    {

        $parts = explode('/', $this->path->storagePath);
        $ppp = array_pop($parts);

        $ret = null;
        if ($this->path->isDir() || $this->path->isFile()) {
            // Корневая директория, родителя нет
            if (empty($this->path->storagePath)) return null;
            // Если путь содержит вложенность, возвращаем родительскую директорию
            if (count($parts) > 0) $ret = new StorageNavigator("directory!" . implode('/', $parts), 'directory', $ppp, $this->storage->diskName);
            // Если это первый уровень вложенности, возвращаем корневую директорию
            else $ret = $includeHome ? new StorageNavigator("directory!", 'directory', 'Home', $this->storage->diskName) : null;

        } elseif ($this->path->isVarArray() || $this->path->isVariable()) {
            if (empty($this->path->keyPathList)) {
                $ret = new StorageNavigator("file!" . implode('/', $parts), 'file', $ppp, $this->storage->diskName);
            } else {
                $newKeyPath = $this->path->keyPathList;
                $ppp = array_pop($newKeyPath);
                $keyPart = "";
                if (empty($newKeyPath)) {
                    $parentType = 'file';
                } else {
                    $parentType = 'arrayvariable';
                    $keyPart = ":" . implode('.', $newKeyPath);
                }
                $ret = new StorageNavigator("file!" . $this->path->storagePath . $keyPart, $parentType, $ppp, $this->storage->diskName);
            }
        }
        if ($formatted) {
            return $this->formatItem($ret);
        } else {
            return $ret;
        }
    }

    public function getFormattedCurrentItem()
    {
        return $this->formatItem($this);
    }
}
