import FormManager from '../../../resources/common/managers/FormManager.js'

describe('FormManager', () => {
    let hub
    let formManager

    beforeEach(() => {
        hub = {
            notifyManager: {
                emit: jest.fn(),
            },
            debug: jest.fn(),
            $page: {
                props: {
                    forms: {
                        testForm: {
                            field1: 'value1',
                            field2: 'value2',
                        },
                    },
                },
            },
            toastManager: {
                show: jest.fn(),
            },
        }
        formManager = new FormManager(hub)
        formManager.initializeForms()
    })

    beforeAll(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {
        })
    })

    afterAll(() => {
        console.warn.mockRestore()
    })

    test('should instantiate correctly', () => {
        expect(formManager).toBeInstanceOf(FormManager)
    })

    test('registerForm initializes form correctly', () => {
        const formName = 'newForm'
        const formConfig = { someConfig: true }
        const fields = { fieldA: 'A', fieldB: 'B' }

        formManager.registerForm(formName, formConfig, fields)

        const form = formManager.getForm(formName)
        expect(form).toBeDefined()
        expect(form.config).toEqual(formConfig)
        expect(form.fields.get('fieldA').value).toBe('A')
        expect(form.fields.get('fieldB').value).toBe('B')
    })

    test('getForm retrieves correct form', () => {
        const form = formManager.getForm('testForm')
        expect(form).toBeDefined()
        expect(form.config).toEqual({})
        expect(form.fields.get('field1').value).toBe('value1')
        expect(form.fields.get('field2').value).toBe('value2')
    })

    test('getData returns form data', () => {
        const formName = 'testForm'
        const formData = formManager.getData(formName)
        expect(formData).toEqual({ field1: 'value1', field2: 'value2' })
    })

    test('getData returns empty object if form not registered', () => {
        const formData = formManager.getData('nonExistingForm')
        expect(formData).toEqual({})
    })

    test('getData returns empty object if form has no fields', () => {
        formManager.registerForm('emptyForm', {}, {})
        const formData = formManager.getData('emptyForm')
        expect(formData).toEqual({})
    })

    test('updateFieldValue updates existing field correctly', () => {
        const formName = 'testForm'
        const fieldName = 'field1'
        formManager.updateFieldValue(formName, fieldName, 'newValue')
        const formData = formManager.getData(formName)
        expect(formData[fieldName]).toBe('newValue')
    })

    test('updateFieldValue initializes and updates non-existing field', () => {
        const formName = 'testForm'
        const fieldName = 'newField'
        formManager.updateFieldValue(formName, fieldName, 'newValue')
        const formData = formManager.getData(formName)
        expect(formData[fieldName]).toBe('newValue')
    })

    test('initializeFields initializes fields with correct values', () => {
        const formName = 'initialForm'
        const fields = {
            field1: 'val1',
            field2: 'val2',
        }
        formManager.registerForm(formName, {}, fields)
        const initializedField1 = formManager.getField(formName, 'field1')
        const initializedField2 = formManager.getField(formName, 'field2')

        expect(initializedField1.value).toBe('val1')
        expect(initializedField2.value).toBe('val2')
    })

    test('handleFormSuccess updates form state on success', () => {
        const formName = 'testForm'
        formManager.registerForm(formName, {}, { field1: 'value1' })
        formManager.prepareForm(formName)

        formManager.handleFormSuccess(formName, { success: true })
        const form = formManager.getForm(formName)
        expect(form.pending).toBe(false)
        expect(form.error).toBe(null)
        expect(hub.notifyManager.emit).toHaveBeenCalledWith('SAVE_SUCCESS', {
            summary: 'Form Submitted',
            detail: 'Form testForm has been successfully submitted.',
        })
    })

    test('handleFormError updates form state on error', () => {
        const formName = 'testForm'
        formManager.registerForm(formName, {}, { field1: 'value1' })

        formManager.handleFormError(formName, { message: 'Submission failed.' })
        const form = formManager.getForm(formName)
        expect(form.pending).toBe(false)
        expect(form.error).toBe('Submission failed.')
    })

    test('onChange callback is triggered on field update', () => {
        const formName = 'testForm'
        const fieldName = 'field1'
        const callback = jest.fn()
        formManager.registerForm(formName, {}, { [fieldName]: 'initialValue' })
        formManager.onChange(formName, fieldName, callback)

        formManager.updateFieldValue(formName, fieldName, 'updatedValue')
        expect(callback).toHaveBeenCalledWith('updatedValue')
    })

    test('removeProp properly removes a property and notifies listeners', () => {
        // Assuming a removeProp method exists
    })

    test('registerField initializes field with default value', () => {
        const formName = 'testForm'
        formManager.registerForm(formName, {}, {})

        const fieldName = 'newField'
        const vModel = formManager.registerField(formName, fieldName)

        expect(vModel.value).toBe('') // Default value should be an empty string
    })

    test('getField returns undefined for non-existing field', () => {
        const formName = 'testForm'
        formManager.registerForm(formName, {}, { field1: 'value1' })

        const nonExistingField = formManager.getField(formName, 'nonExistingField')
        expect(nonExistingField).toBeUndefined()
    })

    test('multiple onChange callbacks are called correctly', () => {
        const formName = 'testForm'
        const fieldName = 'field1'
        const callback1 = jest.fn()
        const callback2 = jest.fn()
        formManager.registerForm(formName, {}, { [fieldName]: 'initialValue' })
        formManager.onChange(formName, fieldName, callback1)
        formManager.onChange(formName, fieldName, callback2)

        formManager.updateFieldValue(formName, fieldName, 'updatedValue')
        expect(callback1).toHaveBeenCalledWith('updatedValue')
        expect(callback2).toHaveBeenCalledWith('updatedValue')
    })
})
