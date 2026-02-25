## Детализированный чеклист рефакторинга на хелперы для app/Console/Commands/Helpers/ModuleValidate/

### ValidationEventCollector.php
- **JsonHelper:**
  - [ ] Строка 284: `json_decode($content, true, 512, JSON_THROW_ON_ERROR) ?: []`
    → заменить на `JsonHelper::decode($content) ?: []`

---

### ModuleJsonProcessor.php
- **FileHelper:**
  - [ ] Строка 1139: `file_exists($pathWithExtension)`
    → заменить на `FileHelper::exists($pathWithExtension)`
  - [ ] Строка 1149: `file_exists($relativePath)`
    → заменить на `FileHelper::exists($relativePath)`
  - [ ] Строка 1155: `file_exists($actionPath)`
    → заменить на `FileHelper::exists($actionPath)`
  - [ ] Строка 1413, 1422, 1450: `file_put_contents('c:/apps/admin-app/validator-debug.log', ...)`
    → заменить на `FileHelper::put('c:/apps/admin-app/validator-debug.log', ...)`
- **JsonHelper:**
  - [ ] Строка 87: `json_decode($content, true, 512, JSON_THROW_ON_ERROR);`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 1182: `json_decode($fileContent, true, 512, JSON_THROW_ON_ERROR);`
    → заменить на `JsonHelper::decode($fileContent)`
  - [ ] Строка 1415: `json_encode($componentType)`
    → заменить на `JsonHelper::encode($componentType)`
  - [ ] Строка 1416: `json_encode($context)`
    → заменить на `JsonHelper::encode($context)`
  - [ ] Строка 1417: `json_encode($eventData)`
    → заменить на `JsonHelper::encode($eventData)`

---

### ValidationConfigLoader.php
- **FileHelper:**
  - [ ] Строка 182: `file_get_contents($filePath)`
    → заменить на `FileHelper::get($filePath)`
  - [ ] Строка 289: `file_exists($fullRefPath)`
    → заменить на `FileHelper::exists($fullRefPath)`
- **JsonHelper:**
  - [ ] Строка 105: `json_decode($suggestionsContent, true, 512, JSON_THROW_ON_ERROR);`
    → заменить на `JsonHelper::decode($suggestionsContent)`
  - [ ] Строка 188: `json_decode($content, true);`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 297: `json_decode(file_get_contents($fullRefPath), true);`
    → заменить на `JsonHelper::decode(FileHelper::get($fullRefPath))`
- **ArrayHelper:**
  - [ ] Строка 119: `array_keys($data)`
    → заменить на `ArrayHelper::getKeys($data)`
  - [ ] Строка 132: `array_keys($data['type_suggestions'])`
    → заменить на `ArrayHelper::getKeys($data['type_suggestions'])`
  - [ ] Строка 137: `array_keys($data['property_suggestions'])`
    → заменить на `ArrayHelper::getKeys($data['property_suggestions'])`
  - [ ] Строка 252: `array_keys($this->componentValidationRulesCache)`
    → заменить на `ArrayHelper::getKeys($this->componentValidationRulesCache)`
  - [ ] Строка 275: `array_merge($merged, $subSchema['properties'])`
    → заменить на `ArrayHelper::mergeArrays($merged, $subSchema['properties'])`
  - [ ] Строка 277: `array_merge($merged, $subSchema)`
    → заменить на `ArrayHelper::mergeArrays($merged, $subSchema)`
  - [ ] Строка 303: `array_merge($refStack, [$fullRefPath])`
    → заменить на `ArrayHelper::mergeArrays($refStack, [$fullRefPath])`
  - [ ] Строка 305: `array_merge($refContent, array_diff_key($structure, ['$ref' => 1]))`
    → заменить на `ArrayHelper::mergeArrays($refContent, array_diff_key($structure, ['$ref' => 1]))`

---

### ModuleValidationLogHelper.php
- **JsonHelper:**
  - [ ] Строка 58: `json_encode($value)`
    → заменить на `JsonHelper::encode($value)`
  - [ ] Строка 60: `json_encode($formattedContext)`
    → заменить на `JsonHelper::encode($formattedContext)`
- **ArrayHelper:**
  - [ ] Строка 57: `array_map(function($value) { ... }, $context)`
    → заменить на `ArrayHelper::transform($context, function($value) { ... })`

---

### ComponentValidation.php
- **JsonHelper:**
  - [ ] Строка 100: `json_decode($content, true, 512, JSON_THROW_ON_ERROR);`
    → заменить на `JsonHelper::decode($content)`
- **ArrayHelper:**
  - [ ] Строка 286: `array_keys($propRules)`
    → заменить на `ArrayHelper::getKeys($propRules)`
  - [ ] Строка 287: `array_keys($propsData)`
    → заменить на `ArrayHelper::getKeys($propsData)`
  - [ ] Строка 326: `array_map('trim', explode('|', $expectedType))`
    → заменить на `ArrayHelper::transform(explode('|', $expectedType), 'trim')`
  - [ ] Строка 343: `array_keys($propValue) === range(0, count($propValue) - 1)`
    → заменить на `ArrayHelper::isList($propValue)`
  - [ ] Строка 346: `array_keys($propValue) !== range(0, count($propValue) - 1)`
    → заменить на `!ArrayHelper::isList($propValue)`

