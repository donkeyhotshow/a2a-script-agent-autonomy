import SplitterManager from '../../../resources/common/managers/SplitterManager.js'

describe('SplitterManager', () => {
    let manager

    beforeEach(() => {
        manager = new SplitterManager()
    })

    it('can instantiate SplitterManager', () => {
        expect(manager).toBeInstanceOf(SplitterManager)
    })

    it('register, get, show, hide methods work correctly', () => {
        const splitter = { name: 'testSplitter', visible: false }
        manager.register('testSplitter', splitter)
        const retrieved = manager.get('testSplitter')
        expect(retrieved).toEqual(splitter)
        manager.show('testSplitter')
        expect(retrieved.visible).toBe(true)
        manager.hide('testSplitter')
        expect(retrieved.visible).toBe(false)
    })
})
