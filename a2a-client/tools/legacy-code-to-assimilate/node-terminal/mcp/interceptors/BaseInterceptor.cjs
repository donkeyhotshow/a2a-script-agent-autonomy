/**
 * BaseInterceptor - Базовый класс для перехватчиков команд
 * Определяет общий интерфейс для всех перехватчиков
 */

const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');

class BaseInterceptor {
    constructor() {
        this.name = 'base';
        this.priority = 0;
    }

    /**
     * Проверяет, может ли перехватчик обработать команду
     */
    canHandle(command) {
        return false;
    }

    /**
     * Обрабатывает команду
     */
    async handle(command, context = {}) {
        throw errorUtils.createError('Method handle must be implemented');
    }

    /**
     * Получает информацию о перехватчике
     */
    getInfo() {
        return {
            name: this.name,
            priority: this.priority,
            description: 'Base command interceptor'
        };
    }

    /**
     * Валидация команды
     */
    validateCommand(command) {
        if (!command || typeof command !== 'string') {
            throw errorUtils.createError('Command must be a non-empty string');
        }
        return true;
    }

    /**
     * Логирование действий перехватчика
     */
    logAction(action, details = {}) {
        // Базовое логирование - может быть переопределено в наследниках
        console.log(`[${this.name}] ${action}:`, details);
    }

    /**
     * Получение приоритета перехватчика
     */
    getPriority() {
        return this.priority;
    }

    /**
     * Установка приоритета перехватчика
     */
    setPriority(priority) {
        this.priority = priority;
    }
}

module.exports = {BaseInterceptor};

