import LayoutManager from '../../../resources/common/managers/LayoutManager.js'

describe('LayoutManager', () => {
    let manager

    beforeEach(() => {
        manager = new LayoutManager({})
    })

    it('can instantiate LayoutManager', () => {
        expect(manager).toBeInstanceOf(LayoutManager)
    })

    it('register, get, show, hide methods work correctly', () => {
        const layout = { name: 'testLayout', visible: false }
        manager.register('testLayout', layout)
        const retrieved = manager.get('testLayout')
        expect(retrieved).toEqual(layout)
        manager.show('testLayout')
        expect(retrieved.visible).toBe(true)
        manager.hide('testLayout')
        expect(retrieved.visible).toBe(false)
    })

    it('should handle non-existing layout gracefully', () => {
        expect(manager.get('nonExisting')).toBeUndefined()
    })
})
