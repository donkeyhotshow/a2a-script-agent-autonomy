## Детализированный чеклист рефакторинга на хелперы для app/Console/Commands/

### ProcessPermalinksCommand.php

- **FileHelper / Storage:**
  - [ ] Строка 47: `} elseif (file_exists($inputPath) && Str::endsWith($inputPath, '.json')) {`  
    → заменить `file_exists($inputPath)` на `FileHelper::exists($inputPath)`.
  - [ ] Строка 68: `File::get($filePath)` (используется `App\Hooks\FileFacade as File`)  
    → заменить на `FileHelper::get($filePath)` (если `FileHelper` корректно использует `FileFacade` или предоставляет аналогичную функциональность).
  - [ ] Строка 211: `if (!Storage::disk($diskName)->exists($outputDir)) {`  
    → Оставить `Storage::disk(...)->exists(...)` для специфичной работы с дисками Laravel, если в `FileHelper` нет прямой замены.
  - [ ] Строка 212: `Storage::disk($diskName)->makeDirectory($outputDir);`  
    → Оставить `Storage::disk(...)->makeDirectory(...)`, если в `FileHelper` нет прямой замены.
  - [ ] Строка 222: `if (!Storage::disk($diskName)->put($relativePath, $jsonData)) {`  
    → Оставить `Storage::disk(...)->put(...)`, если в `FileHelper` нет прямой замены.

- **JsonHelper:**
  - [ ] Строка 69: `$config = json_decode($content, true, 512, JSON_THROW_ON_ERROR);`  
    → заменить на `JsonHelper::decode($content)`.
  - [ ] Строка 151: `json_encode($route)`  
    → заменить на `JsonHelper::encode($route)`.
  - [ ] Строка 216: `$jsonData = json_encode([...], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);`  
    → заменить на `JsonHelper::encode([...])`.

- **PathHelper:**
  - [ ] Строка 64: `$moduleName = pathinfo($filePath, PATHINFO_FILENAME);`  
    → заменить на `PathHelper::getFilename($filePath, false)` (если `PathHelper` будет иметь метод `getFilename` для получения имени файла без расширения).
  - [ ] Строка 207: `$outputDir = dirname($relativePath);`  
    → заменить на `PathHelper::getDirectory($relativePath)` (если `PathHelper` будет иметь метод `getDirectory`).

---

### TestAiConfig.php

- **FileHelper:**
  - [ ] Строка 73: `if (!file_exists($modDir)) {`  
    → заменить на `!FileHelper::exists($modDir)`
  - [ ] Строка 75: `mkdir($modDir, 0755, true);`  
    → заменить на `FileHelper::makeDirectory($modDir, 0755, true)`
  - [ ] Строка 79: `if (!file_exists($pageModFile)) {`  
    → заменить на `!FileHelper::exists($pageModFile)`
  - [ ] Строка 90: `file_put_contents($pageModFile, $pageModContent);`  
    → заменить на `FileHelper::put($pageModFile, $pageModContent)`
  - [ ] Строка 94: `(file_exists($pageModFile) ? 'Yes' : 'No')`  
    → заменить `file_exists($pageModFile)` на `FileHelper::exists($pageModFile)`
  - [ ] Строка 95: `if (file_exists($pageModFile)) {`  
    → заменить на `if (FileHelper::exists($pageModFile)) {`
  - [ ] Строка 96: `$this->line('Content: ' . file_get_contents($pageModFile));`  
    → заменить `file_get_contents($pageModFile)` на `FileHelper::get($pageModFile)`

- **JsonHelper:**
  - [ ] Строка 81: `$pageModContent = json_encode([...], JSON_PRETTY_PRINT);`  
    → заменить на `JsonHelper::encode([...])`.
  - [ ] Строка 101: `(is_string($result) ? $result : json_encode($result))`  
    → заменить `json_encode($result)` на `JsonHelper::encode($result)`.

---

### PushToHosting.php

