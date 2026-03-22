/**
 * ActionExecutor - Выполнение действий (взаимодействие с API)
 * 
 * Осуществляет:
 * - Отправку результатов на сервер (submit)
 * - Проверку статуса промисов (checkPromise)
 * - Управление polling-ом для асинхронных операций
 * 
 * Использует ActionParser и ActionValidator для подготовки и проверки данных
 */

(function (global) {
    'use strict';

    if (typeof global.resolveStore !== 'function') {
        throw new Error('[ActionExecutor] Load js/task-flow/utils.js before action-executor.js');
    }

    const POLL_INTERVAL =
        typeof global.PROMISE_POLL_INTERVAL === 'number' && global.PROMISE_POLL_INTERVAL > 0
            ? global.PROMISE_POLL_INTERVAL
            : global.__a2aDaemons.timingMs('PROMISE_POLL_INTERVAL');

    /**
 * Получает базовый API URL с учетом пути к API
 * @param {Object} store - хранилище сессии
 * @returns {string} базовый URL с учетом пути к API
 */
function _getApiBase(store) {
    const api = global.apiIntegration;
    if (!store || typeof store.getStorageMode !== 'function') {
        throw new Error('[ActionExecutor] SessionStore with getStorageMode() required');
    }
    const storageMode = store.getStorageMode();
    if (storageMode === 'storage') {
        return window.location.origin + '/api/a2a';
    }
    if (!api?.apiBase) {
        throw new Error('[ActionExecutor] apiIntegration.apiBase required when storageMode is not "storage"');
    }
    return String(api.apiBase).replace(/\/?$/, '') + '/api';
}

    /**
     * Создает заголовки для запроса
     * @returns {Object} заголовки запроса
     */
    function _createHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (global.apiIntegration?.token) {
            headers['Authorization'] = `Bearer ${global.apiIntegration.token}`;
        }
        return headers;
    }

    /**
     * Выполняет HTTP запрос
     * @param {string} url - URL запроса
     * @param {Object} options - параметры fetch
     * @returns {Promise<Object>} данные ответа
     */
    async function _fetchJson(url, options) {
        const res = await fetch(url, options);
        
        let data = {};
        try {
            const text = await res.text();
            if (text) {
                data = JSON.parse(text);
            }
        } catch (e) {
            console.error('[ActionExecutor] JSON parse error:', e);
            throw e;
        }
        
        if (!res.ok) {
            const err = data?.error;
            const msg =
                typeof err === 'string'
                    ? err
                    : err && typeof err === 'object' && err.message
                      ? String(err.message)
                      : null;
            throw new Error(msg || `Request failed: ${res.status}`);
        }
        
        return data;
    }

    /**
     * Hydrate store from GET /sessions/:id (authoritative after minimal POST /next ack).
     * @param {{ skipExecuteWhenPending?: boolean }} [opts] — if true, skip setExecute while snap.asyncPending (setExecute clears promisePending).
     */
    async function pullSessionSnapshot(sessionId, store, opts = {}) {
        const api = global.apiIntegration;
        if (!api?.getSession || !store) {
            throw new Error('[ActionExecutor] pullSessionSnapshot requires apiIntegration.getSession and store');
        }
        const snap = await api.getSession(sessionId);
        const sid = snap.id || snap.sessionId;
        if (sid) store.setSession?.(sid, snap.projectId);
        if (Array.isArray(snap.messages) && snap.messages.length > 0) {
            store.applyServerMessages?.(snap.messages);
        }
        if (!(opts.skipExecuteWhenPending && snap.asyncPending) && snap.execute != null) {
            store.setExecute?.(snap.execute);
        }
        if (snap.context != null) store.setContext?.(snap.context);
        return snap;
    }

    /**
     * Отправляет результат в сессию - запуск обработки шага
     * Сохраняет client-result.json и создает следующий шаг через API
     * 
     * @param {string} sessionId - ID сессии
     * @param {Object} result - результат от пользователя
     * @returns {Promise<Object>} ответ сервера
     */
    async function submit(sessionId, result, storeOverride) {
        const store = storeOverride || global.resolveStore(sessionId);
        // Use apiIntegration._fetch which handles URL building and headers
        const data = await global.apiIntegration._fetch(`sessions/${encodeURIComponent(sessionId)}/next`, {
            method: 'POST',
            body: JSON.stringify({ result })
        });
        
        // POST /next ack: asyncPending (+ legacy promiseId) — hydrate via GET session; poll GET .../async
        const asyncPending = !!(data?.asyncPending ?? data?.promiseId);
        if (store && data?.success && data?.accepted) {
            if (asyncPending) {
                store.setPromisePending?.(true);
                if (typeof sessionId === 'string') {
                    store.startLoader?.(sessionId);
                } else {
                    store.startLoader?.();
                }
                startPromisePolling(sessionId, null); // promiseId is handled by apiIntegration
                await pullSessionSnapshot(sessionId, store, { skipExecuteWhenPending: true });
            } else {
                await pullSessionSnapshot(sessionId, store);
            }
        }
        
        return data;
    }



    /**
     * Проверяет статус промиса - опрашивает A2A Server для асинхронного результата
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     * @returns {Promise<Object|null>} статус промиса или null при ошибке
     */
    async function checkPromise(sessionId, promiseId) {
        // Use apiIntegration._fetch directly
        return global.apiIntegration._fetch(`sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`);
    }

    /** Session-scoped async poll — Client API resolves transport id server-side */
    async function checkSessionAsync(sessionId) {
        // Use apiIntegration._fetch directly
        return global.apiIntegration._fetch(`sessions/${encodeURIComponent(sessionId)}/async`);
    }

    /**
     * Запускает polling для разрешения промиса
     * Использует SessionStore если доступно, иначе локальный polling
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     */
    function startPromisePolling(sessionId, promiseId) {
        const store = global.resolveStore(sessionId);
        const sessionScoped = !promiseId;

        if (store?.startPromisePolling) {
            if (!sessionScoped && store.setPromiseId) {
                store.setPromiseId(promiseId);
            }

            const checkFn = sessionScoped
                ? () => checkSessionAsync(sessionId)
                : (pid) => checkPromise(sessionId, pid);

            store.startPromisePolling(checkFn, { sessionScoped });

            const onResolved = (data) => {
                if (!(data.sessionScoped || data.promiseId === promiseId)) return;
                pullSessionSnapshot(sessionId, store).then(() => {
                    store.setPromisePending?.(false);
                    store.stopLoader?.(sessionId);
                    global.apiIntegration?.emit?.('promiseResolved', {
                        sessionId,
                        promiseId: data.promiseId ?? promiseId ?? null,
                        sessionScoped: !!data.sessionScoped,
                        result: data.result,
                        execute: data.execute,
                    });
                });
            };

            const onRejected = (data) => {
                if (!(data.sessionScoped || data.promiseId === promiseId)) return;
                store.setPromisePending?.(false);
                store.stopLoader?.(sessionId);
                global.apiIntegration?.emit?.('promiseError', {
                    sessionId,
                    promiseId: data.promiseId ?? promiseId ?? null,
                    sessionScoped: !!data.sessionScoped,
                    error: data.error || 'Promise failed',
                });
            };

            store.on?.('promiseResolved', onResolved);
            store.on?.('promiseError', onRejected);

            return;
        }
        
    }

    /**
     * Отправляет сообщение в сессию
     * 
     * @param {string} sessionId - ID сессии
     * @param {string|Object} message - текст сообщения или объект
     * @returns {Promise<Object>} ответ сервера
     */
    async function sendMessage(sessionId, message, storeOverride) {
        const messageText =
            typeof message === 'string'
                ? message
                : (message?.content ?? String(message ?? ''));
        return submit(sessionId, { message: messageText }, storeOverride);
    }

    /**
     * Отправляет выбор в сессию
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} choiceId - ID выбора
     * @returns {Promise<Object>} ответ сервера
     */
    async function sendChoice(sessionId, choiceId, storeOverride) {
        return submit(sessionId, { choice: choiceId }, storeOverride);
    }

    // Экспорт модуля
    const ActionExecutor = {
        submit,
        sendMessage,
        sendChoice,
        checkPromise,
        checkSessionAsync,
        startPromisePolling,
        pullSessionSnapshot,
        POLL_INTERVAL
    };

    if (typeof window !== 'undefined') {
        window.ActionExecutor = ActionExecutor;
    }
    global.ActionExecutor = ActionExecutor;

})(typeof window !== 'undefined' ? window : globalThis);
