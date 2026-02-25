# Руководство: Интеграция Индексатора в Сценарии Сбора Данных (SYSTEM-INTEGRATE-INDEXER-SCENARIOS-001)

> **Кратко:** Этот документ описывает процесс модификации ядра системы сценариев и самих сценариев для интеграции
`[main-index.ps1](mdc:main-index.ps1)` с целью автоматического сбора контекстной информации о файлах и коде, связанных с
> выполняемой задачей. Руководство основано на
> задаче [SYSTEM-INTEGRATE-INDEXER-SCENARIOS-001.json](mdc:script/engine/task_definitions/SYSTEM-INTEGRATE-INDEXER-SCENARIOS-001.json).

## 1. Цель Интеграции

Основная цель — обеспечить автоматизированный сбор релевантных данных о файлах и элементах кода, связанных с активной
задачей, используя существующий скрипт `[main-index.ps1](mdc:main-index.ps1)`. Эти данные должны быть интегрированы в
контекст задачи (например, в поле `collectedIndexData` файла задачи `*.json`) для дальнейшего использования другими
сценариями, ИИ-агентами или разработчиками.

Это позволит:

- Уменьшить ручной поиск информации.
- Повысить полноту и релевантность собираемых данных.
- Ускорить выполнение задач, требующих анализа кодовой базы.
- Предоставить ИИ-агентам более богатый контекст для принятия решений.

## 2. Обзор Задачи `SYSTEM-INTEGRATE-INDEXER-SCENARIOS-001`

### 2.1. Описание

Модифицировать или создать сценарии сбора данных (например, `SCN-FullyCollectTaskData`) для эффективного использования
`main-index.ps1` для получения релевантной информации о файлах и коде в контексте задачи.

### 2.2. Ключевые Шаги (из задачи):

1. **Анализ существующих сценариев**: Изучить `SCN-FullyCollectTaskData` и аналогичные сценарии, где требуется сбор
   данных.
2. **Определение точек интеграции**: Найти в сценариях места, где логично вызывать индексатор.
3. **Модификация движка сценариев**: Обновить
   `[invoke-scenario-engine.php](mdc:script/engine/invoke-scenario-engine.php)` или создать новый тип шага/действия для:
    * Вызова `[main-index.ps1](mdc:main-index.ps1)` с необходимыми параметрами (например,
      `-Mode QueryIndex -Query <контекст_задачи> -AsJson`).
    * Обработки его JSON-вывода.
4. **Интеграция вызова**: Внедрить вызов `[main-index.ps1](mdc:main-index.ps1)` в выбранные сценарии.
5. **Сохранение данных**: Обеспечить корректное сохранение полученных индексированных данных в контексте задачи (
   например, в поле `collectedIndexData` файла задачи `*.json`).
6. **Тестирование**: Проверить выполнение сценариев с интегрированным индексатором.
7. **Документирование**: Обновить документацию сценариев и процесса сбора данных.

### 2.3. Критерии Приемки (из задачи):

- Сценарии сбора данных успешно вызывают `[main-index.ps1](mdc:main-index.ps1)`.
- Индексированные данные корректно парсятся из JSON-вывода `[main-index.ps1](mdc:main-index.ps1)`.
- Собранные индексированные данные сохраняются в соответствующем поле в файле задачи.
- Процесс сбора данных с использованием индексатора выполняется без ошибок.

## 3. План Реализации

### 3.1. Модификация `invoke-scenario-engine.php` и Определение Нового Типа Шага

Для вызова `[main-index.ps1](mdc:main-index.ps1)` и обработки его вывода потребуется новый тип шага в сценариях.

**А. Определение нового типа шага (в `.scenario.json`):**

Предлагается ввести новый тип шага, например, `runIndexQuery`.

```json
// Пример определения шага в .scenario.json
{
  "step_id": "collect_indexed_data",
  "type": "runIndexQuery", // Новый тип шага
  "description": "Сбор индексированных данных для задачи.",
  "parameters": {
    "queryContext": "task_keywords", // Источник для формирования запроса (например, 'task_id', 'task_title', 'task_keywords', 'task_description', 'linked_files_context')
    "queryType": "auto", // или 'files_by_keywords', 'code_elements_by_tags', 'file_content_summary' - для более точного запроса
    "outputVariable": "scenarioContext.collectedIndexData" // Куда сохранить результат
  },
  "on_success": "next_step_id",
  "on_failure": "error_step_id"
}
```

