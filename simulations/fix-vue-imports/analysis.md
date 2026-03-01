# Simulation: fix-vue-imports

## Опис

Тестуємо екшен "Виправити зламані імпорти у Vue файлах".

## Workflow

```
1. Client → Server: { task: "виправити імпорти у vue компонентах" }
              ↓
2. Server → Client: { context, execute.form: choices [fix-vue-imports, auto-ai, task-decomposition] }  (no-LLM first, fallback merged)
              ↓
3. Client → Server: { context, result: { choice: "fix-vue-imports" } }
              ↓
4. Server → Client: { context, execute: { script } }
              ↓
5. Client → Server: { context, result: { ... } }
              ↓
6. Server → Client: { context, execute: { script } }
              ↓
... повторюється для кожного step
```

## Steps

1. **vue-import-detect** - сканує файли, знаходить зламані імпорти
2. **vue-import-resolve** - знаходить правильні шляхи
3. **vue-import-apply** - застосовує виправлення
4. **vue-import-cleanup** - очищує тимчасові файли

## Очікувані результати

- Сервер пропонує форму вибору: fix-vue-imports (без LLM, пріоритет), auto-ai, task-decomposition (fallback злиті в choices)
- Кожен крок повертає execute з script
- Фінальний крок повертає finalResult

## Правила

1. **Context**: Сервер повністю керує context. Клієнт НЕ додає нічого до context.
2. **Result**: Результат клієнта завжди поза context.
3. **Context propagation**: У кожному новому запиті context такий самий як у попередній відповіді.
4. **Stateless server**: Сервер не зберігає sessionId/projectId - вони залишаються на боці клієнта.
