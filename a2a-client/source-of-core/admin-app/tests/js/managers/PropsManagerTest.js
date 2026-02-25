import PropsManager from '../../../resources/common/managers/PropsManager.js'

describe('PropsManager', () => {
    let manager

    beforeEach(() => {
        manager = new PropsManager({})
        manager.props = {}
        manager.listeners = {}
    })

    test('should create a singleton instance', () => {
        const instance1 = new PropsManager({})
        const instance2 = new PropsManager({})
        expect(instance1).toBe(instance2)
    })

    test('setProp and getProp should work correctly', () => {
        manager.setProp('testKey', 'testValue')
        expect(manager.getProp('testKey')).toBe('testValue')
    })

    test('onChange should register callbacks', () => {
        const callback = jest.fn()
        manager.onChange('testKey', callback)
        manager.setProp('testKey', 'newValue')
        expect(callback).toHaveBeenCalledWith('newValue')
    })

    test('removeProp should notify subscribers with null', () => {
        const callback = jest.fn()
        manager.setProp('testKey', 'initialValue')
        manager.onChange('testKey', callback)
        manager.removeProp('testKey')
        expect(callback).toHaveBeenCalledWith(null)
    })

    test('offChange should unregister callbacks', () => {
        const callback = jest.fn()
        manager.onChange('testKey', callback)
        manager.offChange('testKey', callback)
        manager.setProp('testKey', 'newValue')
        expect(callback).not.toHaveBeenCalled()
    })
})
