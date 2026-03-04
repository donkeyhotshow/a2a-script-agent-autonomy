# Plan: fix-vue-imports-batch — Пакетная обработка

## Цель

Создать вариацию `fix-vue-imports` с пакетной обработкой для больших проектов.

## Вариации алгоритма

### Вариант A: Параллельная обработка
- `vue-import-detect` → возвращает все файлы сразу
- `vue-import-resolve` → обрабатывает все импорты
- `vue-import-apply` → применяет все патчи

### Вариант B: Поэтапная обработка
- `vue-import-detect` → сканирует проект
- `vue-import-resolve` → резолвит импорты пакетами по 50 файлов
- `vue-import-apply` → применяет пакетами
- `vue-import-cleanup` → финальная очистка

### Вариант C: Инкрементальная
- Пока есть необработанные файлы:
  - Обработать следующие 10 файлов
  - Сохранить прогресс в context

## Sub-actions

1. `vue-import-detect` — сканирование (уже есть)
2. `vue-import-resolve-batch` — пакетный резолвинг
3. `vue-import-apply-batch` — пакетное применение
4. `vue-import-cleanup` — очистка (уже есть)

## Priority

10 (как у основного fix-vue-imports)

## Status

📋 Pending — требует реализации
