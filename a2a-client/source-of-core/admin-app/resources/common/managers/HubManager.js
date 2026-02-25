const { validationUtils } = require('@libs/validation/validation/validation-utils');
const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
import LogManager from './private/log/LogManager.js'
import NotifyManager from './NotifyManager.js'
import FormManager from './FormManager.js'
import STANDARD_EVENTS from './constants/events.js'
import ThemeManager from './ThemeManager.js'
import { reactive, toRaw } from 'vue'
import AlertManager from './private/log/AlertManager.js'
import ToastManager from './private/log/ToastManager.js'
import ComponentManager from './ComponentManager.js'
import LayoutManager from './LayoutManager.js'
import MenuManager from './MenuManager.js'
import ModalManager from './ModalManager.js'
import SplitterManager from './SplitterManager.js'
import TimerManager from './TimerManager.js'
import PropsManager from './PropsManager.js'
import ActionManager from './ActionManager.js'
import StateManager from './include/StateManager.js'

class HubManager extends StateManager {
    // show = show.bind(this)
    // hide = hide.bind(this)

    allowedItemsToOutput = [
        /.*/,
        /groupName\..*/,
        // /VModel\..*/,
        // /PropsManager\..*/,
        // /ActionManager\..*/,
        // /FormManager\..*/,
        // /customHooks\..*/,
        // /Presets\..*/,
        /HubManager\..*/,
    ]

    constructor() {
        super()
        this.state = reactive({
            events: new Map(),
            eventHistory: [],
            eventSettings: {
                debug: true,
                logLevel: 'info',
                toast: true,
            },
            requestQueue: [],
        })

        this.customHooks = new Map()


    }

    install(app) {

        this.$app = app
        this.$page = app.config.globalProperties.$page

        this.logManager = new LogManager(this)
        this.propsManager = new PropsManager(this)
        this.notifyManager = new NotifyManager(this)
        this.formManager = new FormManager(this)
        this.componentManager = new ComponentManager(this)
        this.layoutManager = new LayoutManager(this)
        this.menuManager = new MenuManager(this)
        this.modalManager = new ModalManager(this)
        this.splitterManager = new SplitterManager(this)
        this.timerManager = new TimerManager(this)
        this.themeManager = new ThemeManager(this)
        this.alertManager = new AlertManager(this)
        this.toastManager = new ToastManager(this)
        this.actionManager = new ActionManager(this)

        // Предоставление менеджеров через provide
        app.provide('hub', this)
        // app.provide('logManager', this.logManager);
        // app.provide('notifyManager', this.notifyManager);
        // app.provide('formManager', this.formManager);
        // app.provide('componentManager', this.componentManager);
        // app.provide('layoutManager', this.layoutManager);
        // app.provide('menuManager', this.menuManager);
        // app.provide('modalManager', this.modalManager);
        // app.provide('splitterManager', this.splitterManager);
        // app.provide('timerManager', this.timerManager);
        // app.provide('themeManager', this.themeManager);
        // app.provide('alertManager', this.alertManager);
        // app.provide('toastManager', this.toastManager);
        // app.provide('actionManager', this.actionManager);

        // Регистрация плагина
        // app.use(this.notifyManager);
        // app.use(this.logManager);
        // app.use(this.formManager);
        // app.use(this.componentManager);
        // app.use(this.layoutManager);
        // app.use(this.menuManager);
        // app.use(this.modalManager);
        // app.use(this.splitterManager);
        // app.use(this.timerManager);
        // app.use(this.themeManager);
        // app.use(this.alertManager);
        // app.use(this.toastManager);
        // app.use(this.actionManager);

        this.setupEventCustomHooks()
    }

