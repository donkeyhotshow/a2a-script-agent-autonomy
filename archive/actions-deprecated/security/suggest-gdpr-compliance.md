# suggest-gdpr-compliance

| Параметр | Значение |
|----------|----------|
| actionId | suggest-gdpr-compliance |
| categoryId | security |
| executorSystemId | agent |
| title | Предложение GDPR соответствия |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает методы соответствия GDPR (General Data Protection Regulation).

## Принципы GDPR

### 1. Законность, справедливость, прозрачность
- Process data lawfully
- Fair processing
- Transparent data handling

### 2. Ограничение цели
- Collect for specific purposes
- Don't process beyond original purpose

### 3. Минимизация данных
- Only collect necessary data
- Limit data retention

### 4. Точность
- Keep data accurate
- Correct inaccurate data

### 5. Ограничение хранения
- Don't keep longer than necessary
- Implement data retention policies

### 6. Целостность и конфиденциальность
- Appropriate security measures
- Protect against unauthorized access

## Реализация

### Согласие (Consent)
```
php
// Получение согласия
$consent = $request->boolean('gdpr_consent');
if (!$consent) {
    return response()->json(['error' => 'Consent required'], 400);
}
```

### Право на удаление
```
php
// Right to be forgotten
public function destroy(Request $request) {
    $user = $request->user();
    $user->delete();
    // Удалить связанные данные
    $user->posts()->delete();
    $user->comments()->delete();
    
    return response()->json(['message' => 'Data deleted']);
}
```

### Право на перенос данных
```
php
// Data portability
public function export(Request $request) {
    $user = $request->user();
    $data = $user->toArray();
    
    return response()->json($data);
}
```

## Рекомендации

- Документировать обработку данных
- Получать явное согласие
- Обеспечить право на удаление
- Шифровать персональные данные
- Регулярно проводить аудит
- Назначить DPO (Data Protection Officer)
