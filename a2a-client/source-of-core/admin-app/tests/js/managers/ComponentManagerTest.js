// tests/js/managers/ComponentManagerTest.js
import ComponentManager from '../../../resources/common/managers/ComponentManager'

describe('ComponentManager', () => {
    let manager

    beforeEach(() => {
        manager = new ComponentManager({})
    })

    test('should instantiate correctly', () => {
        expect(manager).toBeInstanceOf(ComponentManager)
    })

    test('register and get methods should work with valid data', () => {
        const component = { name: 'TestComponent', visible: true }
        manager.register('testComponent', component)
        const retrieved = manager.get('testComponent')
        expect(retrieved).toEqual(component)
    })

    test('show and hide methods should toggle visibility', () => {
        const component = { name: 'TestComponent', visible: false }
        manager.register('testComponent', component)

        manager.show('testComponent')
        expect(manager.get('testComponent').visible).toBe(true)

        manager.hide('testComponent')
        expect(manager.get('testComponent').visible).toBe(false)
    })

    test('should handle non-existing component gracefully', () => {
        expect(manager.get('nonExisting')).toBeUndefined()
    })
})