- **FileHelper:**
  - [ ] Строка 51: `FileFacade::get(storage_path(implode("/", ["commands", "ftp"]) . ".json"))`  
    → заменить на `FileHelper::get(storage_path(implode("/", ["commands", "ftp"]) . ".json"))`.
  - [ ] Строка 60: `if (!file_exists($localPath)) {`  
    → заменить на `!FileHelper::exists($localPath)`
  - [ ] Строка 93: `FileFacade::ensureDirectoryExists(dirname($manifestPath));`  
    → заменить на `FileHelper::ensureDirectoryExists(PathHelper::getDirectory($manifestPath))` (требуется `PathHelper::getDirectory`).
  - [ ] Строка 94: `FileFacade::put($manifestPath, JsonHelper::encode($manifest));`  
    → заменить на `FileHelper::put($manifestPath, JsonHelper::encode($manifest))`

- **JsonHelper:**
  - [ ] Строка 51: `$manifest = json_decode(FileFacade::get(...), true);`  
    → заменить `json_decode(...)` на `JsonHelper::decode(FileHelper::get(...))`.
  - [ ] Строка 94: `JsonHelper::encode($manifest)` (уже используется)  
    → оставить.

- **PathHelper:**
  - [ ] Строка 93: `dirname($manifestPath)`  
    → заменить на `PathHelper::getDirectory($manifestPath)`.

---

### ValidateModuleJsonCommand.php

- **FileHelper / FacadesFile:**
  - [ ] Строка 732: `if (!FacadesFile::exists($configPath)) {`
    → заменить на `!FileHelper::exists($configPath)`
  - [ ] Строка 739: `FacadesFile::get($configPath)`
    → заменить на `FileHelper::get($configPath)`
  - [ ] Строка 801: `if (file_exists($absolutePath)) {`
    → заменить на `FileHelper::exists($absolutePath)`
  - [ ] Строка 848: `if (FacadesFile::exists($levelDocsPath)) {`
    → заменить на `FileHelper::exists($levelDocsPath)`
  - [ ] Строка 850: `FacadesFile::get($levelDocsPath)`
    → заменить на `FileHelper::get($levelDocsPath)`

- **JsonHelper:**
  - [ ] Строка 463: `$data = json_decode($trimmedContent, true, 512, JSON_THROW_ON_ERROR);`
    → заменить на `JsonHelper::decode($trimmedContent)`
  - [ ] Строка 739: `$this->mainConfig = json_decode(FacadesFile::get($configPath), true, 512, JSON_THROW_ON_ERROR);`
    → заменить `json_decode(...)` на `JsonHelper::decode(...)`
  - [ ] Строка 850: `$validationLevelDocs = json_decode(FacadesFile::get($levelDocsPath), true, 512, JSON_THROW_ON_ERROR);`
    → заменить `json_decode(...)` на `JsonHelper::decode(...)`

- **ArrayHelper:**
  - [ ] Строка 325: `implode(', ', array_keys($modulesToProcess))`
    → заменить `array_keys(...)` на `ArrayHelper::getKeys(...)`.
  - [ ] Строка 538: `array_keys($data) !== range(0, count($data) -1)`
    → заменить на `!ArrayHelper::isList($data)`.
  - [ ] Строка 582: `array_keys($definedStructure)`
    → заменить на `ArrayHelper::getKeys($definedStructure)`.
  - [ ] Строка 583: `array_merge(['type'], $definedTopLevelKeys)`
    → заменить на `ArrayHelper::mergeArrays(['type'], $definedTopLevelKeys)`.
  - [ ] Строка 648: `array_keys($propsStructureFromRules)`
    → заменить на `ArrayHelper::getKeys($propsStructureFromRules)`.

---

### Codebase.php

- **FileHelper / FacadesFile:**
  - [ ] Строка 44: `if (!FileFacade::exists($currentCodebasePath)) {`  
    → заменить на `!FileHelper::exists($currentCodebasePath)`
  - [ ] Строка 48: `FileFacade::get($currentCodebasePath)`  
    → заменить на `FileHelper::get($currentCodebasePath)`
  - [ ] Строка 73: `if (FileFacade::exists($outputPath)) { FileFacade::delete($outputPath); }`  
    → заменить на `if (FileHelper::exists($outputPath)) { FileHelper::delete($outputPath); }`
  - [ ] Строка 84: `if (FileFacade::exists($outputPath)) {`  
    → заменить на `if (FileHelper::exists($outputPath)) {`
  - [ ] Строка 85: `FileFacade::get($outputPath)`  
    → заменить на `FileHelper::get($outputPath)`
  - [ ] Строка 93: `FileFacade::put(...)`  
    → заменить на `FileHelper::put(...)`
  - [ ] Строка 229: `$jsonFiles = FileFacade::files($targetDir);`  
    → заменить на `FileHelper::files($targetDir)` (если `FileHelper` предоставляет такой метод, возвращающий коллекцию `SplFileInfo` или аналогичный массив).
  - [ ] Строка 233: `FileFacade::get($file->getPathname())`  
    → заменить на `FileHelper::get($file->getPathname())`
  - [ ] Строка 270: `FileFacade::put(...)`  
    → заменить на `FileHelper::put(...)`

