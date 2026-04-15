/**
 * Shared HTML escaping, session/taskbar helpers, execute.form detection.
 */
(function (global) {
    'use strict';

    /**
     * True when execute asks for user input (choices/input), excluding wait-only steps.
     */
    function executeHasActionableForm(ex) {
        if (!ex || !ex.form || ex.wait) return false;
        var f = ex.form;
        if (f.choices && f.choices.length > 0) return true;
        if (f.textarea && typeof f.textarea === 'object' && f.textarea.name) return true;
        if (f.input == null) return false;
        if (Array.isArray(f.input)) return f.input.length > 0;
        return true;
    }

    /**
     * @param {string} sessionId
     * @returns {string}
     */
    function escapeHtml(s) {
        if (s == null) return '';
        const el = document.createElement('div');
        el.textContent = typeof s === 'string' ? s : String(s);
        return el.innerHTML;
    }

    function escapeHtmlAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    /**
     * Normalize value from getStoredClientApiUrl (string or mistaken object); strip trailing slash.
     * @returns {string} empty if unusable
     */
    function normalizeStoredClientApiUrl(raw) {
        if (raw == null) return '';
        var v = raw;
        if (typeof v === 'object') {
            v = v.url || v.apiBase || (typeof v.toString === 'function' ? v.toString() : '') || '';
        }
        var s = String(v).trim();
        if (!s || s === '[object Object]') return '';
        return s.replace(/\/?$/, '');
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStoreExecute(state) {
        if (!state) return undefined;
        return state.execute ?? state._state?.execute;
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStoreContext(state) {
        if (!state) return {};
        return state.context ?? state._state?.context ?? {};
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStorePromisePending(state) {
        if (!state) return false;
        return !!(state.promisePending ?? state.core?.promise?.isPending ?? state.promise?.isPending);
    }

    /**
     * Single place for task-flow panel: history vs execute vs waiting (floating windows, etc.).
     * @param {object} [state] SessionStore.getState()
     */
    function getTaskFlowPanelViewState(state) {
        const execute = readStoreExecute(state);
        const context = readStoreContext(state);
        const promisePending = readStorePromisePending(state);
        const hasActionableForm = executeHasActionableForm(execute);
        const inputBlocked =
            typeof state?.isInputBlocked === 'function'
                ? state.isInputBlocked()
                : !!state?.isInputBlocked;
        const isWaiting = !!promisePending || inputBlocked;
        return { execute, context, promisePending, hasActionableForm, inputBlocked, isWaiting };
    }

    /** Client API session payloads may use `id` or `sessionId`. */
    function resolveSessionIdFromPayload(obj) {
        if (obj == null || typeof obj !== 'object') return null;
        var id = obj.id != null ? obj.id : obj.sessionId;
        if (id == null || id === '') return null;
        return String(id);
    }

    /**
     * Project id from #projectSelect, else ProjectManager last selected (sync; for TaskFlow).
     */
    function getProjectIdSync() {
        var sel = document.getElementById('projectSelect');
        if (sel && sel.value) return sel.value;
        var pm = global.ProjectManager;
        if (pm && typeof pm.getLastSelectedProjectId === 'function') {
            return pm.getLastSelectedProjectId() || null;
        }
        return null;
    }

    /**
     * Validate a form field based on its type and rules
     * @param {Object} field - field definition { name, type, required, min, max, pattern, customValidator }
     * @param {*} value - the value to validate
     * @returns {Object} { valid: boolean, error: string|null }
     */
    function validateField(field, value) {
        const result = { valid: true, error: null };
        
        if (!field) return result;
        
        const fieldName = field.label || field.name || 'Field';
        
        // Required validation
        if (field.required) {
            if (value === undefined || value === null || value === '') {
                return { valid: false, error: `${fieldName} is required` };
            }
        }
        
        // Skip other validations if empty and not required
        if (value === undefined || value === null || value === '') {
            return result;
        }
        
        // Type-specific validations
        switch (field.type) {
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return { valid: false, error: `${fieldName} must be a valid email address` };
                }
                break;
            
            case 'number':
            case 'range':
                const num = parseFloat(value);
                if (isNaN(num)) {
                    return { valid: false, error: `${fieldName} must be a number` };
                }
                if (field.min !== undefined && num < field.min) {
                    return { valid: false, error: `${fieldName} must be at least ${field.min}` };
                }
                if (field.max !== undefined && num > field.max) {
                    return { valid: false, error: `${fieldName} must be at most ${field.max}` };
                }
                break;
            
            case 'url':
                try {
                    new URL(value);
                } catch {
                    return { valid: false, error: `${fieldName} must be a valid URL` };
                }
                break;
            
            case 'checkbox':
                if (field.required && !value) {
                    return { valid: false, error: `${fieldName} must be checked` };
                }
                break;
            
            case 'text':
            case 'textarea':
                if (field.minLength !== undefined && value.length < field.minLength) {
                    return { valid: false, error: `${fieldName} must be at least ${field.minLength} characters` };
                }
                if (field.maxLength !== undefined && value.length > field.maxLength) {
                    return { valid: false, error: `${fieldName} must be at most ${field.maxLength} characters` };
                }
                break;
        }
        
        // Pattern validation
        if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
                return { valid: false, error: `${fieldName} has invalid format` };
            }
        }
        
        // Custom validator function
        if (typeof field.customValidator === 'function') {
            const customResult = field.customValidator(value, field);
            if (customResult !== true) {
                return { valid: false, error: customResult || `${fieldName} is invalid` };
            }
        }
        
        return result;
    }

    /**
     * Validate an entire form
     * @param {Array} fields - array of field definitions
     * @param {Object} formData - object with form values
     * @returns {Object} { valid: boolean, errors: Object, firstError: string|null }
     */
    function validateForm(fields, formData) {
        const errors = {};
        let firstError = null;
        
        if (!Array.isArray(fields)) {
            return { valid: true, errors: {}, firstError: null };
        }
        
        for (const field of fields) {
            const value = formData[field.name];
            const result = validateField(field, value);
            
            if (!result.valid) {
                errors[field.name] = result.error;
                if (!firstError) {
                    firstError = result.error;
                }
            }
        }
        
        return {
            valid: Object.keys(errors).length === 0,
            errors,
            firstError
        };
    }

    /**
     * Show field validation error
     * @param {HTMLElement} fieldGroup - the input group element
     * @param {string} errorMessage - error message to display
     */
    function showFieldError(fieldGroup, errorMessage) {
        if (!fieldGroup) return;
        
        fieldGroup.classList.add('task-flow-input-error');
        
        // Remove existing error message
        const existingError = fieldGroup.querySelector('.task-flow-field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'task-flow-field-error';
        errorEl.textContent = errorMessage;
        fieldGroup.appendChild(errorEl);
    }

    /**
     * Clear field validation error
     * @param {HTMLElement} fieldGroup - the input group element
     */
    function clearFieldError(fieldGroup) {
        if (!fieldGroup) return;
        
        fieldGroup.classList.remove('task-flow-input-error');
        
        const existingError = fieldGroup.querySelector('.task-flow-field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /** Taskbar session strip: SessionManager ref or first `.taskbar-content`. */
    function resolveTaskbarContentEl() {
        return global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
    }

    global.escapeHtml = escapeHtml;
    global.escapeHtmlAttr = escapeHtmlAttr;
    global.executeHasActionableForm = executeHasActionableForm;
    global.normalizeStoredClientApiUrl = normalizeStoredClientApiUrl;
    global.readStoreExecute = readStoreExecute;
    global.readStoreContext = readStoreContext;
    global.readStorePromisePending = readStorePromisePending;
    global.getTaskFlowPanelViewState = getTaskFlowPanelViewState;
    global.resolveSessionIdFromPayload = resolveSessionIdFromPayload;
    global.getProjectIdSync = getProjectIdSync;
    global.resolveTaskbarContentEl = resolveTaskbarContentEl;
    global.validateField = validateField;
    global.validateForm = validateForm;
    global.showFieldError = showFieldError;
    global.clearFieldError = clearFieldError;

    /**
     * Minimal message normalizer for operator Web UI (packages/web).
     * Keeps SessionStore/session-data.js working without a separate ESM install step.
     */
    if (!global.Normalizers) {
        global.Normalizers = {
            MAX_MESSAGES: 500,
            /**
             * @param {unknown} message
             * @param {string} [role]
             */
            normalizeMessage(message, role) {
                const id =
                    'm_' +
                    Date.now() +
                    '_' +
                    Math.random().toString(36).slice(2, 9);
                if (message && typeof message === 'object' && !Array.isArray(message)) {
                    const r = message.role || role || 'assistant';
                    let content = '';
                    if (typeof message.content === 'string') content = message.content;
                    else if (message.content && typeof message.content === 'object') {
                        content =
                            message.content.text ||
                            message.content.body ||
                            JSON.stringify(message.content);
                    } else if (typeof message.text === 'string') content = message.text;
                    else if (typeof message.message === 'string') content = message.message;
                    let artifacts = [];
                    if (Array.isArray(message.artifacts)) artifacts = message.artifacts;
                    else if (Array.isArray(message.metadata?.artifacts)) {
                        artifacts = message.metadata.artifacts;
                    }
                    return {
                        id: message.id || id,
                        role: r,
                        content: String(content || ''),
                        artifacts,
                    };
                }
                return {
                    id,
                    role: role || 'user',
                    content: String(message ?? ''),
                    artifacts: [],
                };
            },
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