**Б. Реализация в `invoke-scenario-engine.php`:**

Потребуется добавить обработчик для типа `runIndexQuery` в `invoke-scenario-engine.php`. Этот обработчик должен:

1. **Сформировать запрос для `main-index.ps1`**:
    * Извлечь `queryContext` из параметров шага.
    * В зависимости от `queryContext`, собрать релевантную информацию из текущего контекста задачи (например, `taskId`,
      `title`, `keywords`, `description`, содержимое `linkedFiles`).
    * Сформировать строку запроса. Например, если `queryContext` это `task_keywords`, а `keywords` задачи это
      `["php", "refactor", "module_name"]`, запрос может быть `"php refactor module_name"`.
    * Определить дополнительные параметры для `main-index.ps1`, такие как `-Mode QueryIndex` и `-AsJson`.
2. **Выполнить `main-index.ps1`**:
    * Использовать `shell_exec` или `proc_open` для вызова
      `pwsh -File ./main-index.ps1 -Mode QueryIndex -Query "..." -AsJson`.
    * Убедиться, что путь к `main-index.ps1` корректен.
    * Перехватить стандартный вывод (stdout).
3. **Обработать JSON-вывод**:
    * Проверить, что вывод не пустой и является валидным JSON.
    * Использовать `json_decode` для преобразования строки JSON в PHP массив/объект.
4. **Сохранить результат**:
    * Сохранить полученные данные в переменную контекста сценария, указанную в `parameters.outputVariable` (например,
      `scenarioContext.collectedIndexData`). Это значение затем будет автоматически слито в основной контекст задачи
      движком сценариев.
5. **Обработка ошибок**:
    * Если `main-index.ps1` вернул ошибку (ненулевой код возврата) или JSON некорректен, залогировать ошибку и перейти к
      шагу `on_failure`.

### 3.2. Интеграция в Сценарии (например, `SCN-FullyCollectTaskData`)

Сценарий `SCN-FullyCollectTaskData.scenario.json` ([mdc:script/engine/scenarios/SCN-FullyCollectTaskData.scenario.json])
является основным кандидатом для интеграции.

**Пример модификации `SCN-FullyCollectTaskData.scenario.json`:**

```json
{
  "scenario_id": "SCN-FullyCollectTaskData",
  "title": "Полный Сбор Данных по Задаче (с Индексатором)",
  // ... другие метаданные ...
  "steps": [
    {
      "step_id": "init_collection",
      "type": "message", // или другой начальный шаг
      "message": "Начало сбора данных по задаче: {taskId}",
      "on_success": "query_indexer"
    },
    {
      "step_id": "query_indexer",
      "type": "runIndexQuery", // Наш новый тип шага
      "description": "Запрос к main-index.ps1 для сбора информации по файлам и коду.",
      "parameters": {
        "queryContext": "task_keywords_and_linked_files", // Может потребоваться кастомная логика для формирования запроса
        "outputVariable": "scenarioContext.rawIndexResults" // Сначала в сыром виде
      },
      "on_success": "process_index_results",
      "on_failure": "handle_indexer_error"
    },
    {
      "step_id": "process_index_results",
      "type": "script", // или другой тип шага для обработки/структурирования данных
      "script_path": "php:processIndexResults", // Путь к PHP-функции/методу для обработки
      "parameters": {
        "inputVariable": "scenarioContext.rawIndexResults",
        "outputVariable": "scenarioContext.collectedIndexData" // Финальная структурированная информация
      },
      "on_success": "finalize_collection",
      "on_failure": "handle_processing_error"
    },
    // ... последующие шаги для сохранения, логирования, завершения ...
    {
      "step_id": "finalize_collection",
      "type": "update_task_data", // Предполагаемый тип шага для записи в файл задачи
      "data_to_update": {
          "collectedIndexData": "{scenarioContext.collectedIndexData}"
      },
      "on_success": "collection_complete"
    },
    // ...
  ]
}
```

