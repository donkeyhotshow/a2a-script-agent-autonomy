 # suggest-store

| Параметр | Значение |
|----------|----------|
| actionId | suggest-store |
| categoryId | vue |
| executorSystemId | agent |
| title | Предложение Pinia store |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует компоненты и предлагает использование Pinia store для управления глобальным состоянием.

## Когда нужен Store

- Данные используются в нескольких компонентах
- Сложное состояние с бизнес-логикой
- Состояние должно персистировать между страницами
- Кэширование данных
- Аутентификация и авторизация
- Тема/настройки приложения
- Корзина покупок

## Примеры предложений

### Аутентификация
```
javascript
// store/auth.js
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    async login(credentials) {
      // логика входа
    },
    logout() {
      // логика выхода
    }
  }
})
```

### Настройки
```
javascript
// store/settings.js
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'light',
    language: 'en',
    sidebarOpen: true
  }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    }
  }
})
```

## Best practices

- Один store = одна ответственность
- Использовать composition store (Pinia 3+)
- Getters для вычисляемых значений
- Actions для асинхронных операций
- Plugins для персистенции
