import TimerManager from '../../../resources/common/managers/TimerManager.js'

describe('TimerManager', () => {
    let manager
    let hub

    beforeEach(() => {
        hub = {
            notifyManager: {
                emit: jest.fn(),
            },
            debug: jest.fn(),
        }
        manager = new TimerManager(hub)
    })

    test('should instantiate correctly', () => {
        expect(manager).toBeInstanceOf(TimerManager)
    })

    test('register, get, start, stop methods work correctly', () => {
        const timer = { name: 'testTimer', running: false }
        manager.register('testTimer', timer)
        const retrieved = manager.get('testTimer')
        expect(retrieved).toEqual(timer)

        manager.start('testTimer')
        expect(retrieved.running).toBe(true)
        expect(setInterval).toHaveBeenCalled()

        manager.stop('testTimer')
        expect(retrieved.running).toBe(false)
    })

    test('should handle non-existing timer gracefully', () => {
        expect(manager.get('nonExisting')).toBeUndefined()
        manager.start('nonExisting') // Should not throw
        manager.stop('nonExisting')  // Should not throw
    })

    test('should emit timer events correctly', () => {
        const timer = { name: 'testTimer', running: false }
        manager.register('testTimer', timer)

        manager.start('testTimer')
        expect(hub.notifyManager.emit).toHaveBeenCalledWith('timerStarted', { timer: 'testTimer' })

        manager.stop('testTimer')
        expect(hub.notifyManager.emit).toHaveBeenCalledWith('timerStopped', { timer: 'testTimer' })
    })
})
