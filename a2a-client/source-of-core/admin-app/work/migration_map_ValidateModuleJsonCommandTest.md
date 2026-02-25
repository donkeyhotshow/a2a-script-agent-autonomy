# Migration Map for tests/Feature/ValidateModuleJsonCommandTest.php

Этот файл содержит карту соответствия между тестами из ValidateModuleJsonCommandTest.php и методами/классами из app/Console/Commands/ValidateModuleJsonCommand.php и связанных слушателей/валидаторов. Для каждого теста указывается не только область, но и конкретные методы, если это возможно.

## Важно: Фокус на Feature-тестах

Feature-тесты (ValidateModuleJsonCommandTest.php) покрывают только базовые property/structure ошибки, ошибки невалидного JSON, отсутствующих файлов и типовые ошибки props/children/slots. Новые опции команды, новые форматы вывода, новые типы компонентов, новые механизмы агрегации/фильтрации/логирования/context enrichment и т.д. не покрываются Feature-тестами и должны тестироваться отдельно (например, в модульных тестах).

---

Test Method: `test_command_runs_successfully_with_no_modules`
Tests: Basic command execution with no module files present.
Potential App Code Area: 
- `App\\Console\\Commands\\ValidateModuleJsonCommand::handle`
- `ValidateModuleJsonCommand::processModule`
- `ValidateModuleJsonCommand::validateModule`

---

Test Method: `test_validates_a_simple_valid_module`
Tests: Validation of a correctly structured and valid module JSON file against its component rules.
Potential App Code Area:
- `ValidateModuleJsonCommand::validateModule`
- `ValidateModuleJsonCommand::validateFile`
- `ComponentRuleLoader::getRule`
- `ComponentStructureValidator::handle`
- `PropertyValidationListener::handle`

---

Test Method: `test_detects_unknown_component_type`
Tests: Detection of a component type in a module JSON that does not have a corresponding rule file.
Potential App Code Area:
- `ComponentRuleLoader::getRule`
- `UnknownComponentTypeListener::handle`
- `ValidateModuleJsonCommand::validateFile`

---

Test Method: `test_detects_missing_required_key`
Tests: Detection of a missing required key (like `type`) at the component object level within a module JSON array, based on the component's structure rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::dispatchMissingRequiredKeyError`
- `ValidateModuleJsonCommand::validateFile`

---

Test Method: `test_detects_invalid_prop_type`
Tests: Detection of a property value having an incorrect data type (e.g., string instead of number) based on the component's property validation rule.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::validatePropValue`
- `PropertyValidationListener::dispatchInvalidPropTypeError`

---

Test Method: `test_detects_invalid_json_root_type`
Tests: Validation failure when the root element of a module JSON file is not an array or object as expected.
Potential App Code Area:
- `ValidateModuleJsonCommand::validateFile`
- `ValidateModuleJsonCommand::handle`

---

Test Method: `test_detects_json_syntax_error`
Tests: Handling of JSON files with syntax errors, specifically focusing on inline comments. (Note: Test expects success, indicating comments are allowed).
Potential App Code Area:
- `ValidateModuleJsonCommand::validateFile`
- (Возможно, кастомная логика парсинга JSON с поддержкой комментариев)

---

Test Method: `test_detects_unknown_key_at_component_level`
Tests: Detection of keys in a component object within module JSON that are not defined in the component's structure rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::dispatchUnknownKeyError`

---

Test Method: `test_detects_missing_required_prop`
Tests: Detection of a missing required property within the `props` object of a component in module JSON, based on the component's property validation rule.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchMissingRequiredPropError`

---

Test Method: `test_detects_unknown_prop`
Tests: Detection of a property within the `props` object of a component in module JSON that is not defined in the component's property validation rule.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchUnknownPropError`

---

Test Method: `test_detects_invalid_children_type`
Tests: Validation failure when the `children` property of a component in module JSON is not an array, based on the component's structure rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::validateChildrenElement`

---

Test Method: `test_detects_invalid_slots_type`
Tests: Validation failure when the `slots` property of a component in module JSON is not an object, based on the component's structure rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::validateSlotsElement`

---

Test Method: `test_detects_unknown_slot_name`
Tests: Detection of a key within the `slots` object of a component in module JSON that is not defined as a slot in the component's rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::validateSlotsElement`

---

Test Method: `test_detects_missing_required_slot`
Tests: Detection of a missing required slot within the `slots` object of a component in module JSON, based on the component's slot validation rule.
Potential App Code Area:
- `ComponentStructureValidator::handle`
- `ComponentStructureValidator::validateSlotsElement`

---

Test Method: `test_detects_array_too_few_items`
Tests: Detection of an array property having fewer items than specified by the `minItems` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchArrayTooFewItemsError`

---

Test Method: `test_detects_prop_too_short`
Tests: Detection of a string property value being shorter than specified by the `minLength` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchPropTooShortError`

---

Test Method: `test_detects_prop_too_long`
Tests: Detection of a string property value being longer than specified by the `maxLength` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchPropTooLongError`

---

Test Method: `test_detects_invalid_prop_pattern`
Tests: Detection of a string property value that does not match the regular expression specified by the `pattern` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchInvalidPropPatternError`

---

Test Method: `test_detects_prop_too_small`
Tests: Detection of a numeric property value being smaller than specified by the `min` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchPropTooSmallError`

---

Test Method: `test_detects_prop_too_large`
Tests: Detection of a numeric property value being larger than specified by the `max` rule in the component definition.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchPropTooLargeError`

---

Test Method: `test_detects_empty_string`
Tests: Detection of an empty string property value when empty strings are not explicitly allowed by the validation rules.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchEmptyStringError`

---

Test Method: `test_detects_empty_array_not_any_type`
Tests: Detection of an empty array property when the array type is defined with `itemStructure` but not explicitly allowing any object/string.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::dispatchEmptyArrayError`

---

Test Method: `test_validates_valid_array`
Tests: Successful validation of an array property that meets the `minItems` requirement and whose elements match the `itemStructure` rule.
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::validatePropValue`

---

Test Method: `test_validates_valid_string_and_numeric_props`
Tests: Successful validation of string and numeric properties that meet all specified constraints (`minLength`, `maxLength`, `pattern`, `min`, `max`).
Potential App Code Area:
- `PropertyValidationListener::handle`
- `PropertyValidationListener::validatePropValue`

---

Test Method: `test_fails_on_missing_file`
Tests: Command failure when a specified module JSON file is missing.
Potential App Code Area:
- `ValidateModuleJsonCommand::validateFile`
- `ValidateModuleJsonCommand::findSourceFilePath`

---

## Дальнейшая детализация (модульные тесты и новые механизмы)

Для покрытия новых опций команды, новых форматов вывода, новых типов компонентов, новых механизмов агрегации/фильтрации/логирования/context enrichment и т.д. используйте модульные тесты (например, ValidationLogicTest.php) и соответствующие мок-объекты для новых слушателей и хелперов.


- [ ] Add one yes/no question at the end of the checklist.
