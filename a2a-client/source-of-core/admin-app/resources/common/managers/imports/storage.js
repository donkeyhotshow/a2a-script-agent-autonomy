const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
export function getItem(key, defaultValue = null, storage = localStorage) {
    const item = storage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
}


export function setItem(key, value, storage = localStorage) {
    errorUtils.safeExecute(async () => {

        storage.setItem(key, JSON.stringify(value))
    
}, 'error'):`, error)
    }
}

// export function getItem(key, defaultValue = null, storage = localStorage) {
//     errorUtils.safeExecute(async () => {

//         const item = storage.getItem(key);
//         return item ? JSON.parse(item) : defaultValue;
//     
}, 'error'):`, error);
//         return defaultValue;
//     }
// }

export function removeItem(key, storage = localStorage) {
    errorUtils.safeExecute(async () => {

        storage.removeItem(key)
    
}, 'error') from storage:`, error)
    }
}

export function clearStorage(storage = localStorage) {
    errorUtils.safeExecute(async () => {

        storage.clear()
    
}, 'error')
}
