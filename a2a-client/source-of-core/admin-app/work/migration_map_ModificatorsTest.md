# Migration Map for tests/Feature/AiRudeDepot/DataProcessor/ModificatorsTest.php

Эта карта сопоставляет Feature-тесты из `ModificatorsTest.php` с соответствующими классами и методами в приложении, связанными с обработкой данных и "модификаторами".

## Обзор
Тесты в этом файле проверяют функциональность класса `App\AiRudeDepot\Processors\DataProcessor` и его взаимодействие с системой хранения данных (`DataHub`), а также логику применения "модификаторов" для преобразования данных. Тесты включают настройку сложной тестовой среды с использованием фейковых дисков Storage, созданием тестовых модулей и пермалинков.

---

Test Method: `setUp` и `tearDown`
- Функциональность: Настройка и очистка тестовой среды. Включает конфигурацию и использование фейковых дисков Laravel Storage (`aiTest`, `aiCoreTest`), создание необходимых директорий, инстанцирование `DataHub` для разных дисков, настройку конфигурации приложения (`ai.test_core_env_path`), создание тестовых файлов модификаторов и пермалинков, а также сброс статического экземпляра `DataHub`.
- Потенциальная зона кода:
  - `Illuminate\Support\Facades\Storage::disk`, `::fake`, `::put`, `::exists`, `::delete`, `::path`
  - `Illuminate\Support\Facades\File::makeDirectory` (или `mkdir`)
  - `Illuminate\Support\Facades\Log::debug`, `::error`
  - `Illuminate\Support\Facades\Config::set` (или `config() helper`)
  - `App\AiRudeDepot\Storage\DataHub::__construct` (использование разных дисков)
  - `App\AiRudeDepot\Storage\DataHub::$staticStorageInstance` (сброс через рефлексию)
  - `App\AiRudeDepot\Managers\StoragePathParser` (возможно, неявно используется DataHub)
  - Создание тестовых данных модификаторов и пермалинков (JSON структура).

---

Test Method: `test_modificator_accesses_permalinks`
- Функциональность: Проверка, что система (`DataHub`) может корректно читать данные пермалинков, сохраненные на сконфигурированном тестовом диске (`aiTest`), и что эти данные могут быть доступны или установлены в буфер `DataHub`.
- Потенциальная зона кода:
  - `Illuminate\Support\Facades\Config::set`
  - `Illuminate\Support\Facades\Storage::disk('aiTest')->put`, `::exists`, `::path`
  - `App\AiRudeDepot\Storage\DataHub::__construct`
  - `App\AiRudeDepot\Storage\DataHub::address`
  - `App\AiRudeDepot\Storage\DataHub::get`
  - `App\AiRudeDepot\Storage\DataHub::set`
  - Файловые операции PHP (`is_dir`, `mkdir`, `file_get_contents`, `json_decode`, `json_encode`, `file_exists`)
  - Структура данных пермалинка.

---

