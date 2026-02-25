import StateManager from './include/StateManager.js'

class TimerManager extends StateManager {
    constructor(hub) {
        super(hub)
        this.timers = new Map() // Store timers
    }

    register(id, timer) {
        this.timers.set(id, timer)
    }

    start(id) {
        const timer = this.timers.get(id)
        if (timer) {
            timer.running = true // Set running state
            // Logic to start the timer
        }
    }

    stop(id) {
        const timer = this.timers.get(id)
        if (timer) {
            timer.running = false // Set running state to false
            // Logic to stop the timer
        }
    }

    createTimer(id, callback, delay, type = 'timeout') {
        const timerId = type === 'timeout' ? setTimeout(callback, delay) : setInterval(callback, delay)
        this.create(id, { id: timerId, type })
        return id
    }

    clearTimer(id) {
        const timer = this.get(id)
        if (timer) {
            if (timer.type === 'timeout') {
                clearTimeout(timer.id)
            } else {
                clearInterval(timer.id)
            }
            this.delete(id)
        }
    }

    clearTimers() {
        for (const id of this.keys()) {
            this.clearTimer(id)
        }
    }

    debounce(fn, delay) {
        let timeout
        return (...args) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => fn(...args), delay)
        }
    }

    throttle(fn, delay) {
        let lastCall = 0
        return (...args) => {
            const now = Date.now()
            if (now - lastCall >= delay) {
                fn(...args)
                lastCall = now
            }
        }
    }
}

export default TimerManager
