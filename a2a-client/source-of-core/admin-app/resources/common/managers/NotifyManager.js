// import {setItem, getItem, removeItem, clearStorage} from '../imports/storage.js';
import RegularManager from './include/RegularManager.js'

// import STANDARD_EVENTS from '../include/constants/events.js';


class NotifyManager extends RegularManager {
    constructor(hub) {
        super(hub)
        this.events = new Map()
        this._isEmitting = false
    }

    /**
     * Регистрирует слушатель для события.
     * @param {string} event - Название события.
     * @param {Function} handler - Функция обратного вызова.
     */
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, [])
        }
        this.events.get(event).push(handler)
    }

    /**
     * Удаляет слушатель для события.
     * @param {string} event - Название события.
     * @param {Function} handler - Функция обратного вызова.
     */
    off(event, handler) {
        if (!this.events.has(event)) return
        const handlers = this.events.get(event).filter(h => h !== handler)
        this.events.set(event, handlers)
    }

    /**
     * Эмитирует событие с данными.
     * @param {string} event - Название события.
     * @param {any} payload - Данные события.
     */
    emit(event, payload) {
        if (!this.events.has(event)) return
        this.events.get(event).forEach(handler => handler(payload))
    }
}

export default NotifyManager
