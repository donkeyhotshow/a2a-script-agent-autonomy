import RegularManager from './RegularManager.js'
import { generateId } from '../imports/data.js'
import { reactive } from 'vue'

class StateManager extends RegularManager {
    generateId = generateId.bind(this)

    constructor(hub) {
        super(hub)
        // managerName = this.constructor.name
        this.reactiveState = reactive(new Map())
    }

    register(name, instance) {

        if (this.reactiveState.has(name)) {
            this.hub.logManager.warn(`Переопределение существующей регистрации: ${name}`)
        }
        this.reactiveState.set(name, instance)
    }

    get(name) {
        return this.reactiveState?.get(name)
    }

    show(name) {
        const item = this.get(name)
        if (item) {
            item.visible = true
            // this.emit(`${name}Shown`, item);
        }
    }

    hide(name) {
        const item = this.get(name)
        if (item) {
            item.visible = false
            // this.emit(`${name}Hidden`, item);
        }
    }

    update(name, config) {
        const item = this.get(name)
        if (item) item.config = config
    }


    validate(name) {
        // return new Promise((resolve) => {
        //     resolve(true);
        // });
    }


    remove(name) {
        if (this.reactiveState?.has(name)) {
            this.reactiveState.delete(name)
            // this.emit(`${name}Removed`, name);
        }
    }

    /**
     * Создает новый элемент в менеджере
     * @param {string} type - Тип элемента
     * @param {string} name - Имя элемента
     * @param {object} config - Конфигурация элемента
     */
    create(name, config) {
        if (this.reactiveState.has(name)) {
            this.hub.logManager.warn(`Элемент с именем ${name} уже существует.`)
            return
        }
        this.reactiveState.set(name, config)
        // this.emit(`${name}Created`, config);
    }

    /**
     * Очищает все элементы определенного типа
     * @param {string} type - Тип элементов для очистки
     */
    clear(type) {
        if (this.reactiveState) {
            this.reactiveState.clear()
            // this.emit(`${type}Cleared`);
        } else {
            this.hub.logManager.warn(`Тип ${type} не существует и не может быть очищен.`)
        }
    }

    // Функция для подсветки компонента
    highlight(name) {
        const component = this.get(name)
        if (component) {
            component.highlighted = true
            // this.emit('componentHighlighted', component);
        } else {
            this.hub.debug('ComponentManager', 'highlight', `Component ${name} not found.`)
        }
    }

    // Пример функции для удаления подсветки
    unhighlight(name) {
        const component = this.get(name)
        if (component && component.highlighted) {
            component.highlighted = false
            // this.emit('componentUnhighlighted', component);
        } else {
            this.hub.debug('ComponentManager', 'unhighlight', `Component ${name} not found.`)
        }
    }
}

export default StateManager
