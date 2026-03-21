/**
 * SessionStoreCore - Ядро управления состоянием сессии
 * Наследует от EventEmitter, использует DialogState для состояния диалога
 * 
 * Иерархия:
 * EventEmitter (abstract)
 * └── SessionStoreCore extends EventEmitter
 *     └── SessionStore extends SessionStoreCore
 */

import { EventEmitter } from './EventEmitter.js';
import { DialogState } from './DialogState.js';
import { DialogLoader } from './DialogLoader.js';
import { DialogPromise } from './DialogPromise.js';

/**
 * @typedef {Object} SessionStoreCoreOptions
 * @property {number} [maxMessages=100] - Максимальное количество сообщений
 * @property {number} [loaderMinTime=5000] - Минимальное время показа loader
 * @property {number} [promisePollInterval=5000] - Интервал polling для promise
 */

export class SessionStoreCore extends EventEmitter {
    /**
     * @param {SessionStoreCoreOptions} [options]
     */
    constructor(options = {}) {
        super();
        
        // Сервисы
        /** @type {DialogState} */
        this._dialogState = new DialogState({ maxMessages: options.maxMessages });
        
        /** @type {DialogLoader} */
        this._loader = new DialogLoader({ minTime: options.loaderMinTime });
        
        /** @type {DialogPromise} */
        this._promise = new DialogPromise({ pollInterval: options.promisePollInterval });
        
        // Перенаправляем события от сервисов
        this._setupEventForwarding();
        
        // Дополнительное состояние
        this._waitIndicatorActive = false;
    }

    /**
     * Настроить перенаправление событий от сервисов
     * @private
     */
    _setupEventForwarding() {
        // DialogLoader events
        this._loader.on('loader', (data) => {
            this.emit('loader', data);
        });
        
        // DialogPromise events
        this._promise.on('promisePending', (pending) => {
            this.emit('promisePending', pending);
        });
        
        this._promise.on('resolved', (data) => {
            this.emit('promiseResolved', data);
        });
        
        this._promise.on('rejected', (data) => {
            this.emit('promiseError', data);
        });
    }

    // === State Proxy (делегирование к DialogState) ===

    /**
     * Получить полное состояние
     * @returns {Object}
     */
    getState() {
        return {
            ...this._dialogState.getState(),
            loaderActive: this._loader.isActive,
            promisePending: this._promise.isPending,
            waitIndicatorActive: this._waitIndicatorActive
        };
    }

    // Getters - делегирование к _dialogState
    get sessionId() { return this._dialogState.sessionId; }
    get projectId() { return this._dialogState.projectId; }
    get messages() { return this._dialogState.messages; }
    get execute() { return this._dialogState.execute; }
    get pendingForm() { return this._dialogState.pendingForm; }
    get context() { return this._dialogState.context; }
    set context(value) { this._dialogState.context = value; }
    get status() { return this._dialogState.status; }
    set status(value) { this._dialogState.status = value; }

    /**
     * Ожидает ли ввода
     * @returns {boolean}
     */
    isWaitingForInput() {
        return this._dialogState.isWaitingForInput();
    }

    /**
     * Активен ли диалог
     * @returns {boolean}
     */
    isActive() {
        return this._dialogState.isActive();
    }

    /**
     * Заблокирован ли ввод
     * @returns {boolean}
     */
    isInputBlocked() {
        return this._promise.isPending || this._dialogState.status === 'loading';
    }

    // === Loader Management ===

    /**
     * Запустить loader
     * @returns {SessionStoreCore}
     */
    startLoader() {
        this._loader.start();
        return this;
    }

    /**
     * Остановить loader
     * @returns {SessionStoreCore}
     */
    stopLoader() {
        this._loader.stop();
        return this;
    }

    /**
     * Получить состояние loader
     * @returns {Object}
     */
    getLoaderState() {
        return this._loader.getState();
    }

    // === Promise Management ===

    /**
     * Установить promise pending
     * @param {boolean} pending
     * @returns {SessionStoreCore}
     */
    setPromisePending(pending) {
        this._promise.setPending(pending);
        return this;
    }

    /**
     * Установить promiseId
     * @param {string|null} promiseId
     * @returns {SessionStoreCore}
     */
    setPromiseId(promiseId) {
        this._promise.setPromiseId(promiseId);
        return this;
    }

    /**
     * Запустить polling для promise
     * @param {Function} checkFn
     * @param {{ sessionScoped?: boolean }} [opts]
     * @returns {SessionStoreCore}
     */
    startPromisePolling(checkFn, opts) {
        this._promise.startPolling(checkFn, opts);
        return this;
    }

    /**
     * Остановить polling
     * @returns {SessionStoreCore}
     */
    stopPromisePolling() {
        this._promise.stopPolling();
        return this;
    }

    // === State Modifiers ===