- **JsonHelper:**
  - [ ] Строка 48: `$filesList = json_decode(FileFacade::get($currentCodebasePath), true);`  
    → заменить `json_decode(...)` на `JsonHelper::decode(FileHelper::get($currentCodebasePath))`
  - [ ] Строка 85: `$existingContent = json_decode(FileFacade::get($outputPath), true);`  
    → заменить `json_decode(...)` на `JsonHelper::decode(FileHelper::get($outputPath))`
  - [ ] Строка 95: `json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)`  
    → заменить на `JsonHelper::encode($result)`
  - [ ] Строка 233: `$content = json_decode(FileFacade::get($file->getPathname()), true);`  
    → заменить `json_decode(...)` на `JsonHelper::decode(FileHelper::get($file->getPathname()))`
  - [ ] Строка 270: `json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)`  
    → заменить на `JsonHelper::encode($content)`
  - [ ] Строка 347: `$originalJsonLength = strlen(json_encode($data));`  
    → заменить `json_encode($data)` на `JsonHelper::encode($data)`
  - [ ] Строка 389: `$optimizedJsonLength = strlen(json_encode($result));`  
    → заменить `json_encode($result)` на `JsonHelper::encode($result)`

- **ArrayHelper:**
  - [ ] Строка 117: `array_filter($filesList, function ($file) use ($prefix) { return strpos($file, $prefix . '/') === 0 || strpos($file, $prefix . '\\\\') === 0; });`  
    → Оставить `array_filter` из-за специфической логики колбэка, если в `ArrayHelper` нет подходящей замены.
  - [ ] Строка 207-208: `array_keys($value) === range(0, count($value) - 1)`  
    → заменить на `ArrayHelper::isList($value)`
  - [ ] Строка 210: `array_values(array_unique(array_merge($result[$key], $value)))`  
    → заменить на `ArrayHelper::mergeUniqueAsList($result[$key], $value)` (требуется создать/доработать метод в `ArrayHelper`).
  - [ ] Строка 324: `return array_map([$this, 'mergeSingleItemsToEmptyKey'], $data);`  
    → Заменить на `ArrayHelper::transform($data, [$this, 'mergeSingleItemsToEmptyKey'])`
  - [ ] Строка 385: `$mergedEmptyKeyArray = array_merge($emptyKeyArray, $itemsToMerge);`  
    → Заменить на `ArrayHelper::mergeArrays($emptyKeyArray, $itemsToMerge)` (если это простое слияние, а не рекурсивное с перезаписью).
  - [ ] Строка 441: `return array_map([$this, 'optimizeKeyChainsToPath'], $data);`  
    → Заменить на `ArrayHelper::transform($data, [$this, 'optimizeKeyChainsToPath'])`
  - [ ] Строка 481: `return array_map([$this, 'deepMergeKeyPaths'], $data);`  
    → Заменить на `ArrayHelper::transform($data, [$this, 'deepMergeKeyPaths'])`

---

### MergeModuleVersions.php

- **FileHelper / FacadesFile:**
  - [ ] Строка 135: `if (File::isDirectory($targetDir)) {` (и другие `File::isDirectory`)  
    → заменить на `FileHelper::isDirectory($targetDir)`
  - [ ] Строка 139: `$deleteSuccess = File::deleteDirectory($targetDir);`  
    → заменить на `$deleteSuccess = FileHelper::deleteDirectory($targetDir);`
  - [ ] Строка 157: `File::ensureDirectoryExists($targetDir);`  
    → заменить на `FileHelper::ensureDirectoryExists($targetDir);`
  - [ ] Строка 173: `if (File::copyDirectory($sourceVersionDir, $targetDir)) {`  
    → заменить на `if (FileHelper::copyDirectory($sourceVersionDir, $targetDir)) {`
  - [ ] Строка 232: `if (!File::exists($configPath)) {`  
    → заменить на `!FileHelper::exists($configPath)`
  - [ ] Строка 238: `$configContent = File::get($configPath);`  
    → заменить на `FileHelper::get($configPath)`

