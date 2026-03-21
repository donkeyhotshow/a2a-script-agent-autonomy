/**
 * DialogLoader - Управление состоянием loader (загрузка с минимальным временем отображения)
 * Minimum loader display: see a2a-constants.js / __a2aDaemons.MIN_LOADER_MS.
 */

import { MIN_LOADER_MS } from './a2a-constants.js';
import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {Object} LoaderState
 * @property {boolean} active - Активен ли loader
 * @property {number|null} minEndTime - Минимальное время окончания
 * @property {boolean} canHide - Можно ли скрыть loader
 */

/**
 * @typedef {Object} DialogLoaderOptions
 * @property {number} [minTime] - Минимальное время показа loader в мс (default MIN_LOADER_MS)
 */

export class DialogLoader extends EventEmitter {
    /**
     * @param {DialogLoaderOptions} [options]
     */
    constructor(options = {}) {
        super();
        
        /** @type {number} */
        this._minTime = options.minTime ?? MIN_LOADER_MS;
        
        /** @type {boolean} */
        this._active = false;
        
        /** @type {number|null} */
        this._minEndTime = null;
        
        /** @type {number|null} */
        this._timeoutId = null;
    }

    /**
     * Получить текущее состояние loader
     * @returns {LoaderState}
     */
    getState() {
        return {
            active: this._active,
            minEndTime: this._minEndTime,
            canHide: this._minEndTime !== null && Date.now() >= this._minEndTime
        };
    }

    /**
     * Активен ли loader
     * @returns {boolean}
     */
    get isActive() {
        return this._active;
    }

    /**
     * Запустить loader
     * @returns {DialogLoader}
     */
    start() {
        if (this._active) return this;
        
        this._active = true;
        this._minEndTime = Date.now() + this._minTime;
        
        this.emit('loader', { 
            active: true, 
            minEndTime: this._minEndTime 
        });
        
        return this;
    }

    /**
     * Остановить loader (с учетом минимального времени)
     * @returns {DialogLoader}
     */
    stop() {
        const now = Date.now();
        const canHide = this._minEndTime === null || now >= this._minEndTime;
        
        if (canHide || !this._active) {
            // Можно скрыть сразу или loader не был активен
            this._forceStop();
        } else {
            // Дождаться минимального времени
            const remaining = this._minEndTime - now;
            
            if (this._timeoutId) {
                clearTimeout(this._timeoutId);
            }
            
            this._timeoutId = setTimeout(() => {
                this._forceStop();
            }, remaining);
        }
        
        return this;
    }

    /**
     * Принудительная остановка loader
     * @private
     */
    _forceStop() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._active) {
            this._active = false;
            this._minEndTime = null;
            
            this.emit('loader', { active: false });
        }
    }

    /**
     * Остановить таймер ожидания (если нужно прервать)
     * @returns {DialogLoader}
     */
    cancelWait() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        return this;
    }

    /**
     * Сбросить состояние loader
     * @returns {DialogLoader}
     */
    reset() {
        this._forceStop();
        return this;
    }

    /**
     * Установить минимальное время (для тестирования)
     * @param {number} ms
     * @returns {DialogLoader}
     */
    setMinTime(ms) {
        this._minTime = ms;
        return this;
    }

    /**
     * Уничтожить экземпляр
     */
    destroy() {
        this._forceStop();
        this.removeAllListeners();
    }
}

export default DialogLoader;
