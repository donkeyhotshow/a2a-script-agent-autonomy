/**
 * PropsManager
 *
 * Предназначен для объединения свойств контейнера:
 *  - Сначала берутся свойства из container.props
 *  - Затем данные из container.model (options, optionLabel, optionValue)
 *  - Для вложенных настроек (pt) создаются ключи вида "pt:{ключ}:{опция}"
 *
 * Дополнительно предоставляет метод mergeClasses, который объединяет строки с CSS-классами,
 * учитывая приоритет: Vue Flow > Primevue > Tailwind.
 *
 * Расширение: теперь PropsManager поддерживает подписку на изменения через onChange/offChange.
 *
 * Использование в Options API:
 *   import PropsManager from '@common/managers/PropsManager.js';
 *   ...
 *   const boundProps = PropsManager.bindProps(container);
 *   const mergedClasses = PropsManager.mergeClasses(vueFlowClass, primeVueClass, tailwindClass);
 */

const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
import RegularManager from './include/RegularManager.js'

class PropsManager extends RegularManager {
    // constructor(hub) {
    //     super(hub);
    //     // Инициализация синглтона
    //     if (!PropsManager.instance) {
    //         this.props = {};
    //         this.customHooks = {}; // для подписки на изменения props
    //         PropsManager.instance = this;
    //     }
    //     return PropsManager.instance;
    // }

    // Other existing methods...

    /**
     * Подписывается на изменения свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {Function} callback - Функция обратного вызова, которая будет вызвана при изменении.
     */
    onChange(key, callback) {
        if (!this.customHooks[key]) {
            this.customHooks[key] = []
        }
        this.customHooks[key].push(callback)
    }

    /**
     * Отписывается от изменений свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {Function} callback - Функция обратного вызова для удаления.
     */
    offChange(key, callback) {
        if (!this.customHooks[key]) return
        this.customHooks[key] = this.customHooks[key].filter(cb => cb !== callback)
    }

    /**
     * Уведомляет подписчиков об изменении свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {*} value - Новое значение свойства.
     */
    notifyChange(key, value) {
        if (this.customHooks[key]) {
            this.customHooks[key].forEach(callback => callback(value))
        }
    }

    constructor(hub) {
        super(hub)
        // Инициализация синглтона
        if (!PropsManager.instance) {
            this.props = {}
            this.customHooks = {} // для подписки на изменения props
            PropsManager.instance = this
        }
        return PropsManager.instance
    }

    /**
     * Объединяет свойства из контейнера компонента с данными модели.
     *
     * @param {Object} container - Объект, содержащий props, модель и дополнительные настройки.
     * @returns {Object} - Объединённый объект свойств для компонента.
     */
    bindModel(container) {
        // const props = this.bindProps(container);

        let ret = {}
        if (container.model && container.model.field) {
            const formName = container.model.form || null
            const fieldName = container.model.field
            const field = formName
                ? this.hub.formManager.getForm(formName)?.fields.get(fieldName)
                : this.hub.formManager.getForm(null)?.fields.get(fieldName)

            if (field) {
                this.hub.debug('PropsManager', 'bindModel', `Field "${fieldName}" is registered.`)
                ret[fieldName] = field.value
            } else {
                this.hub.debug('PropsManager', 'bindModel', `Field "${fieldName}" is not registered yet.`)
                ret[fieldName] = container.model.default || null
            }
        }

        // return props;
        return ret
    }

    /**
     * Объединяет свойства из контейнера компонента с данными модели.
     *
     * @param {Object} container - Объект, содержащий props, модель и дополнительные настройки.
     * @returns {Object} - Объединённый объект свойств для компонента.
     */
    bindProps(container) {
        // Клонирование props из контейнера или создание пустого объекта
        const props = { ...(container?.props || {}) }

        // Добавление данных модели, если они присутствуют
        if (container.model) {
            props.options = container.model.options
            props.optionLabel = container.model.optionLabel
            props.optionValue = container.model.optionValue
        }

        if (container.url) {
            alert('url found')
        }

        if (container.shortcut) {
            alert('shortcut found')
        }

        // Обработка вложенных настроек "pt"
        if (container.props && container.props.pt) {
            Object.keys(container.props.pt).forEach((key) => {
                const ptElement = container.props.pt[key]
                if (ptElement) {
                    Object.keys(ptElement).forEach((ptKey) => {
                        errorUtils.safeExecute(async () => {

                            const ptValue = ptElement[ptKey]
                            props[`pt:${key}:${ptKey}`] = ptValue
                        
}, 'error') для ${key}:`, error)
                        }
                    })
                }
            })
        }

        return props
    }

    /**
     * Подписывается на изменения свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {Function} callback - Функция обратного вызова, которая будет вызвана при изменении.
     */
    // onChange(key, callback) {
    //     if (!this.customHooks[key]) {
    //         this.customHooks[key] = [];
    //     }
    //     this.customHooks[key].push(callback);
    // }

    /**
     * Отписывается от изменений свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {Function} callback - Функция обратного вызова для удаления.
     */
    // offChange(key, callback) {
    //     if (!this.customHooks[key]) return;
    //     this.customHooks[key] = this.customHooks[key].filter(cb => cb !== callback);
    // }

    /**
     * Уведомляет подписчиков об изменении свойства.
     *
     * @param {string} key - Ключ свойства.
     * @param {*} value - Новое значение свойства.
     */
    // notifyChange(key, value) {
    //     if (this.customHooks[key]) {
    //         this.customHooks[key].forEach(callback => callback(value));
    //     }
    // }

    /**
     * Объединяет строки с CSS-классами, учитывая приоритет: Vue Flow > Primevue > Tailwind.
     *
     * @param {string} vueFlowClass - Класс из Vue Flow.
     * @param {string} primeVueClass - Класс из Primevue.
     * @param {string} tailwindClass - Класс из Tailwind.
     * @returns {string} - Объединённая строка CSS-классов.
     */
    // mergeClasses(vueFlowClass, primeVueClass, tailwindClass) {
    //     const classes = [];
    //     if (vueFlowClass) classes.push(vueFlowClass);
    //     if (primeVueClass) classes.push(primeVueClass);
    //     if (tailwindClass) classes.push(tailwindClass);
    //     return classes.join(" ");
    // }

    /**
     * Устанавливает свойство.
     *
     * @param {string} key - Ключ свойства.
     * @param {*} value - Значение свойства.
     */
    setProp(key, value) {
        this.props[key] = value
        // this.notifyChange(key, value);
    }

    /**
     * Получает свойство.
     *
     * @param {string} key - Ключ свойства.
     * @returns {*} - Значение свойства.
     */
    getProp(key) {
        return this.props[key]
    }

    /**
     * Удаляет свойство.
     *
     * @param {string} key - Ключ свойства.
     */
    removeProp(key) {
        delete this.props[key]
        // this.notifyChange(key, null);
    }

    /**
     * Создает новое свойство.
     *
     * @param {string} key - Ключ свойства.
     * @param {*} value - Значение свойства.
     */
    createProp(key, value) {
        this.create('prop', key, value)
    }

    /**
     * Очищает все свойства.
     */
    // clearProps() {
    //     this.clear('prop');
    // }
}

export default PropsManager
