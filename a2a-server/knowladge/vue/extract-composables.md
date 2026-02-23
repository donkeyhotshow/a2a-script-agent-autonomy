# extract-composables

| Параметр | Значение |
|----------|----------|
| actionId | extract-composables |
| categoryId | vue |
| executorSystemId | agent |
| title | Извлечение composables |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует Vue компоненты и выделяет повторяющуюся логику в отдельные composables.

## Что выносится в composables

- Логика работы с API
- Работа с формами
- Валидация
- Локальное состояние
- Логика фильтрации/сортировки
- Работа с localStorage
- Аутентификация

## Пример выделения

### До (в компоненте)
```
javascript
const users = ref([])
const loading = ref(false)
const error = ref(null)

const fetchUsers = async () => {
  loading.value = true
  try {
    users.value = await api.get('/users')
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}
```

### После (composable)
```
javascript
// composables/useFetch.js
export function useFetch(url) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetch = async () => {
    loading.value = true
    try {
      data.value = await api.get(url)
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetch }
}
```

## Структура composable

```
javascript
export function useFeature() {
  // State
  const state = ref(initial)
  
  // Computed
  const computed = computed(() => {})
  
  // Methods
  const method = () => {}
  
  // Lifecycle
  onMounted(() => {})
  
  return {
    state,
    computed,
    method
  }
}
```

## Best practices

- Именование с use* префиксом
- Одна ответственность
- Документация
- Типизация
- Тестируемость
