# detect-options-api

| Параметр | Значение |
|----------|----------|
| actionId | detect-options-api |
| categoryId | vue |
| executorSystemId | script |
| title | Детекция Options API |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование Vue компонентов для обнаружения использования Options API.

## Что обнаруживается

- Components с options: {}
- data(), methods, computed, watch
- Mixins
- this.$emit, this.$refs

## Примеры

```
vue
<script>
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  computed: {
    doubled() {
      return this.count * 2
    }
  }
}
</script>
```

## Инструменты

- ESLint plugin vue
- vue-eslint-parser
- Custom static analysis

## Рекомендации

- Использовать Composition API
- Использовать <script setup>
- Выносить логику в composables
- Использовать TypeScript

## Миграция на Composition API

- Option API → Composition API
- Mixins → Composables
- this → props/refs
- Filters → Computed
