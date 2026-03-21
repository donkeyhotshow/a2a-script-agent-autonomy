/**
 * DialogPromise - Управление async promise (асинхронные запросы)
 * Обрабатывает promiseId, polling и состояние ожидания
 */

import { PROMISE_POLL_INTERVAL_MS } from './a2a-constants.js';
import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {Object} PromiseState
 * @property {string|null} promiseId
 * @property {boolean} pending
 * @property {string|null} status
 */

/**
 * @typedef {Object} DialogPromiseOptions
 * @property {number} [pollInterval] - Интервал polling в мс (default PROMISE_POLL_INTERVAL_MS)
 */

export class DialogPromise extends EventEmitter {
    /**
     * @param {DialogPromiseOptions} [options]
     */
    constructor(options = {}) {
        super();
        
        /** @type {string|null} */
        this._promiseId = null;
        
        /** @type {boolean} */
        this._pending = false;
        
        /** @type {string|null} */
        this._status = null;
        
        /** @type {number} */
        this._pollInterval = options.pollInterval ?? PROMISE_POLL_INTERVAL_MS;
        
        /** @type {number|null} */
        this._pollTimer = null;
    }

    /**
     * Получить текущее состояние promise
     * @returns {PromiseState}
     */
    getState() {
        return {
            promiseId: this._promiseId,
            pending: this._pending,
            status: this._status
        };
    }

    /**
     * Активен ли promise (в ожидании)
     * @returns {boolean}
     */
    get isPending() {
        return this._pending;
    }

    /**
     * Получить текущий promiseId
     * @returns {string|null}
     */
    get promiseId() {
        return this._promiseId;
    }

    /**
     * Установить pending состояние
     * @param {boolean} pending
     * @returns {DialogPromise}
     */
    setPending(pending) {
        this._pending = pending;
        this.emit('promisePending', pending);
        return this;
    }

    /**
     * Установить promiseId
     * @param {string|null} promiseId
     * @returns {DialogPromise}
     */
    setPromiseId(promiseId) {
        this._promiseId = promiseId;
        
        if (promiseId) {
            this._pending = true;
            this._status = 'pending';
        } else {
            this._pending = false;
            this._status = null;
        }
        
        this.emit('promiseId', promiseId);
        this.emit('promisePending', this._pending);
        
        return this;
    }

    /**
     * Установить статус promise
     * @param {string|null} status
     * @returns {DialogPromise}
     */
    setStatus(status) {
        this._status = status;
        this.emit('status', status);
        return this;
    }

    /**
     * Начать polling для проверки promise
     * @param {Function} checkFn - Функция проверки статуса
     * @returns {DialogPromise}
     */
    startPolling(checkFn) {
        if (!this._promiseId) return this;
        
        this._stopPolling();
        
        this._pollTimer = setInterval(async () => {
            try {
                const result = await checkFn(this._promiseId);
                
                if (!result) {
                    // Ошибка сети - продолжаем polling
                    return;
                }
                
                if (result.completed || result.status === 'completed' || result.status === 'done') {
                    // Promise завершен
                    this._stopPolling();
                    this.setPending(false);
                    this.setStatus('completed');
                    
                    this.emit('resolved', {
                        promiseId: this._promiseId,
                        result: result.result,
                        execute: result.execute
                    });
                }
                
                if (result.status === 'failed' || result.status === 'error') {
                    // Promise не удался
                    this._stopPolling();
                    this.setPending(false);
                    this.setStatus('failed');
                    
                    this.emit('rejected', {
                        promiseId: this._promiseId,
                        error: result.error || 'Promise failed'
                    });
                }
            } catch (err) {
                console.error('[DialogPromise] Polling error:', err);
            }
        }, this._pollInterval);
        
        return this;
    }

    /**
     * Остановить polling
     * @returns {DialogPromise}
     */
    _stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
        return this;
    }

    /**
     * Остановить polling (публичный метод)
     * @returns {DialogPromise}
     */
    stopPolling() {
        return this._stopPolling();
    }

    /**
     * Обработать успешное завершение promise
     * @param {Object} result
     * @returns {DialogPromise}
     */
    resolve(result) {
        this._stopPolling();
        this._promiseId = null;
        this._pending = false;
        this._status = 'completed';
        
        this.emit('promisePending', false);
        this.emit('resolved', result);
        
        return this;
    }

    /**
     * Обработать ошибку promise
     * @param {Error|Object|string} error
     * @returns {DialogPromise}
     */
    reject(error) {
        this._stopPolling();
        this._promiseId = null;
        this._pending = false;
        this._status = 'failed';
        
        this.emit('promisePending', false);
        this.emit('rejected', { error });
        
        return this;
    }

    /**
     * Сбросить состояние promise
     * @returns {DialogPromise}
     */
    reset() {
        this._stopPolling();
        this._promiseId = null;
        this._pending = false;
        this._status = null;
        
        this.emit('promisePending', false);
        this.emit('reset');
        
        return this;
    }

    /**
     * Установить интервал polling
     * @param {number} ms
     * @returns {DialogPromise}
     */
    setPollInterval(ms) {
        this._pollInterval = ms;
        return this;
    }

    /**
     * Уничтожить экземпляр
     */
    destroy() {
        this._stopPolling();
        this.removeAllListeners();
    }
}

export default DialogPromise;
