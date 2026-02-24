# suggest-vue-props-emits

| Параметр | Значение |
|----------|----------|
| actionId | suggest-vue-props-emits |
| categoryId | vue |
| executorSystemId | agent |
| title | Предложение defineProps/defineEmits |
| stack | vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает правильное использование defineProps и defineEmits в Vue 3.

## defineProps

### Способ 1: Типовые props (рекомендуется)
```
typescript
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()
```

### Способ 2: С默认值
```
typescript
const props = withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0
})
```

## defineEmits

```
typescript
const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'delete', id: number): void
}>()

// Или
const emit = defineEmits({
  update: (value: string) => true,
  delete: (id: number) => true
})
```

## Рекомендации

- Всегда типизировать props и emits
- Использовать strict typing
- Добавлять required и default
- Документировать props в JSDoc
