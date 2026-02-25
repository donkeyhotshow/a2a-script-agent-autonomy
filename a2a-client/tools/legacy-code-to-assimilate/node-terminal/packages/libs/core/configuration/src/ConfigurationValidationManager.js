/**
 * Управление валидацией конфигураций.
 */

export class ConfigurationValidationManager {
    constructor(schemas, customValidators) {
        this.schemas = schemas; // Map для хранения схем
        this.customValidators = customValidators; // Map для хранения кастомных валидаторов
    }

    /**
     * Регистрация схемы валидации
     */
    registerSchema(configName, schema) {
        this.schemas.set(configName, schema);
    }

    /**
     * Валидация конфигурации
     */
    validate(configName, config) {
        const schema = this.schemas.get(configName);
        if (!schema) {
            return { isValid: true, errors: [], warnings: [] };
        }

        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        for (const [field, fieldSchema] of Object.entries(schema)) {
            const value = this.getNestedValue(config, field);

            if (fieldSchema.required && (value === undefined || value === null)) {
                result.errors.push({
                    field,
                    message: `Поле '${field}' обязательно`,
                    value,
                    rule: { type: 'required', field }
                });
                result.isValid = false;
                continue;
            }

            if (value === undefined || value === null) {
                continue;
            }

            // Проверка типа
            if (!this.validateType(value, fieldSchema.type)) {
                result.errors.push({
                    field,
                    message: `Поле '${field}' должно быть типа ${fieldSchema.type}`,
                    value,
                    rule: { type: 'type', field, value: fieldSchema.type }
                });
                result.isValid = false;
                continue;
            }

            // Минимальное/максимальное значение/длина
            if (fieldSchema.min !== undefined) {
                if ((typeof value === 'number' && value < fieldSchema.min) ||
                    (typeof value === 'string' && value.length < fieldSchema.min)) {
                    result.errors.push({
                        field,
                        message: `Поле '${field}' должно быть не меньше ${fieldSchema.min}`,
                        value,
                        rule: { type: 'min', field, value: fieldSchema.min }
                    });
                    result.isValid = false;
                }
            }
            if (fieldSchema.max !== undefined) {
                if ((typeof value === 'number' && value > fieldSchema.max) ||
                    (typeof value === 'string' && value.length > fieldSchema.max)) {
                    result.errors.push({
                        field,
                        message: `Поле '${field}' должно быть не больше ${fieldSchema.max}`,
                        value,
                        rule: { type: 'max', field, value: fieldSchema.max }
                    });
                    result.isValid = false;
                }
            }

            // Паттерн
            if (fieldSchema.pattern && typeof value === 'string') {
                if (!new RegExp(fieldSchema.pattern).test(value)) { // Используем RegExp
                    result.errors.push({
                        field,
                        message: `Поле '${field}' не соответствует паттерну`,
                        value,
                        rule: { type: 'pattern', field, value: fieldSchema.pattern }
                    });
                    result.isValid = false;
                }
            }

            // Enum
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                result.errors.push({
                    field,
                    message: `Поле '${field}' должно быть одним из: ${fieldSchema.enum.join(', ')}`,
                    value,
                    rule: { type: 'enum', field, value: fieldSchema.enum }
                });
                result.isValid = false;
            }

            // Вложенная схема
            if (fieldSchema.nested && typeof value === 'object' && !Array.isArray(value)) {
                const nestedResult = this.validateNestedSchema(fieldSchema.nested, value, field);
                result.errors.push(...nestedResult.errors);
                result.warnings.push(...nestedResult.warnings);
                if (!nestedResult.isValid) {
                    result.isValid = false;
                }
            }

            // Кастомный валидатор
            if (fieldSchema.validator && typeof fieldSchema.validator === 'function') {
                const validationResult = fieldSchema.validator(value, config);
                if (validationResult !== true) {
                    result.errors.push({
                        field,
                        message: typeof validationResult === 'string' ? validationResult : `Поле '${field}' не прошло валидацию`,
                        value,
                        rule: { type: 'custom', field, validator: fieldSchema.validator }
                    });
                    result.isValid = false;
                }
            }
        }
        return result;
    }

    /**
     * Валидирует вложенную схему
     */
    validateNestedSchema(schema, config, prefix) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        for (const [field, fieldSchema] of Object.entries(schema)) {
            const fullField = `${prefix}.${field}`;
            const value = config[field];
            if (fieldSchema.required && (value === undefined || value === null)) {
                result.errors.push({
                    field: fullField,
                    message: `Поле '${fullField}' обязательно`,
                    value
                });
                result.isValid = false;
                continue;
            }
            if (value !== undefined && value !== null) {
                if (!this.validateType(value, fieldSchema.type)) {
                    result.errors.push({
                        field: fullField,
                        message: `Поле '${fullField}' должно быть типа ${fieldSchema.type}`,
                        value
                    });
                    result.isValid = false;
                }
            }
        }
        return result;
    }

    /**
     * Проверяет тип значения
     */
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && !Array.isArray(value) && value !== null;
            case 'array':
                return Array.isArray(value);
            case 'any':
                return true;
            default:
                return false;
        }
    }

    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        return value;
    }
}