**Формирование запроса (`queryContext`):**

* `task_id`, `task_title`, `task_description`, `task_keywords`: Прямое использование полей задачи.
* `linked_files_context`: Если у задачи есть `linkedFiles`, их пути или содержимое (если это возможно и целесообразно)
  могут быть добавлены в запрос.
* `task_keywords_and_linked_files`: Комбинация ключевых слов и путей связанных файлов.
* Может потребоваться гибкая логика в `invoke-scenario-engine.php` для конструирования оптимального запроса на основе
  `queryContext` и данных задачи.

### 3.3. Структура `collectedIndexData`

Поле `collectedIndexData` в файле задачи должно иметь четкую структуру. `main-index.ps1` обычно возвращает массив
объектов, каждый из которых описывает найденный элемент (файл, функцию, класс и т.д.).

Пример структуры `collectedIndexData`:

```json
"collectedIndexData": {
  "source": "main-index.ps1",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
  "query_used": "контекстный запрос к main-index.ps1",
  "results": [
    {
      "id": "unique_identifier_from_index",
      "type": "file | function | class | method ...",
      "relativePath": "path/to/file.php",
      "name": "FunctionName | ClassName",
      "summary": "AI-generated or extracted summary...",
      "tags": ["tag1", "tag2"],
      "relevance_score": 0.85 // Если индексатор предоставляет
      // ... другие поля из вывода main-index.ps1
    }
    // ... больше результатов
  ]
}
```

Шаг `process_index_results` (если он нужен) может отвечать за преобразование "сырого" вывода `main-index.ps1` в эту
стандартизированную структуру.

### 3.4. Тестирование

- Создать тестовые задачи с различными `keywords`, `linkedFiles` и `description`.
- Запустить обновленные сценарии сбора данных для этих задач.
- Проверить, что:
    - `main-index.ps1` вызывается с корректными запросами.
    - JSON-вывод успешно парсится.
    - Поле `collectedIndexData` в файле задачи заполняется ожидаемыми данными.
    - Ошибки (например, невалидный JSON, сбой `main-index.ps1`) корректно обрабатываются и логируются.

### 3.5. Документирование

- Обновить документацию для `invoke-scenario-engine.php`, описав новый тип шага `runIndexQuery` и его параметры.
- Обновить документацию для всех сценариев, которые теперь используют этот шаг (например, `SCN-FullyCollectTaskData`).
- Описать структуру поля `collectedIndexData` и его назначение.
- Обновить общее руководство по процессу сбора данных.

## 4. Потенциальные Трудности и Решения

- **Сложность формирования оптимального запроса для `main-index.ps1`**:
    - *Решение*: Начать с простых запросов (например, по `taskId` или `keywords`). Постепенно усложнять логику
      формирования запроса, возможно, добавив больше опций в `queryType` параметра шага.
- **Большой объем вывода от `main-index.ps1`**:
    - *Решение*: `main-index.ps1` может нуждаться в доработке для ограничения количества результатов или предоставления
      более сжатой информации. Либо, шаг `process_index_results` может фильтровать/агрегировать данные.
- **Производительность**: Частые вызовы `main-index.ps1` могут замедлить выполнение сценариев.
    - *Решение*: Оптимизировать `main-index.ps1`. Рассмотреть кэширование результатов индексации, если применимо.
- **Зависимость от формата вывода `main-index.ps1`**: Если формат вывода `main-index.ps1` изменится, потребуется
  обновить логику парсинга в `invoke-scenario-engine.php`.
    - *Решение*: Версионировать API вывода `main-index.ps1` или использовать адаптеры.

## 5. Заключение

Интеграция `[main-index.ps1](mdc:main-index.ps1)` в сценарии сбора данных является важным шагом для повышения
эффективности и автоматизации системы. Реализация этой задачи потребует аккуратных изменений в
`[invoke-scenario-engine.php](mdc:script/engine/invoke-scenario-engine.php)` и соответствующих файлах сценариев, а также
тщательного тестирования. 
