# Task 09: DSL Composability - YAML Actions с Mixins

## Goal

Реализовать Domain-Specific Language с наследованием, миксинами и composition для action definitions.

## References

- DSL концепция: `docs/pivot-3-dsl-composability.md`
- Существующие actions: `a2a-server/src/actions/definitions/`
- YAML формат: `a2a-server/src/actions/definitions/yaml/`

## Work to perform

### Phase 1: DSL Specification
1. **Разработать DSL спецификацию**
   - Определить формат YAML с поддержкой mixins
   - Описать структуру: `id`, `version`, `mixins`, `context`, `steps`
   - Добавить поддержку `$mixin` references

### Phase 2: Parser + Resolver
2. **Написать парсер + resolver**
   - Реализовать парсер YAML в AST
   - Разрешение `$mixin` ссылок
   - Генерация TypeScript кода из YAML

### Phase 3: Common Mixins
3. **Выделить 3-5 общих миксинов**
   - `file-scanner` - сканирование файлов
   - `patch-applier` - применение патчей
   - `code-analyzer` - анализ кода

### Phase 4: Migration
4. **Перевести 2-3 actions в YAML**
   - Начать с простых actions
   - Постепенно мигрировать остальные

## Acceptance criteria

- DSL спецификация задокументирована
- Работающий парсер с поддержкой mixins
- 2-3 actions переведены в YAML формат
