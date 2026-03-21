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
     * Получает базовый API URL
     * @param {Object} store - хранилище сессии
     * @returns {string|null} базовый URL
     */
    function getApiBase(store) {
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
        return String(api.apiBase).replace(/\/?$/, '');
    }

    /**
     * Создает заголовки для запроса
     * @param {Object} store - хранилище сессии
     * @returns {Object} заголовки запроса
     */
    function createHeaders(store) {
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
    async function fetchJson(url, options) {
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
        const base = getApiBase(store);
        if (!base) {
            throw new Error('ActionExecutor: API base not configured. Set Client API URL in Settings.');
        }
        
        const storageMode = store.getStorageMode();
        const isStorageMode = storageMode === 'storage';
        
        // For Vite (storage mode), base already includes /api/a2a
        // For client-api, need to add /api
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/next`;
        
        const headers = createHeaders(store);
        
        const data = await fetchJson(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ result })
        });
        
        // POST /next ack: asyncPending (+ legacy promiseId) — hydrate via GET session; poll GET .../async
        const asyncPending = !!(data?.asyncPending ?? data?.promiseId);
        console.log('[ActionExecutor] submit response:', JSON.stringify({success: data?.success, accepted: data?.accepted, asyncPending}));
        if (store && data?.success && data?.accepted) {
            if (asyncPending) {
                console.log('[ActionExecutor] asyncPending is true, starting polling...');
                store.setPromisePending?.(true);
                if (typeof sessionId === 'string') {
                    store.startLoader?.(sessionId);
                } else {
                    store.startLoader?.();
                }
                startPromisePolling(sessionId, isStorageMode ? null : data.promiseId || null);
                await pullSessionSnapshot(sessionId, store, { skipExecuteWhenPending: true });
            } else {
                console.log('[ActionExecutor] asyncPending is false, pulling snapshot directly');
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
        const store = global.resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            throw new Error('[ActionExecutor] API base not configured');
        }

        const storageMode = store.getStorageMode();
        const isStorageMode = storageMode === 'storage';
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            throw new Error(`[ActionExecutor] Promise check failed: HTTP ${res.status}`);
        }

        const text = await res.text();
        return text ? JSON.parse(text) : {};
    }

    /** Session-scoped async poll — Client API resolves transport id server-side */
    async function checkSessionAsync(sessionId) {
        const store = global.resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            throw new Error('[ActionExecutor] API base not configured');
        }
        const storageMode = store.getStorageMode();
        const isStorageMode = storageMode === 'storage';
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/async`;
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) {
            throw new Error(`[ActionExecutor] Session async check failed: HTTP ${res.status}`);
        }
        const text = await res.text();
        return text ? JSON.parse(text) : {};
    }

    /**
     * Запускает polling для разрешения промиса
     * Использует SessionStore если доступно, иначе локальный polling
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     */
    function startPromisePolling(sessionId, promiseId) {
        console.log('[ActionExecutor] startPromisePolling called:', {sessionId, promiseId});
        const store = global.resolveStore(sessionId);
        console.log('[ActionExecutor] resolveStore result:', typeof store, store ? 'has startPromisePolling: ' + typeof store?.startPromisePolling : 'null');
        const sessionScoped = !promiseId;

        if (store?.startPromisePolling) {
            console.log('[ActionExecutor] store.startPromisePolling exists, starting polling...');
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
                    if (typeof sessionId === 'string') {
                        store.stopLoader?.(sessionId);
                    } else {
                        store.stopLoader?.();
                    }
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
                if (typeof sessionId === 'string') {
                    store.stopLoader?.(sessionId);
                } else {
                    store.stopLoader?.();
                }
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
        
        console.warn('[ActionExecutor] startPromisePolling: store.startPromisePolling not available, store type:', typeof store);
        
    }

    /**
     * Останавливает polling для промисов
     * Использует SessionStore если доступно, иначе локальный polling
     * 
     * @param {string} sessionId - ID сессии
     */
    function stopPromisePolling(sessionId) {
        const store = global.resolveStore(sessionId);
        
        // Try to use SessionStore for unified promise management
        if (store?.stopPromisePolling) {
            store.stopPromisePolling();
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
        stopPromisePolling,
        pullSessionSnapshot,
        resolveStore: global.resolveStore,
        getApiBase,
        createHeaders,
        fetchJson,
        POLL_INTERVAL
    };

    if (typeof window !== 'undefined') {
        window.ActionExecutor = ActionExecutor;
    }
    global.ActionExecutor = ActionExecutor;

})(typeof window !== 'undefined' ? window : globalThis);
