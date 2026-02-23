# detect-file-upload-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-file-upload-issues |
| categoryId | security |
| executorSystemId | script |
| title | Детекция проблем загрузки файлов |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет уязвимости при загрузке файлов.

## Детекция

### Проблемы
- No file type validation
- No file size limits
- No malware scanning
- Direct file access
- Path traversal
- Executable uploads

## Результат

- Список endpoints для загрузки
- Проверки безопасности
- Рекомендации

## Примеры

```
php
// Плохо
public function upload(Request $request) {
    $file = $request->file('file');
    $file->move('/uploads', $file->getClientOriginalName());
}

// Хорошо
public function upload(Request $request) {
    $file = $request->file('file');
    $validated = $request->validate([
        'file' => 'required|file|mimes:jpg,png|max:2048',
    ]);
    $path = $file->store('uploads', 's3');
}
