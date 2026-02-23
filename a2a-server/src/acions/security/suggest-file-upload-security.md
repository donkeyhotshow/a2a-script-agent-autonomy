# suggest-file-upload-security

| Параметр | Значение |
|----------|----------|
| actionId | suggest-file-upload-security |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение безопасности загрузки |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает методы защиты при загрузке файлов.

## Методы защиты

### 1. Валидация типа файла
```
php
'file' => 'required|file|mimes:jpg,jpeg,png,gif,pdf'
```

### 2. Ограничение размера
```
php
'file' => 'required|file|max:2048' // 2MB
```

### 3. Генерация случайных имен
```
php
$filename = Str::random(40) . '.' . $file->extension();
$path = $file->storeAs('uploads', $filename);
```

### 4. Проверка MIME типа
```
php
$file->getMimeType() === 'image/jpeg'
```

### 5. Использование внешнего хранилища
```
php
$path = $file->store('uploads', 's3');
```

## Рекомендации

- Использовать whitelist для типов файлов
- Проверять реальный тип файла
- Хранить файлы вне webroot
- Использовать CDN/S3
- Сканировать на malware
- Ограничивать размер
