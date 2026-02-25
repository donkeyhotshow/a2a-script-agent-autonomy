// tests/js/managers/CustomHooksManagerTest.js
import {
    findCustomHooksForComponent,
    handleVAddressEvents,
    processComponentCustomHooks,
    removeCustomHooksFromStateManager,
} from '../../../resources/common/managers/imports/customHooks.js'

describe('CustomHooks functions', () => {
    let component
    let hub

    beforeEach(() => {
        component = { id: 'comp-123' }
        hub = {
            customHooks: new Map(),
            debug: jest.fn(),
            notifyManager: {
                emit: jest.fn(),
            },
        }
    })

    test('processComponentCustomHooks registers hooks correctly', () => {
        const context = { component, hub }
        const hooks = {
            click: jest.fn(),
            submit: jest.fn(),
        }
        hub.customHooks.set('click', [])
        hub.customHooks.set('submit', [])

        processComponentCustomHooks.call(context, hooks)

        expect(hub.customHooks.get('click')).toContain(hooks.click)
        expect(hub.customHooks.get('submit')).toContain(hooks.submit)
    })

    test('findCustomHooksForComponent retrieves correct hooks', () => {
        const context = { component, hub }
        const clickHook = jest.fn()
        const submitHook = jest.fn()
        hub.customHooks.set('click', [clickHook])
        hub.customHooks.set('submit', [submitHook])

        const foundHooks = findCustomHooksForComponent.call(context, 'comp-123')
        expect(foundHooks).toEqual([clickHook, submitHook])
    })

    test('handleVAddressEvents toggles forceUpdate for action "forceUpdate"', () => {
        const instance = { forceUpdate: false, hub: {} }
        const payload = { action: 'forceUpdate', data: {} }
        handleVAddressEvents.call(instance, payload)
        expect(instance.forceUpdate).toBe(true)
    })

    test('removeCustomHooksFromStateManager removes hooks related to component', () => {
        const context = { component, hub }
        const clickHook = jest.fn()
        const submitHook = jest.fn()
        hub.customHooks.set('click', [clickHook])
        hub.customHooks.set('submit', [submitHook])

        removeCustomHooksFromStateManager.call(context)

        expect(hub.customHooks.get('click')).not.toContain(clickHook)
        expect(hub.customHooks.get('submit')).not.toContain(submitHook)
    })
})


describe('customHooks.js', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    test('handleAction - single action', async () => {
        const actionConfig = {
            action: 'sendData',
            data: {
                target1: 'textarea-unique-address-001',
                target2: 'program-section',
                process: 'stepNext',
                process3: '/primary-form/actions/program-section/stepNext',
            },
        }

        await handleAction(actionConfig, {})

        expect(window.alert).toHaveBeenCalledWith(
            `Send Data Action:\nTarget1: textarea-unique-address-001\nTarget2: program-section\nProcess: stepNext\nProcess3: /primary-form/actions/program-section/stepNext`,
        )
    })

    test('handleAction - multiple actions', async () => {
        const actionConfigs = [
            {
                action: 'sendData',
                data: {
                    target1: 'textarea-unique-address-001',
                    target2: 'program-section',
                    process: 'stepNext',
                    process3: '/primary-form/actions/program-section/stepNext',
                },
            },
            {
                action: 'log',
                data: {
                    message: 'Следуйщий шаг нажат.',
                },
            },
        ]

        await handleAction(actionConfigs, {})

        expect(window.alert).toHaveBeenCalledWith(
            `Send Data Action:\nTarget1: textarea-unique-address-001\nTarget2: program-section\nProcess: stepNext\nProcess3: /primary-form/actions/program-section/stepNext`,
        )
        expect(console.log).toHaveBeenCalledWith('Log Action:', { message: 'Следуйщий шаг нажат.' })
    })

    test('handleAction - unknown action', async () => {
        const actionConfig = {
            action: 'unknownAction',
            data: {},
        }

        console.warn = jest.fn()

        await handleAction(actionConfig, {})

        expect(console.warn).toHaveBeenCalledWith('Неизвестное действие: unknownAction')
    })
})
