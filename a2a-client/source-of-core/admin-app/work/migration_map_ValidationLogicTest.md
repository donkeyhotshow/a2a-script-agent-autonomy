# Migration Map for tests/Unit/ValidationLogicTest.php

Эта карта сопоставляет Unit-тесты из `ValidationLogicTest.php` с соответствующими методами, событиями и классами в `ValidateModuleJsonCommand` и связанных компонентах.

## setUp - Mocking and Initialization
- Создаёт Mock для зависимостей конструктора:
  - `ComponentRuleLoader::getRulePath`
  - `UnknownComponentTypeListener`
  - `ErrorMessageGeneratorListener`
  - `SuggestionGeneratorListener`
  - `ValidationLoggerListener`
  - `ErrorCategorizer`
  - `DocumentationGeneratorListener`
  - `PropertyValidationListener`
  - `ComponentStructureValidator`
  - `ModelValidationListener`
  - `DataIntegrityValidationListener`
  - `EnhancedSuggestionListener`
  - `ComponentLevelFilterListener`
- Инстанцирует `TestableValidateModuleJsonCommand::__construct(...)` с mock-объектами.
- Использует Reflection для установки в свойство `logHelper` мок `ModuleValidationLogHelper`.
- Мокирует метод `dispatchEvent` частичного мока: соответствует `ValidateModuleJsonCommand::dispatchEvent`.
- Мокирует вывод командной строки через `Command::setOutput` и `OutputStyle`.
- Вызывает `onRulesLoaded(new RulesLoadedEvent($testRulesSetup))`: соответствует `ValidateModuleJsonCommand::onRulesLoaded`, заполняются `globalComponentRules`.

## createNodeEvent Helper
- Метод `createNodeEvent(...)` создаёт `NodeEncounteredEvent`: соответствует конструктору `App\Console\Commands\NodeEncounteredEvent::__construct`.
- Используется для изоляции тестирования обработки узлов.

## customOnNodeEncounteredForComponentValidation
- Реализация логики `ValidateModuleJsonCommand::onNodeEncounteredForComponentValidation` в тесте.
- Вызывается без полного цикла событий для изолированного тестирования.

---

Test Method: `test_detects_unknown_component_type_isolated`
- Функциональность: При неизвестном типе компонента вызывает `ErrorDetectedEvent` с `errorSlug = 'unknown_component_type'`.
- Потенциальная зона кода:
  - `ValidateModuleJsonCommand::onNodeEncounteredForComponentValidation` - блок обработки отсутствующего правила компонента:
    ```php
    $rule = $this->componentRuleLoader->getRule($componentType);
    if (!$rule) {
        event(new ErrorDetectedEvent(..., 'unknown_component_type', ...));
    }
    ```
  - Конструктор `App\Console\Commands\ErrorDetectedEvent::__construct`.

---

Test Method: `test_detects_missing_required_key_isolated`
- Функциональность: При отсутствии обязательного ключа в узле компонента вызывает `ErrorDetectedEvent` с `errorSlug = 'missing_required_key'`.
- Потенциальная зона кода:
  - В `ValidateModuleJsonCommand::onNodeEncounteredForComponentValidation` валидация структуры:
    ```php
    foreach ($structure as $key => $rule) {
        if (($rule['required'] ?? false) && !array_key_exists($key, $nodeData)) {
            event(new ErrorDetectedEvent(..., 'missing_required_key', ...));
        }
    }
    ```

---

Test Method: `test_detects_missing_required_prop_isolated`
- Функциональность: При отсутствии обязательного свойства в `props` вызывает `ErrorDetectedEvent` с `errorSlug = 'missing_required_prop'`.
- Потенциальная зона кода:
  - В `ValidateModuleJsonCommand::onNodeEncounteredForComponentValidation` проверка свойств:
    ```php
    foreach ($propsRules as $propName => $propRule) {
        if (($propRule['required'] ?? false) && !array_key_exists($propName, $nodeData['props'])) {
            event(new ErrorDetectedEvent(..., 'missing_required_prop', ...));
        }
    }
    ```

---

