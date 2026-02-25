const { validationUtils } = require('@libs/validation/validation/validation-utils');
import { reactive } from 'vue'
import { generateId } from '@common/managers/imports/data.js'
import RegularManager from '@common/managers/include/RegularManager.js'

class ToastManager extends RegularManager {
    constructor(hub) {
        super(hub)
        this.state = reactive({
            queue: [],
            history: [],
            maxHistory: 50,
            defaultOptions: {
                life: 3000,
                group: 'main',
                closable: true,
            },
        })
    }

    show(severity, summary, detail = '', options = {}) {
        //    this.hub.debug('ToastManager', 'show', `Toast will be shown `, severity, summary, detail, options);
        const toast = {
            id: generateId(),
            severity,
            summary,
            detail,
            ...this.state.defaultOptions,
            ...options,
            timestamp: new Date(),
        }

        this.state.queue.push(toast)
        this.state.history.unshift(toast)

        if (this.state.history.length > this.state.maxHistory) {
            this.state.history.pop()
        }

        // if (this.hub.toast && validationUtils.isFunction(this.hub.toast.add )) {
        this.hub.debug('ToastManager', 'show', `Toast will be shown `, toast)
        this.hub.toast.add({
            severity: toast.severity,
            summary: toast.summary,
            detail: toast.detail,
            life: toast.life,
            group: toast.group,
            closable: toast.closable,
        })
        // } else if (this.hub.$app?.config?.globalProperties?.$toast && validationUtils.isFunction(this.hub.$app.config.globalProperties.$toast.add )) {
        //     this.hub.debug('ToastManager', 'show', `Toast shown REQUEST 3`, toast);
        //     this.hub.$app.config.globalProperties.$toast.add({
        //         severity: toast.severity,
        //         summary: toast.summary,
        //         detail: toast.detail,
        //         life: toast.life,
        //         group: toast.group,
        //         closable: toast.closable
        //     });
        // } else {
        //     this.hub.debug('ToastManager', 'show', `Toast shown REQUEST 3`, toast);
        // }

        this.hub.debug('ToastManager', 'show', `Toast shown`, toast.id)
        return toast.id
    }

    success(summary, detail = '', options = {}) {
        return this.show('success', summary, detail, options)
    }

    info(summary, detail = '', options = {}) {
        return this.show('info', summary, detail, options)
    }

    warn(summary, detail = '', options = {}) {
        return this.show('warn', summary, detail, options)
    }

    error(summary, detail = '', options = {}) {
        return this.show('error', summary, detail, {
            life: 5000,
            closable: true,
            ...options,
        })
    }

    clear(group = 'main') {
        if (this.$app?.config?.globalProperties?.$toast) {
            this.$app.config.globalProperties.$toast.remove({ group })
        }
        this.state.queue = this.state.queue.filter(t => t.group !== group)
    }

    clearAll() {
        if (this.$app?.config?.globalProperties?.$toast) {
            this.$app.config.globalProperties.$toast.removeAllGroups()
        }
        this.state.queue = []
    }

    getHistory(severity = null) {
        if (!severity) return this.state.history
        return this.state.history.filter(t => t.severity === severity)
    }

    setDefaultOptions(options) {
        Object.assign(this.state.defaultOptions, options)
    }
}

export default ToastManager
