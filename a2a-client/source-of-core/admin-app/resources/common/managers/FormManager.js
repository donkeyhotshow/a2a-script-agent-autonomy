import StateManager from './include/StateManager.js'
import { reactive } from 'vue'

class FormManager extends StateManager {
    constructor(hub) {
        super(hub)
        this.hub.debug('FormManager', 'constructor', 'initialized')
    }

    initializeForms() {
        const models = this.hub.$page.props.forms || {}
        Object.keys(models).forEach(formName => {
            const formData = models[formName]
            this.registerForm(formName, {}, formData ?? {})
        })
    }

    getField(formName, fieldName) {
        const form = this.get(formName)
        return form && form.fields.has(fieldName) ? form.fields.get(fieldName) : undefined
    }

    /**
     * Регистрирует форму и связанные с ней поля
     * @param {string} formName - Имя формы
     * @param {object} formConfig - Конфигурация формы
     * @param {object} fields - Поля формы
     */
    registerForm(formName, formConfig, fields = {}) {
        this.hub.debug('FormManager', 'registerForm', `Registering form "${formName}" with config: ${formConfig} and fields: ${fields}`)
        let form = this.get(formName)
        if (!form) {
            this.create(formName, {
                config: formConfig,
                fields: reactive(new Map()),
                pending: false,
                error: null,
            })
        }
        this.initializeFields(formName, fields)
        return this.get(formName)
    }

    /**
     * Инициализирует поля формы
     * @param {string} formName - Имя формы
     * @param {object} fields - Поля для инициализации
     */
    initializeFields(formName, fields) {
        this.hub.debug('FormManager', 'initializeFields', `Initializing fields for form "${formName}" with data:`, fields)
        const form = this.get(formName)
        if (form) {
            Object.keys(fields).forEach(fieldName => {
                const fieldValue = fields[fieldName]
                form.fields.set(fieldName, {
                    value: fieldValue,
                    visible: true,
                    // Добавьте дополнительные конфигурации поля, если необходимо
                })
                this.hub.debug('FormManager', 'initializeFields', `Field "${fieldName}" registered in form "${formName}" with value:`, fieldValue)
            })
        }
    }

    /**
     * Получает данные формы
     * @param {string} formName - Имя формы
     * @returns {object} Данные формы
     */
    getData(formName) {
        const form = this.get(formName)
        const data = {}
        if (!form) {
            this.hub.debug('FormManager', 'getData', `getData: Form "${formName}" not found.`) // Добавлено предупреждение, если форма не найдена
            return data // Возвращаем пустой объект, если форма не найдена
        }

        if (!form.fields || form.fields.size === 0) {
            this.hub.debug('FormManager', 'getData', `getData: Form "${formName}" has no fields.`) // Добавлено предупреждение, если в форме нет полей
            return data // Возвращаем пустой объект, если в форме нет полей
        }

        this.hub.debug('FormManager', 'getData', `Getting data for form "${formName}". Fields:`, form.fields) // Debug log
        if (form) {
            form.fields.forEach((field, name) => { // Используем forEach для итерации по Map
                data[name] = field.value
                this.hub.debug('FormManager', 'getData', `Field "${name}" value:`, field.value) // Log field values
            })
        }
        this.hub.debug('FormManager', 'getData', `!!!getData return form:`, formName, data)
        return data
    }

    /**
     * Обновляет значение поля в форме
     * @param {string} formName - Имя формы
     * @param {string} fieldName - Имя поля
     * @param {*} value - Новое значение
     */
    updateFieldValue(formName, fieldName, value) {
        this.hub.debug('FormManager', 'updateFieldValue', `Updating field "${fieldName}" for form "${formName}" to value:`, value)
        const form = this.get(formName)
        if (form && form.fields.has(fieldName)) {
            form.fields.set(fieldName, { ...form.fields.get(fieldName), value })
            // this.hub.notifyManager.emit('fieldChange', { formName, fieldName, value });
            this.hub.debug('FormManager', 'updateFieldValue', `Field "${fieldName}" updated in form "${formName}". Value:`, value)
        } else {
            this.hub.debug('FormManager', 'updateFieldValue2', `Field "${fieldName}" not found in form "${formName}". Registering with default value.`)
            this.registerField(formName, fieldName) // Removed initialValue parameter
        }
    }

    /**
     * Регистрирует отдельное поле в форме и возвращает реактивную переменную для v-model
     * @param {string} formName - Имя формы
     * @param {string} fieldName - Имя поля
     * @returns {object} Реактивная переменная для v-model
     */
    registerField(formName, fieldName) { // Removed initialValue parameter
        this.hub.debug('FormManager', 'registerField', `Registering field "${fieldName}" for form "${formName}".`)
        let form = this.get(formName)
        if (!form) {
            this.hub.debug('FormManager', 'registerField2', `Form "${formName}" does not exist. Registering form with field "${fieldName}".`)
            this.registerForm(formName, {}, { [fieldName]: '' }) // Initialize with default value
            form = this.get(formName)
        }
        if (!form.fields.has(fieldName)) {
            form.fields.set(fieldName, {
                value: '',
                visible: true,
            })
            this.hub.debug('FormManager', 'registerField3', `Field "${fieldName}" registered in form "${formName}" with default value.`)
        } else {
            this.hub.debug('FormManager', 'registerField4', `Field "${fieldName}" already exists in form "${formName}".`)
        }

        // Возвращаем реактивную переменную для v-model
        return form.fields.get(fieldName)
    }

    /**
     * Получает форму по имени
     * @param {string} formName - Имя формы
     * @returns {object|undefined} Объект формы или undefined
     */
    getForm(formName) {
        this.hub.debug('FormManager', 'getForm', `Retrieving form "${formName}".`)
        return this.get(formName)
    }

    /**
     * Подготавливает форму перед отправкой
     * @param {string} formName - Имя формы
     */
    prepareForm(formName) {
        this.hub.debug('FormManager', 'prepareForm', `Preparing form "${formName}" for submission.`) // Log form preparation
        const form = this.get(formName)
        if (form) {
            form.pending = true
            form.error = null
        }
        return form
    }

    /**
     * Обрабатывает успешную отправку формы
     * @param {string} formName - Имя формы
     * @param {object} response - Ответ сервера
     */
    handleFormSuccess(formName, response) {
        this.hub.debug('FormManager', 'handleFormSuccess', `Form "${formName}" submitted successfully. Response:`, response)
        const form = this.get(formName)
        if (form) {
            form.pending = false
            // Обновите форму на основе ответа, если необходимо
        }
        return form
    }

    /**
     * Обрабатывает ошибку при отправке формы
     * @param {string} formName - Имя формы
     * @param {object} error - Объект ошибки
     */
    handleFormError(formName, error) {
        this.hub.debug('FormManager', 'handleFormError', `Error submitting form "${formName}":`, error)
        const form = this.get(formName)
        if (form) {
            form.pending = false
            form.error = error.message || 'Произошла ошибка при отправке формы.'
        }
        return form
    }
}

export default FormManager
