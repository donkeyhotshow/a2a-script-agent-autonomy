# Заметки: hybrid-fix

## Тестирование
- Гибридный экшен проверяет способность сервера комбинировать разные типы действий
- При получении задачи "исправить ошибку и обновить зависимости" сервер должен вернуть гибридный экшен с subActions из разных категорий

## Зависимости
- Требует анализа кода (analyze)
- Требует генерации патча (generate)
- Требует анализа графа зависимостей (graph)
- Требует доступа к package.json для обновления зависимостей

## Примечание
Это симуляция gold standard для гибридного экшена - используется для тестирования парсера и валидации ответов сервера.

## Типы subActions
- **analyze-order-error**: анализ (analyze-*)
- **graph-order-dependencies**: граф (graph-*)
- **check-outdated-packages**: анализ (analyze-*)
- **generate-order-patch**: генерация (generate-*)
- **update-dependencies**: действие (action)
- **graph-update-links**: граф (graph-*)
- **verify-fix**: действие (action)

## Критерии успеха
- response.json содержит тип "hybrid" в tasks
- subActions включают минимум 2 разные категории (analyze + generate + graph)
- Описания subActions отражают их принадлежность к разным типам операций