    update(path, value) {
        const keys = path.split('.')
        let current = this.state

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {}
            }
            current = current[keys[i]]
        }

        current[keys[keys.length - 1]] = value
        this.debug('HubManagerOk', 'update', `State updated at path "${path}" with value:`, value)
    }

    get(path, defaultValue = null) {
        const keys = path.split('.')
        let current = this.state

        for (const key of keys) {
            if (!(key in current)) {
                this.debug('HubManagerOk', 'get', `Path "${path}" not found. Returning default value.`)
                return defaultValue
            }
            current = current[key]
        }

        return current
    }

    // registerStandardEventHandlers() {
    //     // this.hub.notifyManager.on('sendData', this.handleSendData.bind(this));
    //     // this.hub.notifyManager.on('sendBatch', this.handleSendBatch.bind(this));
    // }

    handleSendBatch(batch) {
        this.debug('HubManager', 'handleSendBatch', `Handling sendBatch event with batch:`, batch)
        this.sendData(batch, null, '/batch-endpoint')
    }

    handleStandardEvent(eventCode, data = {}, options = {}) {
        const eventConfig = STANDARD_EVENTS[eventCode]

        if (!eventConfig) {
            if (this.state.eventSettings.debug) {
                this.debug('HubManager', 'handleStandardEvent', `Unknown event code: ${eventCode}`)
                this.alertManager.showAlert(`Неизвестный код события: ${eventCode}`)
            }
            return
        }


        const mergedOptions = {
            ...this.state.eventSettings,
            ...eventConfig.options,
            ...options,
        }


        const levelPriority = ['error', 'warn', 'info', 'debug', 'success']
        const currentLevel = levelPriority.indexOf(mergedOptions.logLevel)
        const eventLevel = levelPriority.indexOf(eventConfig.level)

        if (eventLevel > currentLevel) return


        const modules = eventConfig.modules.map(modulePath => {
            const parts = modulePath.split('.')
            return parts.reduce((acc, part) => acc?.[part], this)
        }).filter(Boolean)


        if (modules.length === 0) {
            modules.push(this.logManager, this.toastManager)
        }


        errorUtils.safeExecute(async () => {

            if (mergedOptions.debug) {
                this.alertManager.showAlert(`Event: ${eventCode}\nLevel: ${eventConfig.level}\nModules: ${eventConfig.modules.join(', ')}`)
            }

            modules.forEach(module => {
                if (!module) return

                const handler = module[eventConfig.name]
                if (validationUtils.isFunction(handler )) {
                    handler(data, mergedOptions)
                }
            })

            this.notifyManager.emit(eventConfig.name, data)
            this.debug('HubManager', 'handleStandardEvent', `Handled standard event "${eventCode}" with data:`, data)
        
}, 'error'):`, error)
            if (mergedOptions.debug) {
                this.alertManager.showAlert(`Ошибка обработки события: ${error.message}`)
            }
        }
    }

    setupEventCustomHooks() {
        Object.keys(STANDARD_EVENTS).forEach(eventKey => {
            const eventConfig = STANDARD_EVENTS[eventKey]
            if (eventConfig && eventConfig.name) {
                // alert("subscribing eventConfig.name "+eventConfig.name);
                this.notifyManager.on(eventConfig.name, (payload) => {
                    this.debug('HubManager', 'setupEventCustomHooks', `event by name `, eventConfig.name, ' ', eventConfig, ' ', payload)
                    this.handleSystemEvent(eventConfig, payload)
                })
            }
            if (eventConfig) {
                // alert("subscribing eventKey "+eventKey);
                this.notifyManager.on(eventKey, (payload) => {
                    this.debug('HubManager', 'setupEventCustomHooks', `event by key `, eventKey, ' ', eventConfig, ' ', payload)
                    this.handleSystemEvent(eventConfig, payload)
                })
            }

        })
    }

    handleSystemEvent(eventConfig, payload) {
        this.debug('HubManager', 'handleSystemEvent', `handleSystemEvent`, eventConfig, payload)
        eventConfig.modules.forEach(module => {
            switch (module) {
            case '$hub.$log':
                this.handleLog(eventConfig.level, payload.message || '')
                break
            case '$hub.$toast':
                this.handleToast(eventConfig.level, payload.message || '', eventConfig.options)
                break
            case '$hub.$alert':
                this.handleAlert(payload.message || '')
                break
            default:
                this.debug('HubManager', 'handleSystemEvent', `Unknown system module: ${module}`)
            }
        })
    }

    handleLog(level, message) {
        if (this.$log) {
            this.debug('HubManager', 'handleLog', `handleLog`, this.logManager, level, message)
            this.logManager[level](message)
        } else {
            this.debug('HubManager', 'handleLog', `LogManager is not available.`)
        }
    }

    handleToast(level, message, options = {}) {
        if (this.$toast) {
            this.debug('HubManager', 'handleToast', `handleToast`, this.toastManager, level, message, options)
            this.toastManager.show(
                level,
                level.charAt(0).toUpperCase() + level.slice(1), message,
                {
                    life: options.toastDuration || 3000,
                    position: options.toastPosition || 'top-right',
                },
            )
        } else {
            this.debug('HubManager', 'handleToast', `Toast component is not available.`)
        }
    }

    handleAlert(message) {
        this.debug('HubManager', 'handleAlert', `handleAlert`, this.alertManager, message)
        this.alertManager.showAlert(message)
    }

    //     beforeUnmount() {
    // в менеджере ненужен
    // Object.keys(STANDARD_EVENTS).forEach(eventKey => {
    //   const eventConfig = STANDARD_EVENTS[eventKey];
    //   if (eventConfig && eventConfig.name) {
    //     this.$event.off(eventConfig.name, this.handleSystemEvent);
    //   }
    // });}


    //================================================================
    //================================================================
    //================================================================


    // processRequestData(data) {
    //     return Object.fromEntries(
    //         Object.entries(data).map(([key, value]) => [key, toRaw(value)])
    //     );
    // }

    // logEvent(eventName, data, options = {}) {
    //     const logOptions = {
    //         ...STANDARD_EVENTS[eventName.toUpperCase()]?.options,
    //         ...options
    //     };

    //     if (logOptions.debug) {
    //         this.debug('HubManager', 'logEvent', `[${eventName}] Event Data:`, data);
    //     }

    //     if (logOptions.showToast) {
    //         this.toastManager.info(`${eventName} processed`);
    //     }
    // }

    //не забыть забрать с собой   this.state.requestQueue
    //  handleRequestStart(eventData) {
    //     this.state.requestQueue.push(eventData);
    //     this.debug('HubManager', 'handleRequestStart', `Request started:`, eventData);
    // }

    // handleRequestFinish(eventData) {
    //     const index = this.state.requestQueue.findIndex(e => e === eventData);
    //     if (index !== -1) {
    //         this.state.requestQueue.splice(index, 1);
    //         this.debug('HubManager', 'handleRequestFinish', `Request finished:`, eventData);
    //     }
    // }

    // handleRequestError(error, eventData) {
    //     this.debug('HubManager', 'handleRequestError', `Request Error:`, error);
    //     this.toastManager.error(`Error in ${eventData.path}: ${error.message}`);
    // }

    // Методы для взаимодействия с менеджерами
    // updateLog(data) {
    //     this.logManager.update(data);
    // }

    // emitEvent(eventName, payload) {
    //     this.notifyManager.emit(eventName, payload);
    // }

    debug(module, name, message) {
        const currentItem = `${module}.${name}`
        const currentItemOutput = `'${module}', '${name}'`
        if (this.allowedItemsToOutput.some(item => item.test(currentItem))) {
            consoleUtils.log('DEBUG:', currentItemOutput, message)
        }
    }
}

export default HubManager
