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

    // Use global PROMISE_POLL_INTERVAL from SessionStore (default 5000ms)
    const POLL_INTERVAL = global.PROMISE_POLL_INTERVAL || 5000;

    // Track local polling as fallback (when SessionStore is not available)
    let localPollTimer = null;

    /**
     * Получает хранилище сессии
     * @param {string|null} sessionId - ID сессии
     * @returns {Object} хранилище сессии
     */
    function resolveStore(sessionId = null) {
        const registry = global.WindowRegistry;
        const resolvedSessionId = sessionId || global.SessionManager?.getActiveSessionId?.() || null;
        if (resolvedSessionId && registry?.getSessionStore) {
            const windowStore = registry.getSessionStore(resolvedSessionId);
            if (windowStore) {
                return windowStore;
            }
        }
        return global.SessionStore;
    }

    /**
     * Получает базовый API URL
     * @param {Object} store - хранилище сессии
     * @returns {string|null} базовый URL
     */
    function getApiBase(store) {
        const api = global.apiIntegration;
        // Check storage mode first - if using Vite (storage mode), use default
        const storageMode = store?.getStorageMode?.() || 'storage';
        if (storageMode === 'storage') {
            // Use relative path for dev/prod compatibility - Vite proxies /api/*
            return window.location.origin + '/api/a2a';
        }
        // For client-api mode, require explicit apiBase
        if (!api?.apiBase) return null;
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
            console.error('[ActionExecutor] JSON parse error:', e.message);
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
     * @param {{ skipExecuteWhenPending?: boolean }} [opts] — if true, skip setExecute while snap still has promiseId (setExecute clears promisePending).
     */
    async function pullSessionSnapshot(sessionId, store, opts = {}) {
        const api = global.apiIntegration;
        if (!api?.getSession || !store) return null;
        const snap = await api.getSession(sessionId);
        if (!snap) return null;
        const sid = snap.id || snap.sessionId;
        if (sid) store.setSession?.(sid, snap.projectId);
        if (Array.isArray(snap.messages) && snap.messages.length > 0) {
            store.applyServerMessages?.(snap.messages);
        }
        if (!(opts.skipExecuteWhenPending && snap.promiseId) && snap.execute != null) {
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
    async function submit(sessionId, result) {
        const store = resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            throw new Error('ActionExecutor: API base not configured. Set Client API URL in Settings.');
        }
        
        // Use storage mode with default fallback (same as getApiBase)
        const storageMode = store?.getStorageMode?.() || 'storage';
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
        
        // POST /next returns only { success, accepted, step, promiseId? } — hydrate via GET session
        if (store && data?.success && data?.accepted) {
            if (data.promiseId) {
                store.setPromisePending?.(true);
                if (typeof sessionId === 'string') {
                    store.startLoader?.(sessionId);
                } else {
                    store.startLoader?.();
                }
                startPromisePolling(sessionId, data.promiseId);
                if (global.WindowManager?.refreshAll) {
                    global.WindowManager.refreshAll();
                }
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
        const store = resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            console.warn('[ActionExecutor] API base not configured');
            return null;
        }
        
        // Use storage mode with default fallback
        const storageMode = store?.getStorageMode?.() || 'storage';
        const isStorageMode = storageMode === 'storage';
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`;
        
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                console.warn('[ActionExecutor] Promise check failed with status:', res.status);
                return null;
            }
            
            let data = {};
            const text = await res.text();
            if (text) {
                data = JSON.parse(text);
            }
            return data;
        } catch (e) {
            console.error('[ActionExecutor] Promise check failed:', e.message);
            return null;
        }
    }

    /**
     * Запускает polling для разрешения промиса
     * Использует SessionStore если доступно, иначе локальный polling
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     */
    function startPromisePolling(sessionId, promiseId) {
        const store = resolveStore(sessionId);
        
        // Try to use SessionStore for unified promise management
        if (store?.startPromisePolling && store?.setPromiseId) {
            // Set promise ID in store
            store.setPromiseId(promiseId);
            
            // Start polling via SessionStore with checkPromise function
            store.startPromisePolling((pid) => checkPromise(sessionId, pid));
            
            // Subscribe to promise resolved event from SessionStore
            const onResolved = (data) => {
                if (data.promiseId === promiseId) {
                    pullSessionSnapshot(sessionId, store).then(() => {
                        if (typeof sessionId === 'string') {
                            store.stopLoader?.(sessionId);
                        } else {
                            store.stopLoader?.();
                        }
                        global.apiIntegration?.emit?.('promiseResolved', {
                            sessionId,
                            promiseId,
                            result: data.result,
                            execute: data.execute
                        });
                    });
                }
            };
            
            // Subscribe to promise rejected event from SessionStore
            const onRejected = (data) => {
                if (data.promiseId === promiseId) {
                    store.setPromisePending?.(false);
                    // Stop loader on error
                    if (typeof sessionId === 'string') {
                        store.stopLoader?.(sessionId);
                    } else {
                        store.stopLoader?.();
                    }
                    global.apiIntegration?.emit?.('promiseError', {
                        sessionId,
                        promiseId,
                        error: data.error || 'Promise failed'
                    });
                }
            };
            
            // Listen to SessionStore events
            store.on?.('promiseResolved', onResolved);
            store.on?.('promiseError', onRejected);
            
            return;
        }
        
        // Fallback: local polling implementation (backward compatibility)
        // Clear any existing timer
        if (localPollTimer) {
            clearInterval(localPollTimer);
            localPollTimer = null;
        }
        
        localPollTimer = setInterval(async () => {
            const status = await checkPromise(sessionId, promiseId);
            
            if (!status) {
                // Network error - continue polling
                return;
            }
            
            if (status.completed || status.status === 'completed' || status.status === 'done') {
                // Promise resolved - clear timer and update session
                if (localPollTimer) {
                    clearInterval(localPollTimer);
                    localPollTimer = null;
                }
                
                if (store) {
                    await pullSessionSnapshot(sessionId, store);
                }
                
                global.apiIntegration?.emit?.('promiseResolved', {
                    sessionId,
                    promiseId,
                    result: status.result,
                    execute: status.execute ?? status.result?.execute
                });
            }
            
            if (status.status === 'failed' || status.status === 'error') {
                // Promise failed - clear timer
                if (localPollTimer) {
                    clearInterval(localPollTimer);
                    localPollTimer = null;
                }
                
                if (store) {
                    store.setPromisePending?.(false);
                }
                
                global.apiIntegration?.emit?.('promiseError', {
                    sessionId,
                    promiseId,
                    error: status.error || 'Promise failed'
                });
            }
        }, POLL_INTERVAL);
    }

    /**
     * Останавливает polling для промисов
     * Использует SessionStore если доступно, иначе локальный polling
     * 
     * @param {string} sessionId - ID сессии
     */
    function stopPromisePolling(sessionId) {
        const store = resolveStore(sessionId);
        
        // Try to use SessionStore for unified promise management
        if (store?.stopPromisePolling) {
            store.stopPromisePolling();
            return;
        }
        
        // Fallback: local polling implementation (backward compatibility)
        if (localPollTimer) {
            clearInterval(localPollTimer);
            localPollTimer = null;
        }
    }

    /**
     * Отправляет сообщение в сессию
     * 
     * @param {string} sessionId - ID сессии
     * @param {string|Object} message - текст сообщения или объект
     * @returns {Promise<Object>} ответ сервера
     */
    async function sendMessage(sessionId, message) {
        const messageText =
            typeof message === 'string'
                ? message
                : (message?.content ?? String(message ?? ''));
        return submit(sessionId, { message: messageText });
    }

    /**
     * Отправляет выбор в сессию
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} choiceId - ID выбора
     * @returns {Promise<Object>} ответ сервера
     */
    async function sendChoice(sessionId, choiceId) {
        return submit(sessionId, { choice: choiceId });
    }

    // Экспорт модуля
    const ActionExecutor = {
        submit,
        sendMessage,
        sendChoice,
        checkPromise,
        startPromisePolling,
        stopPromisePolling,
        resolveStore,
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
