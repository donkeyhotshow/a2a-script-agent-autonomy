# 08 - Валидация Модуля (`module:validate`)

Это руководство описывает команду `php artisan module:validate`.

**Внимание: Валидатор в Разработке!**

Валидатор `module:validate` **не является надежным инструментом** на данный момент (`{текущая дата/версия}`). Он может
пропускать ошибки или сообщать о несуществующих.

**Не полагайтесь на него!** Основной метод проверки — **сравнение с рабочими примерами** (`implement-modules/...`) и *
*визуальное тестирование** модуля в приложении.

Используйте валидатор как **вспомогательный**, который *иногда* может найти базовые проблемы.

## 1. Назначение (Планируемое)

* Проверка синтаксиса JSON.
* Проверка существования `.vue` файлов компонентов.
* Проверка соответствия `props` и ключей правилам компонентов (из `install-modules/aiCore/validation/levels/...`).
* Проверка обязательных ключей (например, `"model"`).
* (В планах) Проверка путей `include`.

## 2. Выполнение Команды

```bash
php artisan module:validate {имя-модуля}
```

* `{имя-модуля}`: Имя **установленного** модуля в `install-modules/aiInstaller/`.

## 3. Процесс Валидации

Валидатор (`php artisan module:validate {module?}`) выполняет следующие проверки для указанного модуля (или всех
модулей) в директории `install-modules/aiInstaller/`:

1. **JSON Syntax:** Проверяет валидность синтаксиса всех `.json` файлов в модуле.
2. **Known Keys:** Сверяет все ключи JSON с разрешенными в `install-modules/aiCore/master-known-keys.json`.
3. **Value Patterns:** Проверяет формат значений по регулярным выражениям из
   `install-modules/aiCore/master-value-patterns.json`.
4. **Component Validation:** Для каждого компонента (`"type"` или `"component"`) в UI JSON (например, `index.json`,
   `page.json`):
    * **Existence Check:** Проверяет наличие соответствующего `.vue` файла в путях поиска (см. `ModuleValidate.php` и
      раздел ниже).
        * **Базовые/HTML компоненты:** Валидатор **должен быть настроен** так, чтобы либо игнорировать базовые
          элементы (например, `div`, `H3`, `label`), для которых может не быть отдельных `.vue` файлов или правил, либо
          требовать для них минимального описания (например, в `validation/levels/00/`). *Текущее поведение требует
          проверки в коде `ModuleValidate.php`.*
    * **`model` Key Check:** Если компонент имеет уровень >= L01 (согласно его файлу правил в `validation/levels/`),
      проверяет наличие обязательного ключа `"model"`.
    * **Component Rules:** Если найден файл правил для компонента (
      `install-modules/aiCore/validation/levels/{level}/components/{ComponentName}.json(переделать на новый путь)`),
      проверяет соответствие `props`, `slots` и т.д. этим правилам.
        * **Новый путь к правилам:** Актуальный путь к правилам компонентов, по-видимому,
          `install-modules/aiCore/validation/components/{CATEGORY}/{ComponentName}.json`, где `{CATEGORY}` — это первая
          буква `ComponentName` (например, `P/Page.json` для компонента `Page`). Валидатор автоматически приводит
          `ComponentName` к нижнему регистру при поиске файла правил (например, ищет `page.json`).
        * **Специальный тип `Instructions`:** Для файлов с `"type": "Instructions"` (часто используется в директории
          `actions/`) валидатор, по-видимому, имеет встроенную логику или очень свободную схему. Ключевым является
          наличие массива `"instructions": []` в корне JSON. Дополнительные ключи на верхнем уровне (например,
          `actionId`, `description`, `handler`) могут не вызывать ошибок "Unknown key", даже если для типа
          `Instructions` не определена явная схема, допускающая их.
        * **Предложения по типам:** Валидатор может предлагать корректный тип, если встречает известный ему, но
          неправильно использованный тип (например, может предложить `instructions` для типа `action`).

## 4. Интерпретация Вывода (Примеры)

* **Успех (Пример):**
  ```bash
  Validating module: config
  # ... (Проверка файлов)
  Validation finished for module config. No errors found.
  ```
  *(Примечание: Отсутствие ошибок **не гарантирует** корректность!)*

* **Ошибка: Не найден `.vue` (Пример):**
  ```bash
  Validating module: some-module
  Checking file: .../page.json...
    -> Validating component: NonExistentComponent
    -> [ERROR] Component file not found for type: NonExistentComponent ...
  Validation finished ... Found X error(s).
  ```

* **Ошибка: Невалидный JSON (Пример):**
  ```bash
  Validating module: broken-module
  Checking file: .../page.json...
    -> [ERROR] Invalid JSON syntax: ...
  Validation finished ... Found Y error(s).
  ```

* **Ошибка: Отсутствует ключ `model` (Пример - *Ожидается от Валидатора*):**
  ```bash
  Validating module: config
  Checking file: .../index.json...
    -> Validating component: InputText (at path: content.children[1].children[1])
    -> [ERROR] Required top-level key 'model' is missing for component requiring VModel binding.
  Validation finished ... Found Z error(s).
  ```

## 5. Конфигурация Валидатора

* **`storage/aiCore/module-level-test/master-known-keys.json`:** Содержит список всех разрешенных ключей JSON. *
  *Критически важно поддерживать этот файл в актуальном состоянии**, добавляя новые ключи по мере их появления в
  модулях.
    * **Примечание:** Пути, указанные в этом разделе (`storage/aiCore/module-level-test/...`), могут относиться к
      предыдущей версии конфигурации валидатора. Более актуальные пути к конфигурации правил компонентов, вероятно,
      находятся в `install-modules/aiCore/validation/components/`.
* **`storage/aiCore/module-level-test/master-value-patterns.json`:** Содержит регулярные выражения для проверки формата
  значений определенных ключей. **Также требует регулярного обновления.**
* **`storage/aiCore/module-level-test/validation/levels/`:** Содержит правила для конкретных компонентов, распределенные
  по уровням сложности.
* **Пути Поиска `.vue` Файлов:** Задаются непосредственно в коде `app/Console/Commands/ModuleValidate.php`. Необходимо
  убедиться, что все директории с компонентами Vue (например, `resources/common/js/Elements/Primevue/Components/`,
  `.../Containers/`, `.../VModel/`, `.../Inertia/`) добавлены в логику поиска. Если компоненты определяются
  исключительно через JSON (без соответствующих `.vue` файлов), эта проверка может быть неактуальной или требовать
  другой интерпретации.

## 6. Заключение

**Пользуйтесь валидатором с большой осторожностью.** Приоритет — сверка с рабочими примерами и тестирование в
приложении. 
