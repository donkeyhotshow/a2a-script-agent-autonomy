# suggest-composition-api

| Параметр | Значение |
|----------|----------|
| actionId | suggest-composition-api |
| categoryId | vue |
| executorSystemId | agent |
| title | Предложение Composition API |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует компоненты с Options API и предлагает миграцию на Composition API.

## Преимущества Composition API

- Лучшая типизация с TypeScript
- Лучшая организация кода
- Улучшенная возможность повторного использования
- Улучшенный tree-shaking
- Улучшенная поддержка IDE

## Типичные предложения

### data() → ref/reactive
```
javascript
// До
data() {
  return { count: 0 }
}

// После
const count = ref(0)
// или
const state = reactive({ count: 0 })
```

### methods → functions
```
javascript
// До
methods: {
  increment() { this.count++ }
}

// После
const increment = () => { count.value++ }
```

### computed → computed
```
javascript
// До
computed: {
  doubled() { return this.count * 2 }
}

// После
const doubled = computed(() => count.value * 2)
```

### watch → watch
```
javascript
// До
watch: {
  count(newVal) { console.log(newVal) }
}

// После
watch(count, (newVal) => { console.log(newVal) })
```

## Best practices

- Использовать <script setup>
- Выносить логику в composables
- Использовать TypeScript
- Следовать соглашениям об именовании
