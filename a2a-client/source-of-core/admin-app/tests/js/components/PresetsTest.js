// tests/js/components/PresetsTest.js
import { shallowMount } from '@vue/test-utils'
import Presets from '@common/js/Elements/Presets.vue'
import PropsManager from '../../../resources/common/managers/PropsManager.js'
import FormManager from '../../../resources/common/managers/FormManager.js'
import FieldManager from '../../../resources/common/managers/FieldManager.js'
import { handleAction } from '@common/managers/imports/listeners.js'

jest.mock('@common/managers/imports/listeners.js', () => ({
    handleAction: jest.fn(),
}))

describe('Presets.vue', () => {
    let wrapper
    let hub
    let formManager
    let propsManager
    let fieldManager

    beforeEach(() => {
        hub = {
            debug: jest.fn(),
            notifyManagerF: { emit: jest.fn() },
            customHooks: new Map(),
        }
        formManager = new FormManager(hub)
        propsManager = new PropsManager(hub)
        fieldManager = new FieldManager(hub)
        wrapper = shallowMount(Presets, {
            global: {
                provide: {
                    hub,
                    formManager,
                    propsManager,
                    fieldManager,
                },
            },
        })
    })

    test('should call handleAction on action', () => {
        const actionConfig = { action: 'sendData', data: {} }
        wrapper.vm.triggerAction(actionConfig)
        expect(handleAction).toHaveBeenCalledWith(actionConfig, expect.anything(), expect.anything(), expect.anything())
    })

    // ...additional tests
})