---

### ValidationResultOutputHelper.php
- **JsonHelper:**
  - [ ] Строка 212: `json_encode($errorsToDisplay, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)`
    → заменить на `JsonHelper::encode($errorsToDisplay)`
  - [ ] Строка 315: `json_encode($error['card'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($error['card'])`
  - [ ] Строка 322: `json_encode($error['example'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($error['example'])`
  - [ ] Строка 351: `json_encode($suggestion)`
    → заменить на `JsonHelper::encode($suggestion)`
- **ArrayHelper:**
  - [ ] Строка 103: `array_values($error['available_props'])`
    → заменить на `ArrayHelper::getValues($error['available_props'])`
  - [ ] Строка 104: `array_values($error['suggested_props'])`
    → заменить на `ArrayHelper::getValues($error['suggested_props'])`

---

### ErrorMessageGenerator.php
- **JsonHelper:**
  - [ ] Строка 28: `json_encode($details['expected_type'])`
    → заменить на `JsonHelper::encode($details['expected_type'])`
  - [ ] Строка 31: `json_encode($details['actual_type'])`
    → заменить на `JsonHelper::encode($details['actual_type'])`
  - [ ] Строка 37: `json_encode($details['actual_value'])`
    → заменить на `JsonHelper::encode($details['actual_value'])`
  - [ ] Строка 45: `json_encode($opt)`
    → заменить на `JsonHelper::encode($opt)`
  - [ ] Строка 57: `json_encode($details['reason'])`
    → заменить на `JsonHelper::encode($details['reason'])`
  - [ ] Строка 113: `json_encode($details['expected_type'])`
    → заменить на `JsonHelper::encode($details['expected_type'])`
  - [ ] Строка 117: `json_encode($details['actual_type'])`
    → заменить на `JsonHelper::encode($details['actual_type'])`
  - [ ] Строка 121: `json_encode($details['actual_value'])`
    → заменить на `JsonHelper::encode($details['actual_value'])`
  - [ ] Строка 125: `json_encode($details['options'])`
    → заменить на `JsonHelper::encode($details['options'])`
  - [ ] Строка 129: `json_encode($details['reason'])`
    → заменить на `JsonHelper::encode($details['reason'])`

---

### ComponentRuleLoader.php
- **JsonHelper:**
  - [ ] Строка 41: `json_encode($this->rulePaths)`
    → заменить на `JsonHelper::encode($this->rulePaths)`
  - [ ] Строка 66: `json_decode($content, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 85: `json_decode($commonPropsJson, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($commonPropsJson)`
  - [ ] Строка 98: `json_encode($ruleData)`
    → заменить на `JsonHelper::encode($ruleData)`
  - [ ] Строка 99: `json_encode($resolvedRuleData)`
    → заменить на `JsonHelper::encode($resolvedRuleData)`
  - [ ] Строка 171: `json_encode($resolvedSubSchema)`
    → заменить на `JsonHelper::encode($resolvedSubSchema)`
  - [ ] Строка 190: `json_encode($data, JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($data)`
  - [ ] Строка 198: `json_encode($data['props']['nestedValidation']['structure'], JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($data['props']['nestedValidation']['structure'])`
  - [ ] Строка 207: `json_encode($data['nestedValidation']['structure']['props'], JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($data['nestedValidation']['structure']['props'])`
  - [ ] Строка 215: `json_encode($data['structure']['props'], JSON_PRETTY_PRINT)`
    → заменить на `JsonHelper::encode($data['structure']['props'])`
  - [ ] Строка 258: `json_decode($content, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 305: `json_decode($content, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 335: `json_decode($content, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($content)`
  - [ ] Строка 400: `json_decode($content, true, 512, JSON_THROW_ON_ERROR)`
    → заменить на `JsonHelper::decode($content)`
- **ArrayHelper:**
  - [ ] Строка 72: `array_keys($ruleData)`
    → заменить на `ArrayHelper::getKeys($ruleData)`
  - [ ] Строка 122: `array_keys($this->rulesCache)`
    → заменить на `ArrayHelper::getKeys($this->rulesCache)`
  - [ ] Строка 148: `array_keys($data)`
    → заменить на `ArrayHelper::getKeys($data)`
  - [ ] Строка 342: `array_keys($this->suggestionsCache)`
    → заменить на `ArrayHelper::getKeys($this->suggestionsCache)`

---

### PaginationHelper.php
- **FileHelper:**
  - [ ] Строка 99: `if (!file_exists($fullPath)) {`
    → заменить на `if (!FileHelper::exists($fullPath)) {`
  - [ ] Строка 106: `$content = file_get_contents($fullPath);`
    → заменить на `$content = FileHelper::get($fullPath);`

--- 