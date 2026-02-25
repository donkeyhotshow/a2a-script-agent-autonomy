import ThemeManager from '../../../resources/common/managers/ThemeManager.js'

// Mock ESM modules that Jest cannot parse
jest.mock('@primevue/themes/aura', () => ({}), { virtual: true })
jest.mock('@primevue/themes/lara', () => ({}), { virtual: true })

describe('ThemeManager', () => {
    let manager
    let hub

    beforeEach(() => {
        hub = {
            notifyManager: {
                emit: jest.fn(),
            },
            debug: jest.fn(),
            toastManager: {
                show: jest.fn(),
            },
        }
        manager = new ThemeManager(hub)
    })

    test('can instantiate ThemeManager', () => {
        expect(manager).toBeInstanceOf(ThemeManager)
    })

    test('register, get, show, hide methods work correctly', () => {
        const theme = { name: 'testTheme', visible: false }
        manager.register('testTheme', theme)
        const retrieved = manager.get('testTheme')
        expect(retrieved).toEqual(theme)

        manager.show('testTheme')
        expect(retrieved.visible).toBe(true)

        manager.hide('testTheme')
        expect(retrieved.visible).toBe(false)
    })

    test('applyTheme applies the correct theme and emits event', () => {
        const themeName = 'aura'
        manager.applyTheme(themeName)
        expect(hub.notifyManager.emit).toHaveBeenCalledWith('themeChange', { theme: themeName })
    })

    test('applyTheme shows toast on theme application', () => {
        const themeName = 'lara'
        manager.applyTheme(themeName)
        expect(hub.toastManager.show).toHaveBeenCalledWith('success', 'Theme Applied', `Theme ${themeName} has been applied.`, { life: 3000 })
    })

    test('applyTheme handles unknown theme gracefully', () => {
        const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {
        })
        const themeName = 'unknownTheme'
        manager.applyTheme(themeName)
        expect(consoleWarn).toHaveBeenCalledWith(`Theme ${themeName} does not exist.`)
        consoleWarn.mockRestore()
    })
})
