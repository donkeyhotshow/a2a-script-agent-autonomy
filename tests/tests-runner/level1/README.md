# Level 1: Basic Health Checks

> **Простые тесты - проверка доступности основных сервисов**

## Структура подуровней

```
level1/
├── 1-services/     # Проверка доступности сервисов
├── 2-connectivity/ # Проверка сетевых подключений
├── 3-basic-api/    # Базовые API эндпоинты
└── run.ps1         # Запуск всех Level 1 тестов с fail-fast
```

## Принцип работы

- **Fail-fast**: При первой ошибке останавливается выполнение
- **Быстрый фидбек**: Результаты за секунды
- **Нет зависимостей**: Работает без запущенных сервисов

## Запуск

```bash
# Запуск всех Level 1 тестов
.\scripts\tests\level1\run.ps1

# Или по отдельности
.\scripts\tests\level1\1-services\run.ps1
.\scripts\tests\level1\2-connectivity\run.ps1
.\scripts\tests\level1\3-basic-api\run.ps1
```