- **JsonHelper:**
  - [ ] Строка 239: `$configData = json_decode($configContent, true, 512, JSON_THROW_ON_ERROR);`  
    → заменить на `JsonHelper::decode($configContent)`

- **ArrayHelper:**
  - [ ] Строка 366: `$uniqueHashes = array_unique($hashes);`  
    → заменить на `ArrayHelper::uniqueValues($hashes)`.
  - [ ] Строка 389: `$definedModuleVersions = array_values($definedModuleVersions);`  
    → заменить на `ArrayHelper::getValues($definedModuleVersions)`.
  - [ ] Строка 393: `array_unique(array_column($info['versions_data'], 'version'))`  
    → Заменить на `ArrayHelper::uniqueValues(ArrayHelper::arrayColumn($info['versions_data'], 'version'))` (требуется `ArrayHelper::arrayColumn`).
  - [ ] Строка 395: `array_values(array_intersect($definedModuleVersions, $versionsPresent))`  
    → Заменить на `ArrayHelper::getValues(ArrayHelper::intersect($definedModuleVersions, $versionsPresent))` (требуется `ArrayHelper::intersect`).
  - [ ] Строка 440: `$definedVersions = array_values($definedVersions);`  
    → заменить на `ArrayHelper::getValues($definedVersions)`.
  - [ ] Строка 448: `$allModuleFiles = array_keys($allModuleFiles);`  
    → заменить на `ArrayHelper::getKeys($allModuleFiles)`.

---

### ModuleCleanupDuplicates.php

- **FileHelper / FacadesFile:**
  - [ ] Строка 114: `if (!File::exists($configPath)) {`  
    → заменить на `!FileHelper::exists($configPath)`
  - [ ] Строка 120: `$configContent = File::get($configPath);`  
    → заменить на `FileHelper::get($configPath)`
  - [ ] Строка 169: `if (!File::isDirectory($sourceVersionDir)) {`  
    → заменить на `!FileHelper::isDirectory($sourceVersionDir)`
  - [ ] Строка 174: `$files = File::allFiles($sourceVersionDir);`  
    → заменить на `FileHelper::allFiles($sourceVersionDir)`
  - [ ] Строка 187: `$content = File::get($absolutePath);`  
    → заменить на `FileHelper::get($absolutePath)`
  - [ ] Строка 316: `File::ensureDirectoryExists(dirname($this->outputScriptPath));`  
    → заменить на `FileHelper::ensureDirectoryExists(PathHelper::getDirectory($this->outputScriptPath))` (требует `PathHelper::getDirectory`).
  - [ ] Строка 317: `File::put($this->outputScriptPath, $scriptContent);`  
    → заменить на `FileHelper::put($this->outputScriptPath, $scriptContent)`

- **JsonHelper:**
  - [ ] Строка 121: `$configData = json_decode($configContent, true, 512, JSON_THROW_ON_ERROR);`  
    → заменить на `JsonHelper::decode($configContent)`

- **ArrayHelper:**
  - [ ] Строка 296 (метод `getFilesToRemoveList`): `return array_keys($filesToRemove);`  
    → заменить на `ArrayHelper::getKeys($filesToRemove)`.
  - [ ] Строка ~235 (метод `findFilesToRemove`): `array_flip($versions)`  
    → заменить на `ArrayHelper::flip($versions)` (если будет создан).
  - [ ] Строка ~236 (метод `findFilesToRemove`): `end($versions)`  
    → заменить на `ArrayHelper::getLastElement($versions)` (если будет создан).

- **PathHelper:**
  - [ ] Строка 316: `dirname($this->outputScriptPath)`  
    → заменить на `PathHelper::getDirectory($this->outputScriptPath)`.

---

### ExportCustomLinks.php

- **JsonHelper:**
  - [ ] Строка 55: `$this->line(json_encode([], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));`  
    → заменить `json_encode(...)` на `JsonHelper::encode([])`
  - [ ] Строка 59: `$this->line(json_encode($links, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));`  
    → заменить `json_encode(...)` на `JsonHelper::encode($links)`

--- 