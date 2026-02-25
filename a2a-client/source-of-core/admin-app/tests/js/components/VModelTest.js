import { shallowMount } from '@vue/test-utils'
import VModel from '@common/js/Elements/Primevue/VModel.vue'
import FormManager from '../../../resources/common/managers/FormManager'

describe('VModel.vue', () => {
    let wrapper
    let mockHub
    let formManager

    beforeEach(() => {
        formManager = new FormManager({
            notifyManagerF: { emit: jest.fn() },
            logManager: { logWarning: jest.fn() },
        })


        mockHub = {
            formManager,
        }

        wrapper = shallowMount(VModel, {
            global: {
                provide: {
                    hub: mockHub,
                },
            },
            props: {
                component: {
                    type: 'input',
                    model: {
                        field: 'testField',
                        form: 'testForm',
                    },
                },
                default: '',
            },
        })
    })

    it('registers field on created', () => {
        expect(formManager.getField('testForm', 'testField')).toBeDefined()
    })

    it('handles field visibility correctly', () => {
        const form = formManager.get('testForm')
        expect(form.fields.get('testField').visible).toBe(false)

        wrapper.vm.showField('testForm', 'testField')
        expect(form.fields.get('testField').visible).toBe(true)

        wrapper.vm.hideField('testForm', 'testField')
        expect(form.fields.get('testField').visible).toBe(false)
    })

    // Дополнительные тесты...
})
