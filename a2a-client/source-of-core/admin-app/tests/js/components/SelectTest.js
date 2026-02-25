import { shallowMount } from '@vue/test-utils'
import Select from '../../../resources/common/js/Elements/Primevue/VModel/Select.vue'
import FormManager from '../../../resources/common/managers/FormManager.js'

describe('Select.vue', () => {
    let wrapper
    let hub
    let formManager
    beforeEach(() => {
        hub = {
            formManager: null,
            notifyManager: {
                emit: jest.fn(),
            },
        }
        formManager = new FormManager(hub)
        hub.formManager = formManager
        const component = {
            model: {
                field: 'selectField',
                form: 'testForm',
            },
            options: ['Option1', 'Option2'],
            optionLabel: 'label',
            optionValue: 'value',
            props: {
                placeholder: 'Choose an option',
            },
        }
        formManager.registerForm('testForm', {})
        formManager.registerField('testForm', 'selectField', { value: 'Option1' })
        wrapper = shallowMount(Select, {
            props: { component },
            provide: {
                hub,
            },
        })
    })
    test('renders Select component with correct props', () => {
        const select = wrapper.findComponent({ name: 'Select' })
        expect(select.exists()).toBe(true)
        expect(select.props('modelValue')).toBe('Option1')
        expect(select.props('options')).toEqual(['Option1', 'Option2'])
        expect(select.props('placeholder')).toBe('Choose an option')
    })
    test('updates modelValue when Select emits update:model-value', async () => {
        const select = wrapper.findComponent({ name: 'Select' })
        select.vm.$emit('update:model-value', 'Option2')
        await wrapper.vm.$nextTick()
        expect(formManager.getField('testForm', 'selectField').value).toBe('Option2')
    })
})
