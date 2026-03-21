/**
 * Central Configuration Module
 * Объединяет все константы из разных модулей в одном месте
 */

(function (global) {
    'use strict';

    /**
     * Глобальная конфигурация
     * @readonly
     */
    const CONFIG = Object.freeze({
        // Loader (минимальное время показа)
        LOADERS: {
            MIN_DISPLAY_MS: 5000
        },

        // API настройки
        API: {
            DEFAULT_TIMEOUT: 15000,  // 15 секунд
            MAX_RETRIES: 3,
            BASE_DELAY: 2000         // 2 секунды (exponential backoff)
        },

        // Polling настройки
        POLL: {
            INTERVAL: 5000,          // 5 секунд
            TIMEOUT: 120000         // 2 минуты (timeout для LLM)
        },

        // Messages
        MESSAGES: {
            MAX_COUNT: 200
        }
    });

    // Экспорт в глобальную область
    global.A2A_CONFIG = CONFIG;

    // Для обратной совместимости с daemons
    global.__a2aDaemons = global.__a2aDaemons || {};
    global.__a2aDaemons.timingMs = function(key) {
        switch (key) {
            case 'MIN_LOADER_MS':
                return CONFIG.LOADERS.MIN_DISPLAY_MS;
            case 'PROMISE_POLL_INTERVAL':
                return CONFIG.POLL.INTERVAL;
            default:
                return 1000;
        }
    };

    console.log('[Config] A2A конфигурация загружена:', {
        loader: CONFIG.LOADERS.MIN_DISPLAY_MS + 'ms',
        apiTimeout: CONFIG.API.DEFAULT_TIMEOUT + 'ms',
        pollInterval: CONFIG.POLL.INTERVAL + 'ms'
    });

})(typeof window !== 'undefined' ? window : globalThis);
