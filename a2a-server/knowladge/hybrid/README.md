# Hybrid Actions - Гибридные действия

Гибридные действия комбинируют script (автоматические) и agent (LLM) подходы.

## Workflow

```
script → agent → script → result
```

## Доступные гибридные действия

### 1. Code Analysis Pipeline
1. script: Сбор файлов
2. agent: Анализ кода
3. script: Формирование отчёта

### 2. Context Collection
1. script: Сканирование структуры проекта
2. agent: Определение контекста
3. script: Сохранение в graph

### 3. Task Decomposition
1. agent: Анализ задачи
2. script: Генерация подзадач
3. agent: Валидация подзадач

### 4. Code Generation
1. agent: Генерация кода
2. script: Валидация синтаксиса
3. agent: Рефакторинг

### 5. Testing Pipeline
1. script: Сбор тестовых данных
2. agent: Генерация тестов
3. script: Запуск тестов