    /**
     * Сбросить состояние
     * @param {string|null} sessionId
     * @param {string|null} projectId
     * @returns {SessionStoreCore}
     */
    reset(sessionId = null, projectId = null) {
        this._dialogState.reset(sessionId, projectId);
        this._loader.reset();
        this._promise.reset();
        this._waitIndicatorActive = false;
        
        this.emit('reset', this.getState());
        return this;
    }

    /**
     * Установить сессию
     * @param {string} sessionId
     * @param {string|null} [projectId]
     * @returns {SessionStoreCore}
     */
    setSession(sessionId, projectId = null) {
        this._dialogState.setSession(sessionId, projectId);
        this.emit('session', sessionId);
        return this;
    }

    /**
     * Создать сессию
     * @param {Object} session
     * @returns {SessionStoreCore}
     */
    createSession(session) {
        const { id, sessionId, projectId, task, title } = session || {};
        const sid = id || sessionId;
        const pid = projectId || this._dialogState.projectId;

        if (!sid) {
            console.error('[SessionStoreCore] createSession: No session ID provided');
            return this;
        }

        this.reset(sid, pid);
        this._dialogState.setStatus('created');
        this.emit('sessionCreated', { id: sid, projectId: pid, task, title });
        return this;
    }

    /**
     * Установить проект
     * @param {string} projectId
     * @returns {SessionStoreCore}
     */
    setProject(projectId) {
        this._dialogState.setProject(projectId);
        this.emit('project', projectId);
        return this;
    }

    /**
     * Установить статус
     * @param {string} status
     * @returns {SessionStoreCore}
     */
    setStatus(status) {
        this._dialogState.setStatus(status);
        this.emit('status', status);
        return this;
    }

    /**
     * Установить execute
     * @param {Object|null} execute
     * @returns {SessionStoreCore}
     */
    setExecute(execute) {
        // Обработка wait индикатора
        if (this._waitIndicatorActive && execute && !execute.wait) {
            this._waitIndicatorActive = false;
        }

        this._dialogState.setExecute(execute);
        
        // Сброс promise pending
        this._promise.setPending(false);

        this.emit('execute', this._dialogState.execute);
        this.emit('promisePending', false);

        // Emit wait event если есть
        if (execute?.wait) {
            this._waitIndicatorActive = true;
            this.emit('wait', typeof execute.wait === 'object' ? execute.wait : { message: String(execute.wait) });
        } else {
            this.emit('wait', null);
        }

        return this;
    }

    /**
     * Установить контекст
     * @param {Object|null} context
     * @returns {SessionStoreCore}
     */
    setContext(context) {
        this._dialogState.setContext(context);
        this.emit('context', this._dialogState.context);
        return this;
    }

    /**
     * Установить сообщения
     * @param {Array} messages
     * @returns {SessionStoreCore}
     */
    setMessages(messages) {
        this._dialogState.setMessages(messages);
        this.emit('messages', this._dialogState.messages);
        return this;
    }

    /**
     * Добавить сообщения
     * @param {Array} messages
     * @returns {SessionStoreCore}
     */
    appendMessages(messages) {
        this._dialogState.appendMessages(messages);
        this.emit('messages', this._dialogState.messages);
        return this;
    }

    /**
     * Добавить сообщение
     * @param {Object|string} message
     * @param {string} [role='assistant']
     * @returns {SessionStoreCore}
     */
    pushMessage(message, role = 'assistant') {
        this._dialogState.pushMessage(message, role);
        const lastMessage = this._dialogState.messages[this._dialogState.messages.length - 1];
        this.emit('message', lastMessage);
        this.emit('messages', this._dialogState.messages);
        return this;
    }

    /**
     * Установить ошибку
     * @param {Error|Object|string} error
     * @returns {SessionStoreCore}
     */
    setError(error) {
        this._dialogState.setError(error);
        this.emit('error', error);
        return this;
    }

    /**
     * @returns {SessionStoreCore}
     */
    clearLastError() {
        this._dialogState.clearLastError();
        this.emit('error', null);
        return this;
    }

    /**
     * Применить ответ сервера
     * @param {Object} data
     * @returns {SessionStoreCore}
     */
    applyServerResponse(data) {
        const { sessionId, projectId, status, context, execute, messages, finalResult } = data;

        if (projectId) this.setProject(projectId);
        if (sessionId) this.setSession(sessionId, projectId);
        if (status) this.setStatus(status);
        if (context) this.setContext(context);
        if (execute) this.setExecute(execute);
        else if (finalResult) this.setExecute({ finalResult });
        if (messages?.length) this.appendMessages(messages);

        this.emit('serverResponse', data);
        return this;
    }

    /**
     * Переименовать сессию
     * @param {string} sessionId
     * @param {string} newName
     * @returns {SessionStoreCore}
     */
    renameSession(sessionId, newName) {
        this.emit('rename', { sessionId, newName });
        return this;
    }

    /**
     * Уничтожить экземпляр
     */
    destroy() {
        this._loader.destroy();
        this._promise.destroy();
        this.removeAllListeners();
    }
}

export default SessionStoreCore;
