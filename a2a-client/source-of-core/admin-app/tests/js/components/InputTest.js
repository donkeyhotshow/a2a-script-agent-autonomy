import { shallowMount } from '@vue/test-utils'
import Input from '../../../resources/common/js/Elements/Primevue/VModel/Input.vue'
import FormManager from '../../../resources/common/managers/FormManager.js'
import NotifyManager from '../../../resources/common/managers/NotifyManager.js'

describe('Input.vue', () => {
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
        wrapper = shallowMount(Input, {
            props: {
                modelValue: 'Initial Value',
                name: 'inputField',
                form: 'testForm',
                label: 'Username',
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

    test('renders Input component with correct props and label', () => {
        const inputComponent = wrapper.findComponent({ name: 'InputText' })
        expect(inputComponent.exists()).toBe(true)
        expect(inputComponent.props('modelValue')).toBe('Initial Value')
        const label = wrapper.find('label')
        expect(label.text()).toBe('Username')
    })

    test('updates modelValue when Input emits update:model-value', async () => {
        const inputComponent = wrapper.findComponent({ name: 'InputText' })
        inputComponent.vm.$emit('update:model-value', 'New Value')
        await wrapper.vm.$nextTick()
        expect(formManager.getField('testForm', 'inputField').value).toBe('New Value')
    })

    test('displays default value if field is not registered', () => {
        formManager.registerForm('anotherForm', {})
        const newComponent = {
            type: 'InputText',
            model: {
                form: 'anotherForm',
                field: 'unregisteredField',
            },
            props: {
                label: 'Unregistered Input',
            },
        }
        const newWrapper = shallowMount(Input, {
            props: { component: newComponent },
            provide: {
                hub,
            },
            global: {
                components: {
                    InputText: {
                        name: 'InputText',
                        props: ['modelValue'],
                        template: '<input />',
                    },
                },
            },
        })
        const inputComponent = newWrapper.findComponent({ name: 'InputText' })
        expect(inputComponent.props('modelValue')).toBeUndefined()
    })
})
