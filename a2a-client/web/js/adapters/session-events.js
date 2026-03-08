/**
 * Session Events Module - система событий для сессий
 */

(function (global) {
    'use strict';

    /**
     * Создать менеджер событий для сессий
     * @returns {Object}
     */
    function createSessionEvents() {
        const listeners = new Map();

        return {
            /**
             * Подписаться на событие
             */
            on(event, callback) {
                if (!listeners.has(event)) {
                    listeners.set(event, new Set());
                }
                listeners.get(event).add(callback);
                return () => this.off(event, callback);
            },

            /**
             * Отписаться от события
             */
            off(event, callback) {
                listeners.get(event)?.delete(callback);
            },

            /**
             * Emit событие
             */
            _emit(event, data) {
                listeners.get(event)?.forEach(cb => {
                    try { 
                        cb(data); 
                    } catch (e) { 
                        console.error('[SessionEvents] Event error:', e); 
                    }
                });
            },

            /**
             * Получить всех подписчиков
             */
            getListeners(event) {
                return listeners.get(event);
            },

            /**
             * Очистить все события
             */
            clear() {
                listeners.clear();
            }
        };
    }

    // Export
    global.createSessionEvents = createSessionEvents;

})(typeof window !== 'undefined' ? window : globalThis);
