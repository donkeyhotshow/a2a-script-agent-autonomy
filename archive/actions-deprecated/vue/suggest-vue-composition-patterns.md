# suggest-vue-composition-patterns

| Параметр | Значение |
|----------|----------|
| actionId | suggest-vue-composition-patterns |
| categoryId | vue |
| executorSystemId | agent |
| title | Предложение использования Composition API |
| stack | vue |
| canMigrateToScript | ⏳ |

## Описание

Агент предлагает паттерны использования Vue 3 Composition API.

## Паттерны

### ref vs reactive
- Использовать ref для примитивов
- Использовать reactive для объектов
- Избегать смешивания

### computed
- Только для чтения
- Не мутировать внутри
- Кэширование значений

### watch/watchEffect
- watch для реактивных изменений
- watchEffect для авто-зависимостей
- Правильная очистка

## Примеры

```
typescript
// ref для примитивов
const count = ref(0)
const name = ref('')

// reactive для объектов
const state = reactive({
  user: null,
  loading: false
})

// computed
const doubleCount = computed(() => count.value * 2)

// watch
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})
```

## Рекомендации

- Использовать Composition API вместо Options API
- Выносить логику в composables
- Типизировать ref и computed
- Использовать shallowRef для больших объектов
