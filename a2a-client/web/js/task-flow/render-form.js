/**
 * TaskFlow Form Renderer
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) global.TaskFlowRender = {};
    const TFR = global.TaskFlowRender;
    const { escapeHtml, requireRenderStore } = TFR;

    function renderForm(contentEl, form, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store) {
        const storeResult = requireRenderStore('renderForm', store, { form });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;

        const storeState = effectiveStore.getState?.();
        if (!storeState || typeof storeState !== 'object') {
            const errMsg = '[TaskFlowRender] Invalid store state when rendering form';
            console.error(errMsg, storeState);
            const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
            return;
        }

        const panelVs = global.getTaskFlowPanelViewState?.(storeState);
        if (panelVs?.isWaiting && !panelVs?.hasActionableForm) {
            const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = historyHtml;
            return;
        }

        if (!form || typeof form !== 'object') {
            const errMsg = '[TaskFlowRender] Form payload is missing or invalid';
            console.error(errMsg, form);
            const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
            return;
        }

        const rawChoices = form?.choices ?? form?.meta?.routerChoices;
        let choices = null;
        if (rawChoices != null) {
            if (!Array.isArray(rawChoices)) {
                const errMsg = '[TaskFlowRender] Form choices must be an array';
                console.error(errMsg, rawChoices);
                const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
                contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
                return;
            }
            choices = rawChoices;
        }
        const hasChoices = Boolean(choices && choices.length > 0);
        let inputFields = [];
        if (form && typeof form === 'object') {
            if (form.textarea && typeof form.textarea === 'object' && form.textarea.name) {
                inputFields = [form.textarea];
            } else if (Array.isArray(form.input) && form.input.length > 0) {
                inputFields = form.input;
            } else if (Array.isArray(form.inputs) && form.inputs.length > 0) {
                inputFields = form.inputs;
            }
        }

        function renderInputField(f) {
            const name = f.name || 'input';
            const label = f.label ? `<label for="task-flow-input-${escapeHtml(name)}" class="task-flow-field-label">${escapeHtml(f.label)}</label>` : '';
            const placeholder = f.placeholder || '';
            const required = f.required ? 'required' : '';
            const disabled = f.disabled ? 'disabled' : '';
            const defaultValue = f.default !== undefined ? `value="${escapeHtml(String(f.default))}"` : '';
            const type = f.type || 'text';
            const id = `task-flow-input-${escapeHtml(name)}`;
            const cssClass = f.className ? ` ${f.className}` : '';
            const dependency = f.dependsOn ? `data-depends-on="${escapeHtml(f.dependsOn.field)}" data-depends-value="${escapeHtml(String(f.dependsOn.value))}" data-depends-action="${escapeHtml(f.dependsOn.action || 'show')}"` : '';

            if (type === 'textarea' || name === 'message' || name === 'description' || name === 'content') {
                const rows = f.rows || 4;
                return `<div class="task-flow-input-group task-flow-input-group-${escapeHtml(type)}" ${dependency}>${label}<textarea id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required} ${disabled} class="task-flow-input-field task-flow-textarea${cssClass}" autocomplete="off" rows="${rows}">${defaultValue.replace(/value="(.+)"/, '$1')}</textarea></div>`;
            }

            if (type === 'select' && f.options) {
                const options = f.options.map(opt => {
                    const optValue = typeof opt === 'string' ? opt : (opt.value || opt.id || '');
                    const optLabel = typeof opt === 'string' ? opt : (opt.label || optValue);
                    const selected = f.default !== undefined && String(f.default) === String(optValue) ? 'selected' : '';
                    return `<option value="${escapeHtml(String(optValue))}" ${selected}>${escapeHtml(String(optLabel))}</option>`;
                }).join('');
                return `<div class="task-flow-input-group task-flow-input-group-select" ${dependency}>${label}<select id="${id}" name="${escapeHtml(name)}" ${required} ${disabled} class="task-flow-input-field task-flow-select${cssClass}">${options}</select></div>`;
            }

            if (type === 'checkbox') {
                const checked = f.default === true || String(f.default) === 'true' || f.default === 'checked' ? 'checked' : '';
                return `<div class="task-flow-input-group task-flow-input-group-checkbox" ${dependency}>
                    <label class="task-flow-checkbox-label" for="${id}">
                        <input type="checkbox" id="${id}" name="${escapeHtml(name)}" ${checked} ${disabled} class="task-flow-input-field task-flow-checkbox${cssClass}">
                        <span class="task-flow-checkbox-text">${escapeHtml(f.label || '')}</span>
                    </label>
                </div>`;
            }

            if (type === 'radio' && f.radioOptions) {
                const radios = f.radioOptions.map(opt => {
                    const optValue = typeof opt === 'string' ? opt : (opt.value || opt.id || '');
                    const optLabel = typeof opt === 'string' ? opt : (opt.label || optValue);
                    const checked = f.default !== undefined && String(f.default) === String(optValue) ? 'checked' : '';
                    const radioId = `${id}-${escapeHtml(String(optValue))}`;
                    return `<label class="task-flow-radio-label" for="${radioId}">
                        <input type="radio" id="${radioId}" name="${escapeHtml(name)}" value="${escapeHtml(String(optValue))}" ${checked} ${disabled} class="task-flow-input-field task-flow-radio${cssClass}">
                        <span class="task-flow-radio-text">${escapeHtml(String(optLabel))}</span>
                    </label>`;
                }).join('');
                return `<div class="task-flow-input-group task-flow-input-group-radio" ${dependency}>${label}<div class="task-flow-radio-group">${radios}</div></div>`;
            }

            if (type === 'number') {
                const min = f.min !== undefined ? `min="${f.min}"` : '';
                const max = f.max !== undefined ? `max="${f.max}"` : '';
                const step = f.step !== undefined ? `step="${f.step}"` : '';
                return `<div class="task-flow-input-group task-flow-input-group-number" ${dependency}>${label}<input type="number" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-number${cssClass}" ${min} ${max} ${step} autocomplete="off"></div>`;
            }

            if (['email', 'password', 'date', 'time', 'url'].includes(type)) {
                return `<div class="task-flow-input-group task-flow-input-group-${escapeHtml(type)}" ${dependency}>${label}<input type="${escapeHtml(type)}" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-${escapeHtml(type)}${cssClass}" autocomplete="off"></div>`;
            }

            if (type === 'range') {
                const min = f.min !== undefined ? f.min : 0;
                const max = f.max !== undefined ? f.max : 100;
                const step = f.step !== undefined ? f.step : 1;
                const displayValue = f.default !== undefined ? f.default : min;
                return `<div class="task-flow-input-group task-flow-input-group-range" ${dependency}>${label}
                    <input type="range" id="${id}" name="${escapeHtml(name)}" ${defaultValue} ${disabled} class="task-flow-input-field task-flow-range${cssClass}" min="${min}" max="${max}" step="${step}">
                    <span class="task-flow-range-value">${displayValue}</span>
                </div>`;
            }

            return `<div class="task-flow-input-group task-flow-input-group-text" ${dependency}>${label}<input type="${escapeHtml(type)}" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-text${cssClass}" autocomplete="off"></div>`;
        }

        let formContent = '';
        const formIcon = hasChoices ? '☰' : (inputFields.length > 0 ? '✏️' : '⚙️');
        const formTitle = form.title || (hasChoices ? 'Choose an option' : 'Enter details');
        const formDescription = form.description ? `<div class="task-flow-form-description">${escapeHtml(form.description)}</div>` : '';
        const formErrors = `<div class="task-flow-form-errors" style="display: none;"></div>`;

        if (hasChoices) {
            const typeLabels = {
                'dialog': '💬 Діалог',
                'agent': '🔧 Агент',
                'decomposition': '📋 Декомпозиція',
                'yaml': '⚡ Скрипт',
                'md': '📝 Документ',
                'auto-ai': '🤖 Auto-AI',
                'default': '📌 Інше'
            };
            const buttons = choices.map((c, i) => {
                const description = c.description ? `<div class="task-flow-choice-description">${escapeHtml(c.description)}</div>` : '';
                const icon = c.icon || c.image ? `<span class="task-flow-choice-media">${c.icon ? `<span class="task-flow-choice-icon">${c.icon}</span>` : c.image ? `<img class="task-flow-choice-image" src="${escapeHtml(c.image)}" alt="">` : ''}</span>` : '';
                const typeBadge = c.type && typeLabels[c.type] ? `<span class="task-flow-choice-type-badge">${typeLabels[c.type]}</span>` : '';
                return `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">
                    ${icon}
                    <span class="task-flow-choice-content">
                        <span class="task-flow-choice-index">${i + 1}</span>
                        <span class="task-flow-choice-label">${escapeHtml(c.label || c.id)}</span>
                        ${description}
                        ${typeBadge}
                    </span>
                    <span class="task-flow-choice-arrow">›</span>
                </button>`;
            }).join('');
            formContent += `<div class="task-flow-choices">${buttons}</div>`;
        }

        if (inputFields.length > 0) {
            const inputsHtml = inputFields.map(renderInputField).join('');
            formContent += `<div class="task-flow-inputs">${inputsHtml}</div><div class="task-flow-submit-row"><button type="button" class="task-flow-submit-btn">Send →</button></div>`;
        }

        const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-execute-card">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-form-container">
                    <div class="task-flow-form-header">
                        <span class="task-flow-form-icon">${formIcon}</span>
                        <div>
                            <div class="task-flow-form-title">${escapeHtml(formTitle)}</div>
                        </div>
                    </div>
                    ${formDescription}
                    ${formErrors}
                    ${formContent}
                </div>
                ${completionBannerHtml}
                ${resultHtml || ''}
            </div>
        `;

        contentEl.querySelectorAll('.task-flow-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceId = btn.getAttribute('data-choice-id');
                if (choiceId && taskFlowRef?.sendChoice) {
                    taskFlowRef.sendChoice(choiceId, contentEl);
                }
            });
        });

        const submitBtn = contentEl.querySelector('.task-flow-submit-btn');
        const inputEl = contentEl.querySelector('.task-flow-input-field');
        if (submitBtn && taskFlowRef?.sendMessageResult) {
            const doSubmit = () => {
                const formData = {};
                let hasErrors = false;
                const errorMessages = [];
                const allInputs = contentEl.querySelectorAll('.task-flow-input-field');
                
                allInputs.forEach(field => {
                    const name = field.name;
                    let value;
                    if (field.type === 'checkbox') {
                        value = field.checked;
                    } else if (field.type === 'radio') {
                        if (field.checked) value = field.value;
                    } else {
                        value = field.value;
                    }
                    
                    const fieldGroup = field.closest('.task-flow-input-group');
                    const isRequired = fieldGroup?.querySelector('[required]') || field.hasAttribute('required');
                    
                    if (isRequired && !value && field.type !== 'radio') {
                        hasErrors = true;
                        fieldGroup?.classList.add('task-flow-input-error');
                        errorMessages.push(`${field.name} is required`);
                    } else {
                        fieldGroup?.classList.remove('task-flow-input-error');
                    }
                    
                    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        hasErrors = true;
                        fieldGroup?.classList.add('task-flow-input-error');
                        errorMessages.push(`${field.name} must be a valid email`);
                    }
                    
                    if (field.type === 'number' && value) {
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be a number`);
                        }
                        if (field.hasAttribute('min') && num < parseFloat(field.getAttribute('min'))) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be at least ${field.getAttribute('min')}`);
                        }
                        if (field.hasAttribute('max') && num > parseFloat(field.getAttribute('max'))) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be at most ${field.getAttribute('max')}`);
                        }
                    }
                    if (name && value !== undefined) {
                        formData[name] = value;
                    }
                });
                
                if (hasErrors) {
                    const errorContainer = contentEl.querySelector('.task-flow-form-errors');
                    if (errorContainer) {
                        errorContainer.innerHTML = errorMessages.map(msg => `<div class="task-flow-error-message">${escapeHtml(msg)}</div>`).join('');
                        errorContainer.style.display = 'block';
                    }
                    return;
                }
                
                const errorContainer = contentEl.querySelector('.task-flow-form-errors');
                if (errorContainer) errorContainer.style.display = 'none';
                
                const keys = Object.keys(formData);
                let result;
                if (keys.length === 1) {
                    result = formData[keys[0]];
                    if (typeof result === 'string') result = result.trim();
                } else {
                    keys.forEach(key => {
                        if (typeof formData[key] === 'string') formData[key] = formData[key].trim();
                    });
                    result = formData;
                }
                
                if (result) {
                    const card = contentEl.querySelector('.task-flow-execute-card');
                    if (card) card.style.display = 'none';
                    taskFlowRef.sendMessageResult(result, contentEl);
                }
            };

            submitBtn.addEventListener('click', doSubmit);
            contentEl.querySelectorAll('.task-flow-input-field').forEach(field => {
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && field.type !== 'textarea') { 
                        e.preventDefault(); 
                        doSubmit(); 
                    }
                });
            });
            setupFieldDependencies(contentEl);
            if (inputEl) setTimeout(() => inputEl.focus(), 50);
        }
        
        contentEl.querySelectorAll('.task-flow-range').forEach(range => {
            range.addEventListener('input', (e) => {
                const valueSpan = e.target.closest('.task-flow-input-group').querySelector('.task-flow-range-value');
                if (valueSpan) valueSpan.textContent = e.target.value;
            });
        });
    }
    
    function setupFieldDependencies(contentEl) {
        const dependentFields = contentEl.querySelectorAll('[data-depends-on]');
        dependentFields.forEach(field => {
            const dependsOnField = field.getAttribute('data-depends-on');
            const dependsOnValue = field.getAttribute('data-depends-value');
            const dependsOnAction = field.getAttribute('data-depends-action');
            const triggerField = contentEl.querySelector(`[name="${dependsOnField}"]`);
            
            if (triggerField) {
                const updateVisibility = () => {
                    let shouldShow = false;
                    if (triggerField.type === 'checkbox') {
                        shouldShow = triggerField.checked === (dependsOnValue === 'true' || dependsOnValue === true);
                    } else if (triggerField.type === 'radio') {
                        shouldShow = triggerField.checked && triggerField.value === dependsOnValue;
                    } else {
                        shouldShow = triggerField.value === dependsOnValue;
                    }
                    
                    if (dependsOnAction === 'hide') shouldShow = !shouldShow;
                    
                    const group = field.closest('.task-flow-input-group');
                    if (group) {
                        group.style.display = shouldShow ? '' : 'none';
                        if (!shouldShow) {
                            field.disabled = true;
                        } else {
                            field.disabled = field.hasAttribute('data-original-disabled') ? true : false;
                        }
                    }
                };
                
                if (field.hasAttribute('disabled')) {
                    field.setAttribute('data-original-disabled', 'true');
                }
                triggerField.addEventListener('change', updateVisibility);
                triggerField.addEventListener('input', updateVisibility);
                updateVisibility();
            }
        });
    }

    TFR.renderForm = renderForm;

})(typeof window !== 'undefined' ? window : global);
