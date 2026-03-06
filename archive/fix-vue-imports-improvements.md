# Plan: fix-vue-imports-improvements — Улучшения

## Цель

Улучшить существующий `fix-vue-imports` для лучшей работы с различными сценариями.

## Предлагаемые улучшения

### 1. Alias Resolution
- Поддержка кастомных alias из `vite.config.js`, `tsconfig.json`
- Alias по умолчанию: `@ → resources/js`, `~ → resources`

### 2. Multi-file Support
- Обработка нескольких файлов одновременно
- Progress tracking через `context.execution.progress`

### 3. Rollback Support
- Создание backup перед изменениями
- Возможность отката при ошибках

### 4. Dry-run Mode
- Предварительный просмотр без изменений
- Вывод списка изменений для подтверждения

### 5. TypeScript Support
- Парсинг TypeScript-specific импортов
- Поддержка `import type`, `export type`

## Sub-actions (расширенные)

1. `vue-import-detect` — сканирование (улучшенное)
2. `vue-import-resolve` — резолвинг с поддержкой alias
3. `vue-import-apply` — применение с backup
4. `vue-import-cleanup` — очистка
5. `vue-import-rollback` — откат (новое)

## Priority

10 (как у основного fix-vue-imports)

## Status

📋 Pending — требует реализации
