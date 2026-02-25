import ModalManager from '../../../resources/common/managers/ModalManager.js'

describe('ModalManager', () => {
    let manager
    let hub

    beforeEach(() => {
        hub = {
            notifyManagerF: { emit: jest.fn() },
            debug: jest.fn(),
        }
        manager = new ModalManager(hub)
    })

    test('register, get, show, hide methods work correctly', () => {
        const modal = { name: 'testModal', visible: false }
        manager.register('testModal', modal)
        const retrieved = manager.get('testModal')
        expect(retrieved).toEqual(modal)

        manager.show('testModal')
        expect(retrieved.visible).toBe(true)

        manager.hide('testModal')
        expect(retrieved.visible).toBe(false)
    })
})
