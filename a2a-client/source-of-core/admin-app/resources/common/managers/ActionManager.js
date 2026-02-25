const { validationUtils } = require('@libs/validation/validation/validation-utils');
const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
import { router } from '@inertiajs/vue3'
import RegularManager from './include/RegularManager.js'
import { toRaw } from 'vue'

class ActionManager extends RegularManager {

    navigateTo(params, instance) {
        if (params && params.route) {
            router.get(params.route)
        } else {
            consoleUtils.warn(`Маршрут отсутствует для navigateTo действия.`)
        }
    }

    /**
     * Изменяет атрибуты целевого элемента
     * @param {Object} data - Данные для изменения атрибута
     * @param {HTMLElement} element - Целевой элемент
     */
    changeAttribute(data, element) {
        const { target, attribute, value, add } = data

        if (element) {
            if (attribute === 'class') {
                if (add) {
                    element.classList.add(value)
                } else {
                    element.classList.remove(value)
                }
                // Эмитируем событие для обновления компонента
                this.hub.notifyManager.emit(target, {
                    action: 'forceUpdate',
                    source: target,
                })
            } else {
                this.hub.debug('ActionManager', 'changeAttribute', `Attribute '${attribute}' is not supported for modification`)
            }
        } else {
            this.hub.debug('ActionManager', 'changeAttribute', `Component with vAddress '${target}' not found`)
        }
    }

    /**
     * Переключает CSS класс целевого элемента
     * @param {Object} data - Данные для переключения класса { target: string, class: string }
     * @param {HTMLElement} element - Целевой элемент
     */
    toggleClass(data) {
        let selector = data.data.selector
        let className = data.data.class
        let element = document.querySelector(selector)
        if (element) {
            element.classList.toggle(className)
            // Эмитируем событие для обновления компонента, если необходимо
            this.hub.notifyManager.emit(target, {
                action: 'forceUpdate',
                source: target,
            })
        } else {
            this.hub.debug('ActionManager', 'toggleClass', `Component with vAddress '${target}' not found`)
        }
    }

    /**
     * Показывает alert с заданным сообщением
     * @param {Object} data - Данные для alert
     */
    alert(data) {
        const { message } = data
        alert(message || 'Alert!')
    }

    /**
     * Копирует текст из модели формы в буфер обмена
     * @param {Object} data - Данные для копирования
     *                        { form: string, field: string }
     */
    async copyToClipboard(data) {
        const { form, field } = data
        const formData = this.hub.formManager.getData(form)
        const value = formData[field]

        if (value) {
            errorUtils.safeExecute(async () => {

                await navigator.clipboard.writeText(value)
                this.hub.toastManager.show('success', 'Скопировано', 'Текст успешно скопирован', { life: 3000 })
            
}, 'err'))
            }
        } else {
            this.hub.debug('ActionManager', 'copyToClipboard', `Value for form '${form}' and field '${field}' is not available for copying`)
        }
    }

    /**
     * Форсирует обновление компонента
     */
    forceUpdate() {
        this.hub.forceUpdate = !this.hub.forceUpdate
    }

    /**
     * Отправляет данные через Inertia
     * @param {Object} data - Данные для отправки
     */
    formInputData(inputData) {
        this.hub.debug('ActionManager', 'formInputData', `Handling SEND_DATA event with payload:`, inputData)
        if (!inputData.sendTo) {
            this.hub.debug('ActionManager', 'formInputData', `Action is not defined`)
            return
        }
        if (!inputData.payload) {
            this.hub.debug('ActionManager', 'formInputData', `payload is not defined`)
            inputData.payload = this.getModelData(inputData)
            this.hub.debug('ActionManager', 'formInputDatadd', `inputData:`, inputData)
        }
        return inputData
    }

    getModelData(inputData) {
        const formName = inputData.form || null
        const fieldName = inputData.field || null
        const data = this.hub.formManager.getData(formName)

        if (fieldName) {
            return (data && data[fieldName] !== undefined) ? data[fieldName] : null
        }
        return data
    }

    sendData(data, options = {}, pathToRequest = window.location.pathname) {

        const commands = []

        const inputDataArray = (data)
        if (validationUtils.isArray(inputDataArray)) {
            inputDataArray.forEach(inputData => {
                const formInputData = this.formInputData({ ...inputData })
                commands.push(formInputData)
            })
        } else {
            const formInputData = this.formInputData({ ...inputDataArray })
            commands.push(formInputData)
        }


        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            onStart: (resp) => {
                this.hub.debug('ActionManager', 'sendData', `onStart`, resp, inputDataArray)
                if (options?.onStart) options.onStart(resp)
                commands.forEach(command => {

                    if (command && command.form) {
                        const form = this.hub.formManager.prepareForm(command.form)
                    }
                })

            },
            onFinish: (resp) => {
                if (options?.onFinish) options.onFinish(resp)
                this.hub.debug('ActionManager', 'sendData', `onFinish`, resp)
            },
            onSuccess: (page) => {
                this.hub.debug('ActionManager', 'sendData', `onSuccess `, page)
                if (options?.onSuccess) options.onSuccess(page)
                commands.forEach(command => {
                    if (command && command.form) {
                        const form = this.hub.formManager.handleFormSuccess(command.form, page)
                    }
                })
            },
            onError: (errors) => {
                this.error = 'An error occurred during the request.'
                if (options?.onError) options.onError(errors)

                // Utilize Spatie's error solutions
                Solutions.handle(errors) // Correctly call the handle method
                this.hub.debug('ActionManager', 'sendData', `onError`, errors)
                commands.forEach(command => {
                    if (command && command.form) {
                        const form = this.hub.formManager.handleFormError(command.form, errors)
                    }
                })


            },
        }


        errorUtils.safeExecute(async () => {

            router.post(pathToRequest, commands, requestOptions)
        
}, 'error')
    }
}

export default ActionManager
