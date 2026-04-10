/**
 * Validates submitted values against registered form field rules.
 */

export type FormValidationError = {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning' | 'info';
};

interface FormFieldLike {
    id: string;
    label: string;
    required?: boolean;
}

export async function validateFormData(
    form: {fields: FormFieldLike[]},
    data: Record<string, unknown>
): Promise<FormValidationError[]> {
    const errors: FormValidationError[] = [];
    for (const field of form.fields) {
        if (!field.required) continue;
        const v = data[field.id];
        if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
            errors.push({
                field: field.id,
                message: `${field.label} is required`,
                code: 'required',
                severity: 'error',
            });
        }
    }
    return errors;
}
