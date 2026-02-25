# Утилиты для работы с Web Storage (`storage.js`)

Этот файл (`resources/common/managers/imports/storage.js`) содержит набор утилитарных функций для упрощения работы с Web
Storage API (`localStorage` и `sessionStorage`). Функции обеспечивают автоматическое преобразование данных в/из JSON и
базовую обработку ошибок.

Эти утилиты используются различными менеджерами (например, `ThemeManager`) для сохранения и загрузки настроек или
состояния между сессиями пользователя.

## Функции

### `getItem(key, defaultValue = null, storage = localStorage)`

Получает значение из указанного хранилища (`storage`, по умолчанию `localStorage`) по ключу (`key`).

- **`key`** (String): Ключ, по которому нужно получить значение.
- **`defaultValue`** (Any, опционально): Значение, которое будет возвращено, если ключ не найден или произошла ошибка
  при парсинге JSON. По умолчанию `null`.
- **`storage`** (Storage, опционально): Объект хранилища (`localStorage` или `sessionStorage`). По умолчанию
  `localStorage`.

**Возвращает:** Распарсенное значение из хранилища или `defaultValue`.

**Логика:**

1. Получает строковое значение по ключу из `storage`.
2. Если значение существует, пытается распарсить его как JSON.
3. Если значение не существует или парсинг неудачен (хотя текущая реализация не обрабатывает ошибку парсинга явно, а
   только ошибку `getItem`), возвращает `defaultValue`.
4. Возвращает распарсенное значение.

```javascript
import { getItem } from './imports/storage.js';

const userPreferences = getItem('userPrefs', { theme: 'light' });
const sessionData = getItem('sessionToken', null, sessionStorage);
```

### `setItem(key, value, storage = localStorage)`

Сохраняет значение (`value`) в указанное хранилище (`storage`) по ключу (`key`).

- **`key`** (String): Ключ, по которому нужно сохранить значение.
- **`value`** (Any): Значение для сохранения. Будет преобразовано в JSON строку.
- **`storage`** (Storage, опционально): Объект хранилища (`localStorage` или `sessionStorage`). По умолчанию
  `localStorage`.

**Логика:**

1. Преобразует `value` в JSON строку с помощью `JSON.stringify()`.
2. Сохраняет полученную строку в `storage` по ключу `key`.
3. В случае ошибки при сохранении (например, превышение квоты), выводит ошибку в консоль.

```javascript
import { setItem } from './imports/storage.js';

const newPrefs = { theme: 'dark', fontSize: 16 };
setItem('userPrefs', newPrefs);
setItem('lastActivity', Date.now(), sessionStorage);
```

### `removeItem(key, storage = localStorage)`

Удаляет значение из указанного хранилища (`storage`) по ключу (`key`).

- **`key`** (String): Ключ, который нужно удалить.
- **`storage`** (Storage, опционально): Объект хранилища (`localStorage` или `sessionStorage`). По умолчанию
  `localStorage`.

**Логика:**

1. Вызывает метод `removeItem()` у объекта `storage` с указанным `key`.
2. В случае ошибки выводит ее в консоль.

```javascript
import { removeItem } from './imports/storage.js';

removeItem('sessionToken', sessionStorage);
removeItem('obsoleteSetting');
```

### `clearStorage(storage = localStorage)`

Полностью очищает указанное хранилище (`storage`).

- **`storage`** (Storage, опционально): Объект хранилища (`localStorage` или `sessionStorage`), который нужно очистить.
  По умолчанию `localStorage`.

**Логика:**

1. Вызывает метод `clear()` у объекта `storage`.
2. В случае ошибки выводит ее в консоль.

```javascript
import { clearStorage } from './imports/storage.js';

// Очистить localStorage
clearStorage();

// Очистить sessionStorage
clearStorage(sessionStorage);
```

## Использование

Эти функции импортируются и используются там, где требуется персистентное хранение данных на стороне клиента:

```javascript
import * as storageUtil from './imports/storage.js';

// Пример в менеджере
class SomeManager {
  constructor() {
    this.settings = storageUtil.getItem('someManagerSettings', {});
  }

  saveSetting(key, value) {
    this.settings[key] = value;
    storageUtil.setItem('someManagerSettings', this.settings);
  }
}
```

## Файл реализации

`resources/common/managers/imports/storage.js`

<!-- mirror-status: outdated -->
<!-- source-size: 1131 -->

