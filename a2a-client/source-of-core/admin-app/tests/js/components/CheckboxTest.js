import { shallowMount } from '@vue/test-utils'
import Checkbox from '../../../resources/common/js/Elements/Primevue/VModel/Checkbox.vue'
import FormManager from '../../../resources/common/managers/FormManager.js'
import NotifyManager from '../../../resources/common/managers/NotifyManager.js'

describe('Checkbox.vue', () => {
    let wrapper
    let hub
    let formManager
    let notifyManager

    beforeEach(() => {
        hub = {
            debug: jest.fn(),
            notifyManagerF: { emit: jest.fn() },
            customHooks: new Map(),
        }
        formManager = new FormManager(hub)
        notifyManager = new NotifyManager(hub)
        wrapper = shallowMount(Checkbox, {
            props: {
                component: {
                    type: 'Checkbox',
                    model: {
                        form: 'testForm',
                        field: 'checkboxField',
                    },
                },
                modelValue: false,
                header: 'testHeader',
                label: 'testLabel',
                model: 'testModel',
                inputId: 'testInputId',
                class: 'testClass',
            },
            global: {
                provide: {
                    hub,
                    formManager,
                    notifyManager,
                },
            },
        })
    })

    test('renders Checkbox component with correct props', () => {
        const checkboxComponent = wrapper.findComponent({ name: 'Checkbox' })
        expect(checkboxComponent.exists()).toBe(true)
        expect(checkboxComponent.props('modelValue')).toBe(false)
    })

    test('toggles modelValue when Checkbox emits update:model-value', async () => {
        const checkboxComponent = wrapper.findComponent({ name: 'Checkbox' })
        checkboxComponent.vm.$emit('update:model-value', true)
        await wrapper.vm.$nextTick()
        expect(formManager.getField('testForm', 'checkboxField').value).toBe(true)
    })

    test('registers field on creation', () => {
        expect(formManager.getField('testForm', 'checkboxField').value).toBe(false)
    })

    test('registers field again if already registered', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
        })
        formManager.registerField('testForm', 'checkboxField', { value: true })
        expect(consoleWarnSpy).toHaveBeenCalled()
        consoleWarnSpy.mockRestore()
    })
})
