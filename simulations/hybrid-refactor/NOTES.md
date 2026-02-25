# Заметки: hybrid-refactor

## Тестирование
- Гибридный экшен проверяет способность сервера комбинировать разные типы действий для сложной задачи рефакторинга
- При получении задачи "рефакторить контроллер" сервер должен вернуть гибридный экшен с subActions из разных категорий

## Зависимости
- Требует анализа кода (analyze)
- Требует проектирования (design)
- Требует генерации кода (generate)
- Требует анализа графа зависимостей (graph)
- Требует миграции импортов (graph)
- Требует обновления маршрутов (action)
- Требует генерации тестов (generate)

## Примечание
Это симуляция gold standard для гибридного экшена рефакторинга - используется для тестирования парсера и валидации ответов сервера.

## Типы subActions
- **analyze-controller-logic**: анализ (analyze-*)
- **graph-controller-deps**: граф (graph-*)
- **design-service-interface**: проектирование (design)
- **generate-user-service**: генерация (generate-*)
- **migrate-controller**: действие (action)
- **update-routes**: действие (action)
- **graph-migrate-imports**: граф (graph-*)
- **generate-service-tests**: генерация (generate-*)

## Критерии успеха
- response.json содержит тип "hybrid" в tasks
- subActions включают минимум 3 разные категории (analyze + generate + graph + action)
- Описания subActions отражают их принадлежность к разным типам операций
- Основной proposedAction содержит 7+ subActions для полного рефакторинга
