# ISSUE 2 — Dialog: зламаний context.history

**Статус:** КРИТИЧНО — зламано, потребує фіксу

## Проблема

Реальна проблема в `dialog-request-processor.ts`. Кешування на проксі (`caching.py`) не впливає — dialog завжди йде через promise (`?promise=1`).

## Баг 1: history береться з неправильного місця

```typescript
// ЗАРАЗ (неправильно):
const ctxContext = ctx['context'] as Record<string, unknown> | undefined;
const existingHistory = (ctxContext?.history ?? []) as ...
// ctx — це вже context, тому ctx['context'] = undefined завжди!

// ПРАВИЛЬНО:
const existingHistory = (ctx['history'] ?? []) as ...
```

## Баг 2: history не передається в наступний запит

Симуляція `dialog/3/response.json` показує: відповідь містить `context.history` з user+assistant.
`dialog/4/request.json`: наступний запит клієнта містить той самий `context.history` — клієнт передає context з попередньої відповіді, це правильно.
Але сервер в `runResponseTransform` будує `newHistory` з `ctx` (поточний запит), а не з відповіді.

## Баг 3: подвійне додавання user message

В `server-transforms-request.json` (step 3) є `append-to-array` для user message.
В `runResponseTransform` також додається user message вручну → дублювання.

## Правильна логіка (по симуляції)

```
dialog/3: request має context.history=[] + result.message="hello world"
dialog/3: response має context.history=[{user,"hello world"},{assistant,"hello world"}]
dialog/4: request має context.history=[{user},{assistant}] + result.message="Дякую!"
dialog/4: response має context.history=[{user},{assistant},{user,"Дякую!"}]
```

Тобто: `newHistory = [...ctx.history, {user: result.message}, {assistant: llmMessage}]`

## Фікс

```typescript
// В runResponseTransform:
const existingHistory = (ctx['history'] ?? []) as Array<...>;  // НЕ ctx['context']
```

Довіряти тільки одному місцю для додавання user message. Прибрати дублювання.
