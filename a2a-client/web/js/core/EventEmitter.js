/**
 * EventEmitter - Базовый абстрактный класс для управления событиями
 * Использует Map для хранения listeners
 */
export class EventEmitter {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Подписаться на событие
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик события
     * @returns {Function} Функция для отписки
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            console.warn('[EventEmitter] Callback must be a function');
            return () => {};
        }
        
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        
        // Возвращает функцию отписки
        return () => this.off(event, callback);
    }

    /**
     * Подписаться на событие один раз
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик события
     * @returns {Function} Функция для отписки
     */
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback.apply(this, args);
        };
        return this.on(event, wrapper);
    }

    /**
     * Отписаться от события
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик события
     */
    off(event, callback) {
        const handlers = this._listeners.get(event);
        if (handlers) {
            handlers.delete(callback);
            if (handlers.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    /**
     * Испустить событие
     * @param {string} event - Название события
     * @param {*} payload - Данные события
     */
    emit(event, payload) {
        const handlers = this._listeners.get(event);
        if (!handlers) return;
        
        handlers.forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                console.error(`[EventEmitter] Handler failed for event "${event}":`, err);
            }
        });
    }

    /**
     * Удалить все подписки
     */
    removeAllListeners() {
        this._listeners.clear();
    }

    /**
     * Получить список событий с подписчиками
     * @returns {string[]} Названия событий
     */
    eventNames() {
        return Array.from(this._listeners.keys());
    }

    /**
     * Получить количество подписчиков для события
     * @param {string} event - Название события
     * @returns {number} Количество подписчиков
     */
    listenerCount(event) {
        return this._listeners.get(event)?.size || 0;
    }
}

export default EventEmitter;
