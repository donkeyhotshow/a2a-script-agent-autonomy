const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
import { generateId } from '@common/managers/imports/data.js'

class RegularManager {
    // emit(event, payload) {
    //     this.hub.notifyManager.emit(event, payload);
    // }

    // emit(event, data) {
    //     this.hub.notifyManager.emit(event, data);
    //     this.hub.debug('LocalManager', 'emit', `Emitted event "${event}" with data:`, data);
    // }

    constructor(hub) {
        this.hub = hub
    }

    // log(level, message, context = {}) {
    //     this.emit('log', {level, message, context});
    //     consoleUtils.log(`[${level.toUpperCase()}] ${message}`, context);
    // }

    // log(...args) {
    //     this.logManager.log(...args);
    // }

    // showToast(severity, summary, detail = '', options = {}) {
    //     const toast = {
    //         id: generateId(),
    //         severity,
    //         summary,
    //         detail,
    //         timestamp: new Date(),
    //         ...options
    //     };

    //     this.$hub.$toast?.show(toast);
    // }
}

export default RegularManager


// это курсор хотел мне преизобрести евентбас
// onEvent(event, handler) {
//     this.$notify.on(event, handler);
//     consoleUtils.log(`Registered handler for event "${event}".`);
// }
//
// offEvent(event, handler) {
//     this.$event.off(event, handler);
//     consoleUtils.log(`Deregistered handler for event "${event}".`);
// }
