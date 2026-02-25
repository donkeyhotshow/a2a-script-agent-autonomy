# Партиалы Requirements Sync

Партиалы содержат узкие границы ответственности для синхронизации требований по модулям проекта.

## ⚠️ Статус партиалов

**Партиалы находятся в процессе обновления под новую структуру требований.**

Текущие партиалы содержат устаревшие ссылки на `project-requirements-*.md` файлы, которые были заменены на новую структуру:
- `docs/requirements/core/requirements-core-*.md`
- `docs/requirements/admin/requirements-admin-*.md`
- `docs/requirements/commerce/requirements-*.md`
- `docs/requirements/testing/requirements-testing-*.md`
- `docs/requirements/requirements-status-tracker-*.md`

## 📋 Планируемые обновления

1. **Обновление ссылок** - замена устаревших путей на актуальные
2. **Добавление поддержки миграции требований в пакеты** - обновление партиалов для работы с требованиями в `packages/*/docs/requirements/`
3. **Синхронизация с новой структурой** - обновление правил синхронизации под новую структуру требований

## 🔄 Временное использование

До обновления партиалов использовать основную роль `requirements-sync.md` для синхронизации требований, которая содержит актуальную информацию о:
- Структуре требований проекта
- Миграции требований в пакеты
- Синхронизации между основным `docs/requirements/` и требованиями в пакетах
- Стандарте gap-файлов миграции

## 📚 Связанные документы

- **Основная роль:** `.carior/roles/requirements-sync/requirements-sync.md`
- **Стандарт gap-файлов:** `.carior/roles/requirements-sync/gap-files-format-standard.md`
- **Структура требований:** `docs/requirements/requirements-structure.md`

