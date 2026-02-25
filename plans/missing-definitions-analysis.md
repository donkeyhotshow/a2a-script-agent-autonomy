# Анализ: Что есть в definitions vs планы

## Резюме

Проанализировав все планы в директориях `plans/` и `external-ai-hub/plans/`, сравнил с существующими action definitions в `a2a-server/src/actions/definitions/`.

## Существующие definitions (полный список)

### ✅ context/ (5 actions)
- `context-scan.md` - Сканирование проекта
- `context-index.md` - Индексация кода
- `context-query.md` - Семантический поиск
- `context-rank.md` - Ранжирование результатов
- `context-format.md` - Форматирование контекста

### ✅ analysis/ (8 actions)
- `analyze-full.md` - Полный анализ проекта
- `analyze-performance.md` - Анализ производительности
- `analyze-security.md` - Анализ безопасности
- `analyze-architecture.md` - Анализ архитектуры
- `analyze-typescript.md` - Анализ TypeScript
- `analyze-laravel.md` - Анализ Laravel
- `analyze-vue.md` - Анализ Vue
- `analyze-test.md` - Анализ тестов

### ✅ graph/ (6 actions)
- `graph-build.md` - Построение графа
- `graph-query.md` - Запросы к графу
- `graph-impact.md` - Анализ влияния
- `graph-extract-entities.md` - Извлечение сущностей
- `graph-extract-relations.md` - Извлечение связей
- `graph-visualize.md` - Визуализация графа

### ✅ generation/ (7 actions)
- `generate-crud.md` - Генерация CRUD
- `generate-model.md` - Генерация модели
- `generate-controller.md` - Генерация контроллера
- `generate-method.md` - Генерация метода
- `generate-migration.md` - Генерация миграции
- `generate-view.md` - Генерация представления
- `generate-test.md` - Генерация теста

### ✅ hybrid/ (4 actions)
- `hybrid-fix.md` - Гибридное исправление
- `hybrid-refactor.md` - Гибридный рефакторинг
- `hybrid-improve.md` - Гибридное улучшение
- `hybrid-explain.md` - Гибридное объяснение

### ✅ fallback/ (3 actions)
- `ai-fallback.md` - AI Fallback
- `ai-analyze.md` - AI Анализ
- `ai-generate.md` - AI Генерация

### ✅ root
- `fix-vue-imports.md` + улучшения
- `auto-ai-index.ts` - индекс категорий

---

## Что НЕ требует stubs в definitions

### 1. external-ai-hub планы (Python proxy)
- `promise-queue-plan.md` - Promise Viewer UI (web-интерфейс)
- `llm-providers-plan.md` - Universal LLM Wrapper (Python)
- `ollama-tuning-plan.md` - Ollama настройки (Python)
- `configuration-system-plan.md` - Система конфигурации (Python)

### 2. a2a-client планы
- `ai-session-context-system.md` (section 8) - Client-side actions (execution engine)
- `plans/later/` - Улучшения RAG, file-scanner, auth (client packages)

### 3. Системные планы
- `action-scripts-integration.md` - Интеграция в request-processor (код)
- `action-iteration-system.md` - Система итеративных actions (код)
- `action-upgrade-plan.md` - Апгрейд формата (код)

---

## Вывод

**Все action definitions из основного плана `plans/actions-definitions-for-auto-ai.md` уже созданы!**

Что касается остальных планов:
- Они описывают **код** (Python, TypeScript), а не **action definitions** (MD файлы)
- Или описывают **внешние системы** (external-ai-hub proxy)
- Или описывают **клиентские пакеты** (a2a-client packages)

---

## Вопрос к пользователю

Есть ли что-то конкретное, что вы хотите проверить? Возможно:
1. Проверить конкретный план на наличие missing definitions?
2. Проверить sub-actions внутри существующих definitions?
3. Что-то другое?
