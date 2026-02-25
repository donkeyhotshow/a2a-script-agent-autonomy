# Общие константы приложения

Этот документ содержит описание общих констант, используемых в приложении. Константы определены в файле
`resources/common/managers/constants/constants.js` и предоставляют доступ к стандартным значениям, используемым в
различных частях приложения.

## Структура констант

Константы организованы в объект `CONSTANTS`, который содержит вложенные объекты, сгруппированные по категориям:

```javascript
export const CONSTANTS = {
    THEMES: {
        // константы для тем
    },
    RBAC: {
        // константы для ролей
    },
    // другие категории констант
};
```

## Категории констант

### Константы тем (THEMES)

Константы, определяющие доступные темы оформления приложения.

| Константа     | Значение | Описание                |
|---------------|----------|-------------------------|
| `THEMES.AURA` | `'aura'` | Идентификатор темы Aura |
| `THEMES.LARA` | `'lara'` | Идентификатор темы Lara |

### Константы ролей (RBAC)

Константы, определяющие роли пользователей в системе управления доступом на основе ролей (RBAC).

| Константа    | Значение  | Описание                                    |
|--------------|-----------|---------------------------------------------|
| `RBAC.ADMIN` | `'admin'` | Роль администратора с максимальными правами |
| `RBAC.USER`  | `'user'`  | Стандартная роль пользователя               |

## Примеры использования

### Проверка текущей темы

```javascript
import { CONSTANTS } from '@/resources/common/managers/constants/constants';

export default {
  name: 'ThemeController',
  methods: {
    isAuraTheme() {
      return this.$theme.current === CONSTANTS.THEMES.AURA;
    },
    isLaraTheme() {
      return this.$theme.current === CONSTANTS.THEMES.LARA;
    }
  }
}
```

### Проверка роли пользователя

```javascript
import { CONSTANTS } from '@/resources/common/managers/constants/constants';

export default {
  name: 'UserAccessControl',
  methods: {
    hasAdminAccess() {
      return this.userRole === CONSTANTS.RBAC.ADMIN;
    },
    hasUserAccess() {
      return this.userRole === CONSTANTS.RBAC.USER;
    }
  }
}
```

## Интеграция с другими модулями

### Интеграция с ThemeManager

Константы тем используются совместно с ThemeManager для управления темами приложения:

```javascript
import { CONSTANTS } from '@/resources/common/managers/constants/constants';
import { hub } from '@/resources/common/managers/hub/HubManager';

// Переключение на тему Aura
hub.themeManager.setTheme(CONSTANTS.THEMES.AURA);
```

### Интеграция с ActionManager

Константы могут использоваться в контексте действий через ActionManager:

```javascript
import { CONSTANTS } from '@/resources/common/managers/constants/constants';
import { hub } from '@/resources/common/managers/hub/HubManager';

// Выполнение действия с передачей роли
hub.actionManager.execute('CHECK_PERMISSION', { role: CONSTANTS.RBAC.ADMIN });
```

## Рекомендации по использованию

1. **Всегда используйте константы вместо строковых литералов** для значений тем, ролей и других стандартных
   идентификаторов.
2. **Импортируйте только необходимые константы**, чтобы избежать лишней зависимости.
3. **Централизуйте модификации констант** в одном месте для упрощения обслуживания.
4. **Документируйте любые изменения** в константах, так как они могут повлиять на работу различных частей приложения.

## Связанные документы

- [Документация констант событий](./events-documentation.md)
- [Документация констант действий](./actions-documentation.md)

<!-- mirror-status: outdated -->
<!-- source-size: 169 -->

