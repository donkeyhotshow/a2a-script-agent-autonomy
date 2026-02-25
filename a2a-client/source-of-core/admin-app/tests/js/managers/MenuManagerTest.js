// tests/js/managers/MenuManagerTest.js
import MenuManager from '../../../resources/common/managers/MenuManager.js'

describe('MenuManager', () => {
    let manager
    let hub

    beforeEach(() => {
        hub = {
            notifyManagerF: { emit: jest.fn() },
            debug: jest.fn(),
        }
        manager = new MenuManager(hub)
    })

    it('can instantiate MenuManager', () => {
        expect(manager).toBeInstanceOf(MenuManager)
    })

    test('register, get, show, hide methods work correctly', () => {
        const menu = { name: 'testMenu', visible: false }
        manager.register('testMenu', menu)
        const retrieved = manager.get('testMenu')
        expect(retrieved).toEqual(menu)

        manager.show('testMenu')
        expect(retrieved.visible).toBe(true)

        manager.hide('testMenu')
        expect(retrieved.visible).toBe(false)
    })
})
