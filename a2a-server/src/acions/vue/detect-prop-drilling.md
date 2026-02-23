# detect-prop-drilling

| Параметр | Значение |
|----------|----------|
| actionId | detect-prop-drilling |
| categoryId | vue |
| executorSystemId | script |
| title | Детекция prop drilling |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование Vue компонентов для обнаружения проблемы prop drilling (передача пропсов через множество уровней).

## Что обнаруживается

- Props передаваемые через 3+ уровня
- Props не используемые на промежуточных уровнях
- Компоненты-"прокладки"
- Слишком много props на компонентах

## Пример проблемы

```
vue
<!-- Level 1 -->
<Parent :user="user" :posts="posts" :comments="comments" />

<!-- Level 2 -->
<Child :user="user" :posts="posts" :comments="comments" />

<!-- Level 3 -->
<GrandChild :user="user" :posts="posts" :comments="comments" />
<!-- user и comments не используются в Child -->
```

## Рекомендуемые решения

### 1. Provide/Inject
```
javascript
// Parent
provide('user', user)

// Child (любой уровень)
const user = inject('user')
```

### 2. Pinia Store
```
javascript
// store/user.js
export const useUserStore = defineStore('user', () => {
  return { user }
})

// Any component
const userStore = useUserStore()
```

### 3. Event Bus /mitt
```
javascript
// Отправка событий без props
```

## Инструменты

- ESLint plugin vue
- Custom static analysis
- Vue DevTools
