const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
import { generateId } from './data.js'

export function log(level, message, data = {}) {
    const logEntry = {
        id: generateId(),
        timestamp: new Date(),
        level,
        message,
        data,
    }
    this.state.logs?.unshift(logEntry)
    if (this.state.logs?.length > this.state.maxLogs) {
        this.state.logs?.pop()
    }
    if (process.env.NODE_ENV === 'development111') {
        consoleUtils.log(level, message, data)
    }
}

export function debug(message, data) {
    if (this.state.level === 'debug') {
        this.log('debug', message, data)
    }
}

export function info(message, data) {
    if (['debug', 'info'].includes(this.state.level)) {
        this.log('info', message, data)
    }
}

export function warn(message, data) {
    if (['debug', 'info', 'warn'].includes(this.state.level)) {
        this.log('warn', message, data)
    }
}

export function error(message, data) {
    this.log('error', message, data)
}

export function setLevel(level) {
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
        this.state.level = level
    }
}

export function getLogs(filter = {}) {
    return this.state.logs.filter(log => {
        if (filter.level && log.level !== filter.level) return false
        if (filter.search && !log.message.includes(filter.search)) return false
        if (filter.from && new Date(log.timestamp) < new Date(filter.from)) return false
        if (filter.to && new Date(log.timestamp) > new Date(filter.to)) return false
        return true
    })
}

export function getFilteredLogs() {
    const { level, search } = this.state.filters
    return this.getLogs({ level, search })
}

export function exportLogs(filter = {}) {
    return JSON.stringify(this.getFilteredLogs(filter), null, 2)
}

export function clearLogs() {
    this.state.logs = []
    this.log('info', 'Logs cleared')
}

export function setFilter(type, value) {
    this.state.filters[type] = value
}
