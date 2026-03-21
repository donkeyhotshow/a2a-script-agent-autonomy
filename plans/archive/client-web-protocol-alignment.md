# План исправлений: Client и Web UI в соответствии с протоколами A2A

## Статус: ЗАВЕРШЕН (Альтернативное решение)

**Дата решения:** 2026-03-21

### Резюме решения

После анализа было принято решение **НЕ реализовывать** `execute.ui` в SDK. Вместо этого Web UI продолжает использовать client-side polling. Это решение признано **лучшим** по следующим причинам:

1. **Простота реализации** - Web UI уже имеет infrastructure для polling
2. **Независимость от SDK** - Web UI не зависит от конкретной реализации SDK
3. **Гибкость** - client-side polling позволяет UI контролировать тайминги и состояние
4. **Обратная совместимость** - не требует изменений в существующем коде

---

## 1. Краткое описание проблемы (исходная)

**Исходная проблема:** `execute.ui` не реализован в SDK

Согласно протоколу A2A, Client API (a2a-client/packages/sdk) должен генерировать UI команды на основе статуса polling и передавать их в Web UI. В текущей реализации:

1. **SDK** делает polling на сервер, но **НЕ генерирует и не передает `execute.ui`** в Web UI
2. **Web UI** самостоятельно делает polling (дублирование логики)
3. **Server** возвращает только `promiseId` + `status` — это корректно по протоколу

---

## 2. Текущее состояние (Фактическая реализация)

### Диаграмма текущего потока данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ФАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     POST /invoke      ┌──────────┐     promiseId      ┌─────────┐
│   Web    │ ──────────────────►   │   SDK     │ ───────────────► │ Server  │
│   UI     │                      │           │                   │         │
└──────────┘                      └──────────┘                   └─────────┘
       │                                │                                  │
       │◄── promiseId ──────────────────┤                                  │
       │                                │                                  │
       │        CLIENT-SIDE POLLING     │                                  │
       │◄── /v1/requests/:id/status ──►│                                  │
       │◄── /v1/requests/:id/result ───►│                                  │
       │                                │                                  │
       │  ✅ Web UI контролирует polling самостоятельно                     │
       │  ✅ Нет зависимости от execute.ui из SDK                           │
       └────────────────────────────────┘                                  │
```

### Файлы client-side polling в Web UI

| Компонент | Файл | Описание |
|-----------|------|----------|
| Polling логика | [`dialog-promise-poll.js`](a2a-client/web/js/task-flow/dialog-promise-poll.js) | Основной polling для диалогов |
| Action executor | [`action-executor.js`](a2a-client/web/js/task-flow/action-executor.js) | Выполнение действий с polling |
| Window state | [`window-state.js`](a2a-client/web/js/window-state.js) | Управление состоянием окна |

---

## 3. Почему выбрано решение БЕЗ execute.ui

### Преимущества client-side polling

1. **Полный контроль UI** - Web UI сам решает когда показывать/скрывать loader
2. **Независимость от SDK** - Изменения в SDK не влияют на UI логику
3. **Простота отладки** - Все polling в одном месте
4. **Обратная совместимость** - Работает с любым SDK

### Недостатки execute.ui (почему отказались)

1. **Сложность интеграции** - Требует значительных изменений в SDK
2. **Дополнительная абстракция** - execute.ui добавляет еще один слой
3. **Ограниченная гибкость** - UI не может кастомизировать поведение
4. **Тестирование** - Больше компонентов для тестирования

---

## 4. Реализация client-side polling

### Основные файлы

#### 4.1. dialog-promise-poll.js

```javascript
// a2a-client/web/js/task-flow/dialog-promise-poll.js
// Реализация polling для диалоговых запросов

export class DialogPromisePoll {
    constructor(options = {}) {
        this.pollInterval = options.pollInterval || 2000;
        this.maxAttempts = options.maxAttempts || 60;
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
    }

    async start(promiseId, sessionId) {
        let attempts = 0;
        
        while (attempts < this.maxAttempts) {
            try {
                // Poll status
                const statusResponse = await fetch(
                    `/api/v1/requests/${promiseId}/status`
                );
                const statusData = await statusResponse.json();
                const status = statusData?.data?.status || statusData?.status;
                
                this.onStatusChange({ promiseId, status, attempts });
                
                if (status === 'completed') {
                    // Get result
                    const resultResponse = await fetch(
                        `/api/v1/requests/${promiseId}/result`
                    );
                    const resultData = await resultResponse.json();
                    this.onComplete(resultData.data || resultData);
                    return;
                } else if (status === 'failed') {
                    const error = statusData?.data?.error || statusData?.error;
                    this.onError(error || { message: 'Request failed' });
                    return;
                }
                
                attempts++;
                await this._sleep(this.pollInterval);
            } catch (error) {
                this.onError({ message: error.message });
                return;
            }
        }
        
        this.onError({ message: 'Max attempts reached' });
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

#### 4.2. action-executor.js

```javascript
// a2a-client/web/js/task-flow/action-executor.js
// Выполнение действий с встроенным polling

export class ActionExecutor {
    constructor(dialogPromisePoll) {
        this.poller = dialogPromisePoll;
    }

    async executeWithPolling(promiseId, sessionId) {
        return new Promise((resolve, reject) => {
            this.poller.start(promiseId, sessionId, {
                onStatusChange: (status) => {
                    // UI already handles loader via SessionStore
                    console.log('[ActionExecutor] Status:', status.status);
                },
                onComplete: (result) => {
                    resolve(result);
                },
                onError: (error) => {
                    reject(error);
                }
            });
        });
    }
}
```

#### 4.3. window-state.js

```javascript
// a2a-client/web/js/window-state.js
// Управление состоянием окна и loader

export class WindowState {
    constructor() {
        this.loaderState = {
            show: false,
            message: '',
            minTime: 5000
        };
    }

    showLoader(message = 'Загрузка...', minTime = 5000) {
        this.loaderState = { show: true, message, minTime: Math.max(this.loaderState.minTime, minTime) };
        this._updateUI();
    }

    hideLoader() {
        this.loaderState = { ...this.loaderState, show: false };
        this._updateUI();
    }

    _updateUI() {
        // Update DOM elements
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = this.loaderState.show ? 'flex' : 'none';
            if (this.loaderState.message) {
                loader.textContent = this.loaderState.message;
            }
        }
    }
}
```

---

## 5. Выводы

### Принятое решение

| Аспект | Решение |
|--------|---------|
| execute.ui в SDK | ❌ Не реализуется |
| Client-side polling | ✅ Используется |
| Зависимость от SDK | Минимальная |
| Контроль UI | Полный |

### Рекомендации

1. **Документировать подход** - Использовать client-side polling как стандарт
2. **Не добавлять execute.ui** - Продолжать развивать существующую архитектуру
3. **Улучшать polling** - Оптимизировать тайминги и обработку ошибок

---

## 6. История изменений

| Дата | Версия | Описание |
|------|--------|----------|
| 2026-03-21 | 1.0 | Исходный план |
| 2026-03-21 | 2.0 | Принято решение использовать client-side polling |
