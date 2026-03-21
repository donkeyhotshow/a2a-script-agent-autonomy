/**
 * Normalizers - Утилиты нормализации данных
 * 
 * Содержит функции для нормализации различных типов данных:
 * - сообщений
 * - ответов сервера
 * - данных сессий
 */

(function (global) {
    'use strict';

    /**
     * Нормализовать сообщение
     * @param {Object|string} msg - Сообщение для нормализации
     * @param {string} [role='user'] - Роль отправителя
     * @returns {Object} Нормализованное сообщение
     */
    function normalizeMessage(msg, role) {
        if (!msg || typeof msg !== 'object') {
            return { 
                content: String(msg || ''), 
                role: role || 'user', 
                timestamp: Date.now() 
            };
        }
        return {
            id: msg.id || 'msg_' + Date.now(),
            content: msg.content || msg.text || String(msg),
            role: msg.role || role || 'user',
            metadata: msg.metadata || {},
            timestamp: msg.timestamp || Date.now()
        };
    }

    /**
     * Нормализовать массив сообщений
     * @param {Array} messages - Массив сообщений
     * @param {string} [defaultRole='user'] - Роль по умолчанию
     * @returns {Array} Нормализованный массив сообщений
     */
    function normalizeMessages(messages, defaultRole) {
        if (!Array.isArray(messages)) return [];
        return messages.map(msg => normalizeMessage(msg, msg?.role || defaultRole));
    }

    /**
     * Нормализовать ответ сервера
     * @param {Object} data - Данные от сервера
     * @returns {Object} Нормализованные данные
     */
    function normalizeServerResponse(data) {
        if (!data || typeof data !== 'object') {
            return {};
        }
        return {
            sessionId: data.sessionId || data.session?.id || null,
            projectId: data.projectId || data.session?.projectId || null,
            status: data.status || null,
            context: data.context || null,
            execute: data.execute || null,
            messages: normalizeMessages(data.messages),
            finalResult: data.finalResult || null
        };
    }

    /**
     * Нормализовать данные сессии
     * @param {Object} session - Данные сессии
     * @returns {Object} Нормализованные данные сессии
     */
    function normalizeSession(session) {
        if (!session || typeof session !== 'object') {
            return { id: null, projectId: null };
        }
        return {
            id: session.id || session.sessionId || null,
            sessionId: session.sessionId || session.id || null,
            projectId: session.projectId || null,
            title: session.title || session.name || null,
            task: session.task || null,
            execute: session.execute || null,
            status: session.status || 'created',
            createdAt: session.createdAt || session.created_at || Date.now(),
            updatedAt: session.updatedAt || session.updated_at || Date.now()
        };
    }

    /**
     * Нормализовать execute данные
     * @param {Object} execute - Execute данные
     * @returns {Object} Нормализованные execute данные
     */
    function normalizeExecute(execute) {
        if (!execute || typeof execute !== 'object') {
            return null;
        }
        return {
            action: execute.action || execute.type || null,
            script: execute.script || null,
            form: execute.form || null,
            wait: execute.wait || null,
            finalResult: execute.finalResult || null,
            metadata: execute.metadata || {}
        };
    }

    // Экспорт
    global.Normalizers = {
        normalizeMessage,
        normalizeMessages,
        normalizeServerResponse,
        normalizeSession,
        normalizeExecute
    };

})(typeof window !== 'undefined' ? window : globalThis);
