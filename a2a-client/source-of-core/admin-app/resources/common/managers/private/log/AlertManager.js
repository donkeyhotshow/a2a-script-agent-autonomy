import {
    clearLogs,
    debug,
    error,
    exportLogs,
    getFilteredLogs,
    getLogs,
    info,
    log,
    setFilter,
    setLevel,
    warn,
} from '../../imports/log.js'
import RegularManager from '../../include/RegularManager.js'

class LogManager extends RegularManager {
    clearLogs = clearLogs.bind(this)
    getFilteredLogs = getFilteredLogs.bind(this)
    exportLogs = exportLogs.bind(this)
    getLogs = getLogs.bind(this)
    setFilter = setFilter.bind(this)
    setLevel = setLevel.bind(this)
    error = error.bind(this)//, ['message', 'data']
    warn = warn.bind(this)
    info = info.bind(this)//, ['message', 'data']
    debug = debug.bind(this)
    log = log.bind(this)//, ['level', 'message', 'data']

    constructor(hub) {
        super(hub)
        this.state = {
            logs: [],
            maxLogs: 1000,
            filters: {
                level: null,
                search: '',
            },
        }
    }

    showAlert = (message) => {

    }
}

export default LogManager
