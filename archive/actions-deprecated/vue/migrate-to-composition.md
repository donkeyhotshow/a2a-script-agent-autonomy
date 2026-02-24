# migrate-to-composition

| Параметр | Значение |
|----------|----------|
| actionId | migrate-to-composition |
| categoryId | vue |
| executorSystemId | agent |
| title | Миграция на Composition API |
| canMigrateToScript | ⏳ |

## Описание

Агент выполняет автоматическую или полуавтоматическую миграцию Vue компонентов с Options API на Composition API.

## Процесс миграции

### Этап 1: Анализ
- Определение всех options
- Анализ зависимостей (mixins, composables)
- Определение реактивных данных
- Анализ lifecycle hooks

### Этап 2: Трансформация
- Перевод data() в ref/reactive
- Перевод methods в функции
- Перевод computed
- Перевод watch
- Перевод lifecycle hooks

### Этап 3: Рефакторинг
- Использование <script setup>
- Вынос логики в composables
- Типизация с TypeScript

## Пример миграции

### До
```
vue
<script>
export default {
  data() {
    return {
      count: 0,
      items: []
    }
  },
  computed: {
    doubled() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    this.loadData()
  }
}
</script>
```

### После
```
vue
<script setup>
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const items = ref([])

const doubled = computed(() => count.value * 2)

const increment = () => {
  count.value++
}

const loadData = () => {
  // загрузка данных
}

onMounted(() => {
  loadData()
})
</script>
```

## Требования

- Полное покрытие тестами
- Понимание логики компонента
- Тестирование после миграции
- Поэтапный подход

## Риски

- Поломка функциональности
- Потеря реактивности
- Проблемы с TypeScript
- Необходимость переписывания тестов
