const STANDARD_EVENTS = {

    LOG_NEW: { name: 'newLog', modules: ['$hub.$log'], level: 'info' },
    LOG_CLEAR: { name: 'clearLogs', modules: ['$hub.$log'], level: 'info' },
    LOG_ERROR: { name: 'logError', modules: ['$hub.$log', '$hub.$toast'], level: 'error' },
    LOG_DEBUG: { name: 'logDebug', modules: ['$hub.$log', '$hub.$toast'], level: 'debug' },
    LOG_INFO: { name: 'logInfo', modules: ['$hub.$log'], level: 'info' },
    LOG_WARN: { name: 'logWarn', modules: ['$hub.$log', '$hub.$toast'], level: 'warn' },


    COMPONENT_MOUNTED: { name: 'componentMounted', modules: ['$hub.$log'], level: 'info' },
    COMPONENT_UPDATED: { name: 'componentUpdated', modules: ['$hub.$log'], level: 'info' },


    FORM_SUBMIT: { name: 'formSubmit', modules: ['$hub.$log', '$hub.$toast'], level: 'info' },
    FORM_CHANGE: { name: 'formChange', modules: ['$hub.$log'], level: 'info' },


    SAVE_SUCCESS: { name: 'saveSuccess', modules: ['$hub.$log', '$hub.$toast'], level: 'success' },
    SAVE_ERROR: { name: 'saveError', modules: ['$hub.$log', '$hub.$toast'], level: 'error' },


    WINDOW_ADD: { name: 'addWindow', modules: ['$hub.$log'], level: 'info' },
    WINDOW_ADDED: { name: 'windowAdded', modules: ['$hub.$log'], level: 'info' },
    WINDOW_REMOVE: { name: 'removeWindow', modules: ['$hub.$log'], level: 'info' },


    CONTEXT_MENU_OPEN: { name: 'openContextMenu', modules: ['$hub.$log'], level: 'info' },


    CHAT_RESPONSE: { name: 'saveChatResponse', modules: ['$hub.$log'], level: 'info' },


    REQUEST_START: {
        name: 'requestStart',
        modules: ['$hub.$log'],
        level: 'info',
        options: {
            toast: false,
        },
    },

    REQUEST_SUCCESS: {
        name: 'requestSuccess',
        modules: ['$hub.$log', '$hub.$toast'],
        level: 'success',
        options: {
            toastDuration: 3000,
        },
    },

    REQUEST_ERROR: {
        name: 'requestError',
        modules: ['$hub.$log', '$hub.$toast'],
        level: 'error',
        options: {
            toastPosition: 'top-right',
        },
    },
    REQUEST_COMPLETE: { name: 'requestComplete', modules: ['$hub.$log'], level: 'info' },


    BATCH_START: {
        name: 'batchStart',
        modules: ['$hub.$log'],
        level: 'debug',
    },

    BATCH_COMPLETE: {
        name: 'batchComplete',
        modules: ['$hub.$log'],
        level: 'info',
    },


}


export default STANDARD_EVENTS
