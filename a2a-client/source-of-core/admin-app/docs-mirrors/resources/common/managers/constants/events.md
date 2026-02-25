# Документация стандартных событий

В этом документе описаны стандартные события, используемые в приложении через `STANDARD_EVENTS`. Эти события
обрабатываются в HubManager и используются для коммуникации между различными частями приложения.

## Структура стандартного события

Каждое стандартное событие имеет следующую структуру:

```javascript
{
  name: 'eventName',        // Имя события для использования в emit/on
  modules: ['$hub.$module'], // Модули, которые должны обрабатывать событие
  level: 'info',            // Уровень логирования (info, debug, warn, error, success)
  options: {                // Дополнительные опции (опционально)
    toast: true,            // Показывать ли уведомление
    toastDuration: 3000,    // Длительность уведомления в мс
    toastPosition: 'top-right', // Позиция уведомления
    debug: true,            // Выводить ли отладочную информацию
    logLevel: 'info'        // Уровень логирования
  }
}
```

## Категории событий

### События логирования

| Ключ      | Имя события | Модули                 | Уровень | Описание                          |
|-----------|-------------|------------------------|---------|-----------------------------------|
| LOG_NEW   | newLog      | $hub.$log              | info    | Новая запись в лог                |
| LOG_CLEAR | clearLogs   | $hub.$log              | info    | Очистка логов                     |
| LOG_ERROR | logError    | $hub.$log, $hub.$toast | error   | Логирование ошибки                |
| LOG_DEBUG | logDebug    | $hub.$log, $hub.$toast | debug   | Логирование отладочной информации |
| LOG_INFO  | logInfo     | $hub.$log              | info    | Логирование информации            |
| LOG_WARN  | logWarn     | $hub.$log, $hub.$toast | warn    | Логирование предупреждения        |

### События компонентов

| Ключ              | Имя события      | Модули    | Уровень | Описание              |
|-------------------|------------------|-----------|---------|-----------------------|
| COMPONENT_MOUNTED | componentMounted | $hub.$log | info    | Компонент смонтирован |
| COMPONENT_UPDATED | componentUpdated | $hub.$log | info    | Компонент обновлен    |

### События форм

| Ключ         | Имя события | Модули                 | Уровень | Описание               |
|--------------|-------------|------------------------|---------|------------------------|
| FORM_SUBMIT  | formSubmit  | $hub.$log, $hub.$toast | info    | Отправка формы         |
| FORM_CHANGE  | formChange  | $hub.$log              | info    | Изменение данных формы |
| SAVE_SUCCESS | saveSuccess | $hub.$log, $hub.$toast | success | Успешное сохранение    |
| SAVE_ERROR   | saveError   | $hub.$log, $hub.$toast | error   | Ошибка сохранения      |

### События окон и интерфейса

| Ключ              | Имя события      | Модули    | Уровень | Описание                   |
|-------------------|------------------|-----------|---------|----------------------------|
| WINDOW_ADD        | addWindow        | $hub.$log | info    | Добавление окна            |
| WINDOW_ADDED      | windowAdded      | $hub.$log | info    | Окно добавлено             |
| WINDOW_REMOVE     | removeWindow     | $hub.$log | info    | Удаление окна              |
| CONTEXT_MENU_OPEN | openContextMenu  | $hub.$log | info    | Открытие контекстного меню |
| CHAT_RESPONSE     | saveChatResponse | $hub.$log | info    | Ответ чата сохранен        |

### События HTTP запросов

| Ключ             | Имя события     | Модули                 | Уровень | Опции                      | Описание           |
|------------------|-----------------|------------------------|---------|----------------------------|--------------------|
| REQUEST_START    | requestStart    | $hub.$log              | info    | toast: false               | Начало запроса     |
| REQUEST_SUCCESS  | requestSuccess  | $hub.$log, $hub.$toast | success | toastDuration: 3000        | Успешный запрос    |
| REQUEST_ERROR    | requestError    | $hub.$log, $hub.$toast | error   | toastPosition: 'top-right' | Ошибка запроса     |
| REQUEST_COMPLETE | requestComplete | $hub.$log              | info    | -                          | Завершение запроса |

### События пакетной обработки

| Ключ           | Имя события   | Модули    | Уровень | Описание                      |
|----------------|---------------|-----------|---------|-------------------------------|
| BATCH_START    | batchStart    | $hub.$log | debug   | Начало пакетной обработки     |
| BATCH_COMPLETE | batchComplete | $hub.$log | info    | Завершение пакетной обработки |

## Примеры использования

### Подписка на события через NotifyManager

```javascript
// Подписка на событие
hub.notifyManager.on('requestSuccess', (response) => {
  console.log('Запрос успешно выполнен:', response);
});

// Или через код стандартного события
hub.notifyManager.on(STANDARD_EVENTS.REQUEST_SUCCESS.name, (response) => {
  console.log('Запрос успешно выполнен:', response);
});
```

### Генерация события

```javascript
// Через NotifyManager
hub.notifyManager.emit('requestSuccess', { data: 'результат запроса' });

// Через HubManager
hub.handleStandardEvent('REQUEST_SUCCESS', { data: 'результат запроса' });
```

## Расширение списка стандартных событий

При добавлении новых стандартных событий следует придерживаться следующих правил:

1. Использовать осмысленные имена в формате UPPER_SNAKE_CASE для ключей
2. Использовать camelCase для имен событий
3. Указывать релевантные модули для обработки события
4. Выбирать подходящий уровень логирования
5. Добавлять необходимые опции для настройки обработки события

## Связанные файлы

- [Константы действий (actions.js)](./actions-documentation.md)
- [Документация HubManager](../managers/hub/hubManager.md)
- [Документация NotifyManager](../managers/other/notifyManager.md)

<!-- mirror-status: outdated -->
<!-- source-size: 2515 -->

