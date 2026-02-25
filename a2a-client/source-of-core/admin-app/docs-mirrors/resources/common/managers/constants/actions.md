# Документация действий

В этом документе описаны стандартные действия, используемые в приложении через `ACTIONS`. Эти действия обрабатываются в
ActionManager и позволяют выполнять операции в ответ на события пользовательского интерфейса.

## Структура стандартного действия

Каждое стандартное действие имеет следующую структуру:

```javascript
{
  name: 'actionName',       // Имя действия для использования
  modules: ['$hub.$module'], // Модули, которые должны обрабатывать действие
  level: 'info',            // Уровень логирования (info, debug, warn, error, success)
  requiresPayload: true,    // Требуется ли дополнительные данные (опционально)
  options: {                // Дополнительные опции (опционально)
    debug: true,            // Выводить ли отладочную информацию
    showToast: true,        // Показывать ли уведомление
    logLevel: 'info'        // Уровень логирования
  }
}
```

## Категории действий

### Действия диалоговых окон

| Ключ         | Имя действия | Модули                 | Уровень | Описание                  |
|--------------|--------------|------------------------|---------|---------------------------|
| DIALOG_OPEN  | dialogOpened | $hub.$log, $hub.$toast | info    | Открытие диалогового окна |
| DIALOG_CLOSE | dialogClosed | $hub.$log, $hub.$toast | info    | Закрытие диалогового окна |

### Действия отправки данных

| Ключ       | Имя действие | Модули                 | Уровень | Требует данные | Опции                                          | Описание               |
|------------|--------------|------------------------|---------|----------------|------------------------------------------------|------------------------|
| SEND_DATA  | sendData     | $hub.$log, $hub.$toast | info    | Да             | debug: true, showToast: true                   | Отправка данных        |
| SEND_BATCH | sendBatch    | $hub.$log, $hub.$toast | info    | Нет            | debug: true, showToast: true, logLevel: 'info' | Отправка пакета данных |

### Действия темы

| Ключ         | Имя действие | Модули            | Уровень | Описание       |
|--------------|--------------|-------------------|---------|----------------|
| THEME_CHANGE | themeChange  | $hub.themeManager | info    | Изменение темы |

## Примеры использования

### Выполнение действия

```javascript
// Через ActionManager
hub.actionManager.execute('DIALOG_OPEN', { id: 'userForm' });

// Или с использованием имени действия
hub.actionManager.executeByName('dialogOpened', { id: 'userForm' });

// С использованием контекста
hub.actionManager.executeWithContext('SEND_DATA', { data: formData }, { 
  component: this,
  event: 'submit'
});
```

### Регистрация обработчика действия

```javascript
// Регистрация обработчика для действия
hub.actionManager.register('DIALOG_OPEN', (payload, context) => {
  const { id } = payload;
  console.log(`Открытие диалога: ${id}`);
  hub.modalManager.open(id);
});

// Регистрация обработчика по имени действия
hub.actionManager.registerByName('sendData', (payload, context) => {
  const { url, data } = payload;
  hub.apiManager.post(url, data);
});
```

## Связь с событиями

Действия могут вызываться в ответ на события, определенные в `STANDARD_EVENTS`. Например:

```javascript
// Подписка на событие и выполнение действия
hub.notifyManager.on('formSubmit', (formData) => {
  hub.actionManager.execute('SEND_DATA', {
    url: '/api/submit',
    data: formData
  });
});

// Связывание события и действия через ActionManager
hub.actionManager.bindToEvent('FORM_SUBMIT', 'SEND_DATA', (eventData) => {
  return {
    url: '/api/submit',
    data: eventData
  };
});
```

## Расширение списка стандартных действий

При добавлении новых стандартных действий следует придерживаться следующих правил:

1. Использовать осмысленные имена в формате UPPER_SNAKE_CASE для ключей
2. Использовать camelCase для имен действий
3. Указывать релевантные модули для обработки действия
4. Выбирать подходящий уровень логирования
5. Указывать, требует ли действие дополнительные данные
6. Добавлять необходимые опции для настройки обработки действия

## Связанные файлы

- [Константы событий (events.js)](./events.md)

<!-- mirror-status: outdated -->
<!-- source-size: 936 -->

