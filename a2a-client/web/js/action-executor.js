/**
 * ActionExecutor - Выполнение действий (взаимодействие с API)
 * 
 * Осуществляет:
 * - Отправку результатов на сервер (submit)
 * - Проверку статуса промисов (checkPromise)
 * - Управление polling-ом для асинхронных операций
 * - Логирование execute payloads для отладки (в режиме разработки)
 * 
 * Примечание: Управление loader теперь явное (через server response),
 * а не неявное через submit(). loader control в task-flow модулях.
 */

(function (global) {
    'use strict';

    if (typeof global.resolveSessionStore !== 'function') {
        throw new Error('[ActionExecutor] Load js/session-store-resolver.js before action-executor.js');
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
        const store = storeOverride || global.resolveSessionStore(sessionId);
        const submitFn = global.apiIntegration?.submitSessionResult;
        if (typeof submitFn !== 'function') {
            throw new Error('[ActionExecutor] apiIntegration.submitSessionResult is required');
        }
        
        // Логируем входящий результат для отладки
        if (typeof window !== 'undefined' && window.DEV_MODE) {
            console.log('[ActionExecutor] submit called:', {
                sessionId,
                result: JSON.parse(JSON.stringify(result)) // Клонируем для безопасности
            });
            if (window.__devToolsLogAction) {
                window.__devToolsLogAction('submit', { sessionId, result });
            }
        }
        
        let data;
        try {
            data = await submitFn.call(global.apiIntegration, sessionId, result);
        } catch (err) {
            if (store) {
                store.setPromisePending?.(false);
                store.stopLoader?.(sessionId);
            }
            throw err;
        }

        // Логируем ответ сервера
        if (typeof window !== 'undefined' && window.DEV_MODE) {
            console.log('[ActionExecutor] submit response:', {
                sessionId,
                data: JSON.parse(JSON.stringify(data))
            });
            if (window.__devToolsLogAction) {
                window.__devToolsLogAction('submit-response', { sessionId, data });
            }
        }

        // Каноничный формат: только asyncPending (устарел promiseId)
        const asyncPending = !!data?.asyncPending;
        const acceptedOk = data?.accepted !== false;
        if (store && data?.success && acceptedOk) {
            if (asyncPending) {
                store.setPromisePending?.(true);
                await pullSessionSnapshot(sessionId, store, { skipExecuteWhenPending: true });
                try {
                    startPromisePolling(sessionId, null);
                } catch (pollErr) {
                    console.error('[ActionExecutor] submit: startPromisePolling failed', pollErr);
                    store.setPromisePending?.(false);
                    store.stopLoader?.(sessionId);
                    throw pollErr;
                }
            } else {
                await pullSessionSnapshot(sessionId, store);
                store.setPromisePending?.(false);
                const ex = store?.execute;
                if (!ex?.wait) {
                    store.stopLoader?.(sessionId);
                }
            }
        } else if (store) {
            store.setPromisePending?.(false);
            store.stopLoader?.(sessionId);
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
        // Логируем запуск polling
        if (typeof window !== 'undefined' && window.DEV_MODE) {
            console.log('[ActionExecutor] startPromisePolling called:', {
                sessionId,
                promiseId,
                sessionScoped: !promiseId
            });
            if (window.__devToolsLogAction) {
                window.__devToolsLogAction('startPromisePolling', { sessionId, promiseId });
            }
        }
        
        const store = global.resolveSessionStore(sessionId);
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
                });
                
                // Логируем resolved промис
                if (typeof window !== 'undefined' && window.DEV_MODE) {
                    console.log('[ActionExecutor] promise resolved:', {
                        sessionId,
                        promiseId,
                        data
                    });
                    if (window.__devToolsLogAction) {
                        window.__devToolsLogAction('promiseResolved', { sessionId, promiseId, data });
                    }
                }
            };

            const onRejected = (data) => {
                if (!(data.sessionScoped || data.promiseId === promiseId)) return;
                clearPromiseListeners(listenerKey);
                store.setPromisePending?.(false);
                // stopLoader вызывается явным образом из task-flow модулей
                
                // Логируем rejected промис
                if (typeof window !== 'undefined' && window.DEV_MODE) {
                    console.log('[ActionExecutor] promise rejected:', {
                        sessionId,
                        promiseId,
                        data
                    });
                    if (window.__devToolsLogAction) {
                        window.__devToolsLogAction('promiseError', { sessionId, promiseId, data });
                    }
                }
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
        
        // Логируем отправку сообщения
        if (typeof window !== 'undefined' && window.DEV_MODE) {
            console.log('[ActionExecutor] sendMessage called:', {
                sessionId,
                message: typeof message === 'string' ? message : JSON.stringify(message)
            });
            if (window.__devToolsLogAction) {
                window.__devToolsLogAction('sendMessage', { sessionId, message: messageText });
            }
        }
        
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
        // Логируем отправку выбора
        if (typeof window !== 'undefined' && window.DEV_MODE) {
            console.log('[ActionExecutor] sendChoice called:', {
                sessionId,
                choiceId
            });
            if (window.__devToolsLogAction) {
                window.__devToolsLogAction('sendChoice', { sessionId, choiceId });
            }
        }
        
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

    /**
     * After hydrate / reload: GET .../sessions/:id/async then refresh snapshot or attach polling.
     * Clears `awaitingSessionVerify` so the task-flow panel can show form only when idle.
     */
    async function bootstrapSessionUi(sessionId, store) {
        if (!sessionId || !store) return;
        const startSessionScopedPolling = () => {
            try {
                startPromisePolling(sessionId, null);
            } catch (pollErr) {
                console.error('[ActionExecutor] bootstrapSessionUi start polling failed:', pollErr);
                store.setPromisePending?.(false);
                store.stopLoader?.(sessionId);
            }
        };
        if (!global.apiIntegration?.checkSessionAsync) {
            try {
                await pullSessionSnapshot(sessionId, store);
            } catch (e) {
                console.error('[ActionExecutor] bootstrapSessionUi no-async check fallback:', e);
            }
            store.setAwaitingSessionVerify?.(false);
            store.stopLoader?.(sessionId);
            return;
        }
        try {
            const chk = await checkSessionAsync(sessionId);
            const terminalOk =
                chk &&
                (chk.completed === true ||
                    chk.status === 'completed' ||
                    chk.status === 'done' ||
                    chk.status === 'idle' ||
                    chk.execute != null);
            if (terminalOk) {
                await pullSessionSnapshot(sessionId, store);
                store.setPromisePending?.(false);
                store.stopLoader?.(sessionId);
                store.setAwaitingSessionVerify?.(false);
                return;
            }
            if (chk && (chk.status === 'failed' || chk.status === 'error')) {
                try {
                    await pullSessionSnapshot(sessionId, store);
                } catch (e2) {
                    console.error('[ActionExecutor] bootstrapSessionUi failed-state pull:', e2);
                }
                store.setPromisePending?.(false);
                store.stopLoader?.(sessionId);
                store.setAwaitingSessionVerify?.(false);
                return;
            }
            store.setPromisePending?.(true);
            startSessionScopedPolling();
            store.setAwaitingSessionVerify?.(false);
        } catch (e) {
            console.error('[ActionExecutor] bootstrapSessionUi:', e);
            // Network/transport errors during async bootstrap should not unblock input.
            // Keep waiting and continue session-scoped polling until we get a terminal state.
            store.setPromisePending?.(true);
            startSessionScopedPolling();
            store.setAwaitingSessionVerify?.(false);
        }
    }

    /**
     * Выполняет client-side actions (script, execute-command, run-script, rag-search)
     * Использует ClientActionRunner для sandbox выполнения
     * 
     * @param {string} actionType - тип action
     * @param {Object} params - параметры action из attachments
     * @returns {Promise<Object>} результат выполнения
     */
    async function executeClientAction(actionType, params = {}) {
        const runner = global.ClientActionRunner;
        if (!runner?.executeClientAction) {
            throw new Error('[ActionExecutor] ClientActionRunner not loaded. Include client-action-runner.js before action-executor.js');
        }
        return runner.executeClientAction(actionType, params);
    }

    /**
     * Проверяет возможность выполнения client-side action
     * 
     * @param {string} actionType - тип action
     * @returns {boolean} можно ли выполнить
     */
    function canExecuteClientAction(actionType) {
        const runner = global.ClientActionRunner;
        return runner?.canExecute?.(actionType) ?? false;
     }

     // Экспорт модуля
     const ActionExecutor = {
         submit,
         sendMessage,
         sendChoice,
         startPromisePolling,
         pullSessionSnapshot,
         checkSessionAsync,
         bootstrapSessionUi,
         executeClientAction,
         canExecuteClientAction,
         POLL_INTERVAL
     };

    if (typeof window !== 'undefined') {
        window.ActionExecutor = ActionExecutor;
    }
    global.ActionExecutor = ActionExecutor;

})(typeof window !== 'undefined' ? window : globalThis);
