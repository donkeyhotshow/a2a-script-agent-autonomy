/**
 * DialogState - Управление состоянием диалога (messages, execute, context)
 * Часть иерархии: EventEmitter → SessionStoreCore → SessionStore
 */

import { normalizeMessage, MAX_MESSAGES } from '../utils/normalizers.js';

/**
 * @typedef {Object} DialogStateOptions
 * @property {number} [maxMessages=100] - Максимальное количество сообщений
 */

/**
 * @typedef {Object} DialogStateSnapshot
 * @property {string|null} sessionId
 * @property {string|null} projectId
 * @property {Array} messages
 * @property {Object|null} execute
 * @property {Object|null} context
 * @property {string} status
 * @property {Object|null} pendingForm
 * @property {Object|null} lastError
 */

export class DialogState {
    /**
     * @param {DialogStateOptions} [options]
     */
    constructor(options = {}) {
        this._maxMessages = options.maxMessages || MAX_MESSAGES;
        
        /** @type {DialogStateSnapshot} */
        this._state = {
            sessionId: null,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: 'idle',
            pendingForm: null,
            lastError: null
        };
    }

    /**
     * Получить копию текущего состояния
     * @returns {DialogStateSnapshot}
     */
    getState() {
        return { ...this._state };
    }

    // === Getters ===

    /** @returns {string|null} */
    get sessionId() { return this._state.sessionId; }
    
    /** @returns {string|null} */
    get projectId() { return this._state.projectId; }
    
    /** @returns {Array} */
    get messages() { return [...this._state.messages]; }
    
    /** @returns {Object|null} */
    get execute() { return this._state.execute; }
    
    /** @returns {Object|null} */
    get pendingForm() { return this._state.pendingForm; }
    
    /** @returns {Object|null} */
    get context() { return this._state.context; }
    set context(value) { this._state.context = value; }
    
    /** @returns {string} */
    get status() { return this._state.status; }
    set status(value) { this._state.status = value; }

    // === Computed Properties ===

    /**
     * Проверяет, ожидает ли диалог ввода от пользователя
     * @returns {boolean}
     */
    isWaitingForInput() {
        return this._state.status === 'waiting' ||
               this._state.pendingForm !== null ||
               (this._state.execute?.form?.choices?.length > 0) ||
               this._state.execute?.form?.input;
    }

    /**
     * Проверяет, активен ли диалог
     * @returns {boolean}
     */
    isActive() {
        return this._state.status === 'active' || this._state.status === 'waiting';
    }

    // === State Modifiers ===

    /**
     * Сбросить состояние
     * @param {string|null} sessionId
     * @param {string|null} projectId
     * @returns {DialogState}
     */
    reset(sessionId = null, projectId = null) {
        this._state = {
            sessionId,
            projectId,
            messages: [],
            execute: null,
            context: null,
            status: sessionId ? 'created' : 'idle',
            pendingForm: null,
            lastError: null
        };
        return this;
    }

    /**
     * Установить ID сессии
     * @param {string} sessionId
     * @param {string|null} [projectId]
     * @returns {DialogState}
     */
    setSession(sessionId, projectId = null) {
        this._state.sessionId = sessionId;
        if (projectId) this._state.projectId = projectId;
        return this;
    }

    /**
     * Установить проект
     * @param {string} projectId
     * @returns {DialogState}
     */
    setProject(projectId) {
        this._state.projectId = projectId;
        return this;
    }

    /**
     * Установить статус
     * @param {string} status
     * @returns {DialogState}
     */
    setStatus(status) {
        this._state.status = status;
        return this;
    }

    /**
     * Установить execute (ответ от сервера)
     * @param {Object|null} execute
     * @returns {DialogState}
     */
    setExecute(execute) {
        this._state.execute = execute || null;
        
        // Поддержка формы с choices или input полями
        if (execute?.form?.choices || execute?.form?.input) {
            this._state.pendingForm = execute.form;
            this._state.status = 'waiting';
        } else {
            this._state.pendingForm = null;
        }
        
        return this;
    }

    /**
     * Установить контекст
     * @param {Object|null} context
     * @returns {DialogState}
     */
    setContext(context) {
        this._state.context = context || null;
        return this;
    }

    /**
     * Установить сообщения (массив)
     * @param {Array} messages
     * @returns {DialogState}
     */
    setMessages(messages) {
        if (!Array.isArray(messages)) return this;
        
        // Проверяем, нормализованы ли уже сообщения
        const alreadyNormalized = messages.every(m => m.id && m.timestamp);
        if (alreadyNormalized && this._state.messages.length > 0) return this;
        
        this._state.messages = messages
            .map(m => normalizeMessage(m, 'assistant'))
            .filter(Boolean)
            .slice(-this._maxMessages);
        
        return this;
    }

    /**
     * Добавить сообщения к существующим
     * @param {Array} messages
     * @returns {DialogState}
     */
    appendMessages(messages) {
        if (!Array.isArray(messages)) return this;
        
        const normalized = messages
            .map(m => normalizeMessage(m, 'assistant'))
            .filter(Boolean);
        
        this._state.messages = [
            ...this._state.messages,
            ...normalized
        ].slice(-this._maxMessages);
        
        return this;
    }

    /**
     * Добавить одно сообщение
     * @param {Object|string} message
     * @param {string} [role='assistant']
     * @returns {DialogState}
     */
    pushMessage(message, role = 'assistant') {
        const normalized = normalizeMessage(message, role);
        if (!normalized) return this;
        
        this._state.messages = [
            ...this._state.messages,
            normalized
        ].slice(-this._maxMessages);
        
        return this;
    }

    /**
     * Установить ошибку
     * @param {Error|Object|string} error
     * @returns {DialogState}
     */
    setError(error) {
        this._state.lastError = error;
        this._state.status = 'error';
        
        const content = error?.message || String(error);
        this.pushMessage({ content, metadata: { type: 'error' } }, 'system');
        
        return this;
    }

    /**
     * Применить ответ сервера
     * @param {Object} data - Данные от сервера
     * @returns {DialogState}
     */
    applyServerResponse(data) {
        const { sessionId, projectId, status, context, execute, messages } = data;

        if (projectId) this.setProject(projectId);
        if (sessionId) this.setSession(sessionId, projectId);
        if (status) this.setStatus(status);
        if (context) this.setContext(context);
        if (execute) this.setExecute(execute);
        if (messages?.length) this.appendMessages(messages);

        return this;
    }
}

export default DialogState;
