# Data Utilities

Модуль `data.js` содержит набор базовых утилит для работы с данными. Эти функции используются в различных частях
приложения для обработки, преобразования и валидации данных.

## Назначение

Данный модуль предоставляет низкоуровневые функции для работы с данными и помогает решать следующие задачи:

1. Генерация уникальных идентификаторов
2. Фильтрация и обработка массивов
3. Манипуляции со строками
4. Определение типов объектов
5. Обработка специфических структур данных

## Основные функции

### generateTempId()

Генерирует временный идентификатор на основе случайной строки.

**Возвращает**:

- `String`: Строка случайных символов, используемая как временный идентификатор

**Пример**:

```javascript
const tempId = generateTempId();
// Результат: "tmp_a1b2c3d4"
```

**Реализация**:

```javascript
export function generateTempId() {
    return 'tmp_' + Math.random().toString(36).substr(2, 9);
}
```

### generateId()

Создает криптографически стойкий уникальный идентификатор с использованием `crypto.randomUUID()`.

**Возвращает**:

- `String`: Уникальный UUID (Universal Unique Identifier)

**Пример**:

```javascript
const id = generateId();
// Результат: "123e4567-e89b-12d3-a456-426614174000"
```

**Реализация**:

```javascript
export function generateId() {
    return crypto.randomUUID();
}
```

### onlyUnique(value, index, self)

Функция-предикат для фильтрации массива, оставляющая только уникальные значения.

**Параметры**:

- `value`: Any - текущее значение
- `index`: Number - индекс текущего элемента
- `self`: Array - массив, к которому применяется фильтр

**Возвращает**:

- `Boolean`: true, если это первое вхождение элемента в массив

**Пример**:

```javascript
const numbers = [1, 2, 2, 3, 4, 4, 5];
const uniqueNumbers = numbers.filter(onlyUnique);
// Результат: [1, 2, 3, 4, 5]
```

**Реализация**:

```javascript
export function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
```

### capitalize(str)

Преобразует первую букву строки в верхний регистр.

**Параметры**:

- `str`: String - строка для преобразования

**Возвращает**:

- `String`: Строка с заглавной первой буквой

**Пример**:

```javascript
const capitalized = capitalize('hello world');
// Результат: "Hello world"
```

**Реализация**:

```javascript
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### getIcon(item)

Возвращает название иконки в зависимости от типа элемента.

**Параметры**:

- `item`: Object - объект, для которого нужно определить иконку

**Возвращает**:

- `String`: Имя иконки соответствующее типу элемента

**Пример**:

```javascript
const icon = getIcon({ type: 'directory' });
// Результат: "pi-folder"

const fileIcon = getIcon({ type: 'file' });
// Результат: "pi-file"
```

**Реализация**:

```javascript
export function getIcon(item) {
    switch (item.type) {
        case 'directory': return 'pi-folder';
        case 'file': return 'pi-file';
        case 'variable': return 'pi-circle-fill';
        case 'array-variable': return 'pi-list';
        default: return 'pi-question';
    }
}
```

## Примеры использования

### Фильтрация уникальных значений в массиве

```javascript
import { onlyUnique } from '@common/managers/imports/data.js';

function getUniqueCategories(products) {
    return products
        .map(product => product.category)
        .filter(onlyUnique);
}

const products = [
    { id: 1, name: 'Apple', category: 'Fruit' },
    { id: 2, name: 'Banana', category: 'Fruit' },
    { id: 3, name: 'Carrot', category: 'Vegetable' }
];

const categories = getUniqueCategories(products);
// Результат: ['Fruit', 'Vegetable']
```

### Генерация ID для компонентов

```javascript
import { generateId } from '@common/managers/imports/data.js';

class ComponentManager {
    createComponent(type, config) {
        const componentId = generateId();
        
        const component = {
            id: componentId,
            type,
            config,
            createdAt: new Date()
        };
        
        this.components.set(componentId, component);
        return componentId;
    }
}
```

### Форматирование данных для отображения

```javascript
import { capitalize } from '@common/managers/imports/data.js';

function formatUserName(user) {
    return `${capitalize(user.firstName)} ${capitalize(user.lastName)}`;
}

const user = { firstName: 'john', lastName: 'doe' };
const formattedName = formatUserName(user);
// Результат: "John Doe"
```

### Использование в менеджерах

```javascript
import { generateId, getIcon } from '@common/managers/imports/data.js';

class FileManager extends RegularManager {
    constructor(hub) {
        super(hub);
        this.files = new Map();
    }
    
    addFile(name, content, type = 'text') {
        const fileId = generateId();
        const file = {
            id: fileId,
            name,
            content,
            type,
            icon: getIcon({ type: 'file' }),
            createdAt: new Date()
        };
        
        this.files.set(fileId, file);
        return fileId;
    }
}
```

## Интеграция с другими модулями

Функции из модуля `data.js` используются во многих частях приложения:

1. **RegularManager** - использует `generateId` для создания идентификаторов
2. **StateManager** - применяет функции фильтрации и преобразования данных
3. **ComponentManager** - использует идентификаторы для управления компонентами
4. **NotifyManager** - генерирует идентификаторы для уведомлений
5. **FileManager** - определяет иконки для файлов с помощью `getIcon`

## Рекомендации по расширению

При расширении функциональности модуля `data.js` следуйте этим рекомендациям:

1. **Чистые функции** - функции должны быть чистыми (не иметь побочных эффектов)
2. **Единая ответственность** - каждая функция должна выполнять только одну задачу
3. **Предсказуемость** - поведение функций должно быть детерминированным
4. **Документация** - для новых функций обязательно добавляйте документацию
5. **Тестирование** - покрывайте функции тестами для гарантии их корректности

## Ограничения и особенности

1. **Совместимость с браузерами** - функция `generateId` использует `crypto.randomUUID()`, что может не поддерживаться в
   старых браузерах
2. **Производительность** - при работе с большими массивами следует учитывать особенности реализации `onlyUnique`
3. **Отсутствие локализации** - функция `capitalize` не учитывает языковые особенности и работает только с
   ASCII-символами

## Связанные модули

- [RegularManager](../managers/common/regularManager.md) - базовый класс для менеджеров
- [StateManager](../managers/common/stateManager.md) - управление состоянием компонентов
- [ComponentManager](../managers/common/componentManager.md) - управление компонентами

<!-- mirror-status: outdated -->
<!-- source-size: 705 -->

