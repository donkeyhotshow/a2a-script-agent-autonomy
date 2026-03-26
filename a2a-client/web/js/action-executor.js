/**
 * ActionExecutor - Выполнение действий (взаимодействие с API)
 * 
 * Осуществляет:
 * - Отправку результатов на сервер (submit)
 * - Проверку статуса промисов (checkPromise)
 * - Управление polling-ом для асинхронных операций
 * 
 * Примечание: Управление loader теперь явное (через server response),
 * а не неявное через submit(). loader control в task-flow модулях.
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
    const promiseListenerRegistry = new Map();

    function clearPromiseListeners(key) {
        if (!key) return;
        const existing = promiseListenerRegistry.get(key);
        if (existing) {
            existing.forEach((fn) => {
                try {
                    fn?.();
                } catch (err) {
                    console.error('[ActionExecutor] Failed to clear promise listener:', err);
                }
            });
            promiseListenerRegistry.delete(key);
        }
    }

    function registerPromiseListeners(key, unsubs) {
        if (!key || !unsubs || !unsubs.length) return;
        promiseListenerRegistry.set(key, unsubs);
    }

    /**
     * Hydrate store from GET /sessions/:id
     * Использует каноничный формат ответа
     * @param {{ skipExecuteWhenPending?: boolean }} [opts] — если true, пропустить setExecute пока asyncPending
     */
    async function pullSessionSnapshot(sessionId, store, opts = {}) {
        const api = global.apiIntegration;
        if (!api?.getSession || !store) {
            throw new Error('[ActionExecutor] pullSessionSnapshot requires apiIntegration.getSession and store');
        }
        const snap = await api.getSession(sessionId);
        
        // Каноничный формат: используем snap.id (новый формат)
        const sid = snap.id;
        if (sid) store.setSession?.(sid, snap.projectId);
        if (Array.isArray(snap.messages) && snap.messages.length > 0) {
            store.applyServerMessages?.(snap.messages);
        }
        // Skip setExecute only when explicitly requested AND async pending
        const shouldSkipExecute = opts.skipExecuteWhenPending && snap.asyncPending;
        if (!shouldSkipExecute && snap.execute != null) {
            store.setExecute?.(snap.execute);
        }
        if (snap.context != null) store.setContext?.(snap.context);
        return snap;
    }

    /**
     * Отправляет результат в сессию - запуск обработки шага
     * Сохраняет client-result.json и создает следующий шаг через API
     * 
     * Примечание: loader control убран (теперь явное через task-flow)
     * 
     * @param {string} sessionId - ID сессии
     * @param {Object} result - результат от пользователя
     * @returns {Promise<Object>} ответ сервера
     */
    async function submit(sessionId, result, storeOverride) {
        const store = storeOverride || global.resolveStore(sessionId);
        const data = await global.apiIntegration._fetch(`sessions/${encodeURIComponent(sessionId)}/next`, {
            method: 'POST',
            body: JSON.stringify({ result })
        });
        
        // Каноничный формат: только asyncPending (устарел promiseId)
        const asyncPending = !!data?.asyncPending;
        if (store && data?.success && data?.accepted) {
            if (asyncPending) {
                store.setPromisePending?.(true);
                // startPromisePolling вызывается явно из task-flow
                await pullSessionSnapshot(sessionId, store, { skipExecuteWhenPending: true });
            } else {
                await pullSessionSnapshot(sessionId, store);
            }
        }
        
        return data;
    }



    

    /**
     * Запускает polling для разрешения промиса
     * Использует SessionStore для unified polling
     * 
     * @param {string} sessionId - ID сессии
     * @param {string|null} promiseId - ID промиса (nullable для session-scoped)
     */
    function startPromisePolling(sessionId, promiseId) {
        const store = global.resolveStore(sessionId);
        const sessionScoped = !promiseId;

        if (store?.startPromisePolling) {
            if (!sessionScoped && store.setPromiseId) {
                store.setPromiseId(promiseId);
            }

            const listenerKey = sessionScoped ? `session:${sessionId}` : `${sessionId}:${promiseId}`;
            clearPromiseListeners(listenerKey);

            const checkFn = sessionScoped
                ? () => global?.apiIntegration?.checkSessionAsync?.(sessionId) ?? Promise.reject(new Error('checkSessionAsync is not a function on apiIntegration'))
                : (pid) => global.apiIntegration.checkPromise(sessionId, pid);

            store.startPromisePolling(checkFn, { sessionScoped });

            // При resolved - НЕ останавливаем loader явно (task-flow управляет)
            const onResolved = (data) => {
                if (!(data.sessionScoped || data.promiseId === promiseId)) return;
                clearPromiseListeners(listenerKey);
                pullSessionSnapshot(sessionId, store).then(() => {
                    store.setPromisePending?.(false);
                    // stopLoader вызывается явным образом из task-flow модулей
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
                clearPromiseListeners(listenerKey);
                store.setPromisePending?.(false);
                // stopLoader вызывается явным образом из task-flow модулей
                global.apiIntegration?.emit?.('promiseError', {
                    sessionId,
                    promiseId: data.promiseId ?? promiseId ?? null,
                    sessionScoped: !!data.sessionScoped,
                    error: data.error || 'Promise failed',
                });
            };

            store.on?.('promiseResolved', onResolved);
            store.on?.('promiseError', onRejected);
            registerPromiseListeners(listenerKey, [() => store.off?.('promiseResolved', onResolved), () => store.off?.('promiseError', onRejected)]);

            return;
        }

        const error = new Error('[ActionExecutor] SessionStore.startPromisePolling is required');
        if (store?.setError) {
            store.setError(error);
        }
        throw error;
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

    /**
     * Проверяет статус асинхронной сессии
     *
     * @param {string} sessionId - ID сессии
     * @returns {Promise<Object>} статус сессии
     */
    async function checkSessionAsync(sessionId) {
        return global.apiIntegration.checkSessionAsync(sessionId);
    }

     // Экспорт модуля
     const ActionExecutor = {
         submit,
         sendMessage,
         sendChoice,
         startPromisePolling,
         pullSessionSnapshot,
         checkSessionAsync,
         POLL_INTERVAL
     };

    if (typeof window !== 'undefined') {
        window.ActionExecutor = ActionExecutor;
    }
    global.ActionExecutor = ActionExecutor;

})(typeof window !== 'undefined' ? window : globalThis);
