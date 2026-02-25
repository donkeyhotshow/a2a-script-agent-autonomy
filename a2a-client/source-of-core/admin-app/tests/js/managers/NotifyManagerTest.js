// tests/js/managers/NotifyManagerTest.js
import NotifyManager from '../../../resources/common/managers/NotifyManager.js'

describe('NotifyManager', () => {
    let manager
    let hub

    beforeEach(() => {
        hub = {
            notifyManagerF: { emit: jest.fn() },
            debug: jest.fn(), // Mock the debug method if used
        }
        manager = new NotifyManager(hub)
    })

    test('should instantiate correctly', () => {
        expect(manager).toBeInstanceOf(NotifyManager)
    })


    test('should handle non-existing event gracefully', () => {
        expect(manager.get('nonExisting')).toBeUndefined()
    })
})
