# suggest-validation-rules

| Параметр | Значение |
|----------|----------|
| actionId | suggest-validation-rules |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение правил валидации |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает правила валидации для полей ввода.

## Типы валидации

### 1. Email
```
php
'email' => 'required|email:rfc,dns'
```

### 2. Password
```
php
'password' => 'required|string|min:8|confirmed|
    regex:/[A-Z]/|regex:/[a-z]/|regex:/[0-9]/'
```

### 3. Phone
```
php
'phone' => 'required|regex:/^\+?[1-9]\d{1,14}$/'
```

### 4. URL
```
php
'url' => 'required|url|max:2048'
```

### 5. File
```
php
'avatar' => 'required|image|mimes:jpeg,png|max:2048|
    dimensions:min_width=100,min_height=100'
```

## Рекомендации

- Использовать встроенные правила фреймворка
- Валидировать на client и server side
- Использовать whitelist подход
- Обрабатывать все edge cases
- Документировать правила
