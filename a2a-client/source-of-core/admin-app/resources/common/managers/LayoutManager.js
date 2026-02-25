const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
import RegularManager from './include/RegularManager.js'

class LayoutManager extends RegularManager {
    // constructor(hub) {
    //     super(hub);
    //     this.layouts = new Map(); // Store layouts
    // }

    register(name, layout) {
        this.layouts.set(name, layout)
    }

    get(name) {
        return this.layouts.get(name)
    }

    show(name) {
        const layout = this.get(name)
        if (layout) {
            layout.visible = true // Set visible state
            // Logic to show the layout
        }
    }

    hide(name) {
        const layout = this.get(name)
        if (layout) {
            layout.visible = false // Set visible state to false
            // Logic to hide the layout
        }
    }

    constructor(hub) {
        super(hub)
    }

    // bindEvents(events, emit) {
    //     const boundEvents = {};
    //     if (!events) return boundEvents;
    //     Object.keys(events).forEach((eventName) => {
    //         errorUtils.safeExecute(async () => {

    //             boundEvents[eventName] = emit.bind(null, events[eventName]);
    //         
}, 'error'):`, error);
    //         }
    //     });
    //     return boundEvents;
    // }
}

export default LayoutManager
