# Отчёт о дублировании кода - Назначенные задачи

Проведён полный анализ рабочего пространства на предмет дублирования кода. Найдено **8 основных областей дублирования**, для каждой создана отдельная задача.

## Сводка по приоритетам

| Приоритет | Количество | Статус |
|-----------|-----------|--------|
| **ВЫСОКИЙ** | 1 | Критическая для обслуживания |
| **СРЕДНИЙ** | 5 | Влияют на техдолг |
| **НИЗКИЙ** | 2 | Улучшают качество кода |
| **ВСЕГО** | 8 | Готовы к исполнению |

---

## Назначенные задачи

### 🔴 ВЫСОКИЙ ПРИОРИТЕТ (1)

#### 1. [Дедупликация функций валидации конфигурации](tasks/dedup-config-validation.md)
- **Файлы**: 3 дубликата функций валидации в `a2a-server/packages/server-config/`
- **Функции**: `validateConfig()`, `validateConfigSafe()`, `validatePorts()`
- **Действие**: Создать единый модуль валидации вместо трёх реализаций

---

### 🟡 СРЕДНИЙ ПРИОРИТЕТ (5)

#### 2. [Удаление файлов-артефактов резервных копий](tasks/cleanup-backup-artifacts.md)
- **Файлы**: `.import-fix-backup`, `.comprehensive-fix-backup` артефакты
- **Действие**: Удалить все резервные файлы из активной кодовой базы

#### 3. [Дедупликация схем валидации](tasks/dedup-validation-schemas.md)
- **Файлы**: Схемы в `validation.ts` и резервных копиях
- **Функции**: `uuidSchema`, `emailSchema`, `passwordSchema` и другие
- **Действие**: Единственный источник для всех валидационных схем

#### 4. [Дедупликация функций валидатора артефактов](tasks/dedup-artifact-validator.md)
- **Файлы**: `artifact-validator.ts` дублируется в резервных копиях
- **Функция**: `validateArtifact()`
- **Действие**: Единая реализация в `server-utils`

#### 5. [Дедупликация логики валидации запросов](tasks/dedup-request-validation.md)
- **Файлы**: Валидация в `routes/`, `protocol/`, `sdk/`
- **Функции**: `validateRequestToServer()`, `isRequestLike()`, `validateInvokeRequest()`
- **Действие**: Перемещение в `protocol/types/validators.ts`

#### 6. [Дедупликация кода инициализации тестовых моков](tasks/dedup-test-mock-setup.md)
- **Файлы**: Mock-инициализация в нескольких тестовых файлах
- **Действие**: Создать `tests/helpers/mock-setup.ts` с общими утилитами

#### 7. [Полная очистка папки резервных копий](tasks/backup-cleanup-comprehensive.md)
- **Папка**: `.kilo/scripts/duplicates/backups/`
- **Действие**: Удалить полностью, обновить `.gitignore`

---

### 🟢 НИЗКИЙ ПРИОРИТЕТ (2)

#### 8. [Консолидация переменных окружения и конфигурации](tasks/consolidate-env-config.md)
- **Файлы**: `vite.config.js`, `vite.config.prod.ts`, `playwright.config.ts`, `vitest.config.ts`
- **Паттерны**: Переменные окружения, разрешение путей, алиасы
- **Действие**: Централизованный модуль конфигурации

#### 9. [Дедупликация утилит трансформации данных](tasks/dedup-data-transform-utils.md)
- **Файлы**: `validators.ts` и `server-utils/`
- **Функции**: `deepCloneJson()`, `normalizeServerInvokeRequest()`, `normalizeServerInvokeResponse()`
- **Действие**: Единый источник в `server-utils`

---

## Рекомендуемый порядок выполнения

1. **Шаг 1 (СРОЧНО)**: Выполнить [cleanup-backup-artifacts.md](tasks/cleanup-backup-artifacts.md) и [backup-cleanup-comprehensive.md](tasks/backup-cleanup-comprehensive.md)
   - Удалить весь мусор отваривания

2. **Шаг 2 (ВЫСОКИЙ ПРИОРИТЕТ)**: Выполнить [dedup-config-validation.md](tasks/dedup-config-validation.md)
   - Критическая дедупликация в конфигурации

3. **Шаг 3 (СРЕДНИЙ ПРИОРИТЕТ)**: Выполнить остальные задачи СРЕДНЕГО приоритета:
   - [dedup-validation-schemas.md](tasks/dedup-validation-schemas.md)
   - [dedup-artifact-validator.md](tasks/dedup-artifact-validator.md)
   - [dedup-request-validation.md](tasks/dedup-request-validation.md)
   - [dedup-test-mock-setup.md](tasks/dedup-test-mock-setup.md)

4. **Шаг 4 (НИЗКИЙ ПРИОРИТЕТ)**: Выполнить задачи НИЗКОГО приоритета:
   - [consolidate-env-config.md](tasks/consolidate-env-config.md)
   - [dedup-data-transform-utils.md](tasks/dedup-data-transform-utils.md)

---

## Метрики улучшения

При завершении всех задач ожидается:

- 📉 **Снижение DRY нарушений**: ~45 функций и модулей будут дедублированы
- 🧹 **Чистота репо**: Удалено ~120+ файлов артефактов
- 📚 **Раздельность ответственности**: 8 модулей будут иметь единый источник
- 🛡️ **Снижение ошибок**: Единственные реализации = меньше рассинхронизаций

---

## Отслеживание прогресса

| Задача | Статус | % Завершения |
|---------|----|-------------|
| dedup-config-validation.md | ⏳ Ожидание | 0% |
| cleanup-backup-artifacts.md | ⏳ Ожидание | 0% |
| dedup-validation-schemas.md | ⏳ Ожидание | 0% |
| dedup-artifact-validator.md | ⏳ Ожидание | 0% |
| dedup-request-validation.md | ⏳ Ожидание | 0% |
| consolidate-env-config.md | ⏳ Ожидание | 0% |
| dedup-test-mock-setup.md | ⏳ Ожидание | 0% |
| dedup-data-transform-utils.md | ⏳ Ожидание | 0% |
| backup-cleanup-comprehensive.md | ⏳ Ожидание | 0% |

---

## Документация анализа

**Дата анализа**: 10 апреля 2026  
**Инструмент**: Автоматический анализ рабочего пространства  
**Покрытие**: Полный workspace анализ (все расширения: .ts, .js, .py)

Для каждой задачи доступны:
- ✅ Описание проблемы
- ✅ Список затронутых файлов с номерами строк
- ✅ Дублирующиеся элементы
- ✅ Рекомендуемое решение
- ✅ Ожидаемая ценность
