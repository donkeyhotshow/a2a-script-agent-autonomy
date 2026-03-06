/**
 * Plasticine UI – complete workflow. Predefined panel types, run pipeline to mount many panels at once.
 * Usage: PlasticineWorkflow.run(mountElement, { types: ['task','logs','chat','debug','sessions','settings'] });
 *
 * TODO(Task-06): session panel content bound to view-model (messages[], execute) – tasks/client/06-web-session-panel-and-dialog.md
 */

(function (global) {
    if (typeof global.PlasticineUI === 'undefined') throw new Error('PlasticineWorkflow requires PlasticineUI (plasticine-ui.js)');

    const PANEL_TYPES = {
        task: {
            id: 'task-panel',
            title: '📋 Task',
            slot: 'floating',
            critical: false,
            contentHTML: '<div class="pui-placeholder">Task panel – bind content via getContentEl("task-panel")</div>'
        },
        logs: {
            id: 'logs-panel',
            title: '📜 Logs',
            slot: 'bottom',
            critical: false,
            contentHTML: '<div class="pui-placeholder pui-logs"><pre class="pui-log-output"></pre></div>'
        },
        chat: {
            id: 'chat-panel',
            title: '💬 Chat',
            slot: 'right',
            critical: false,
            contentHTML: '<div class="pui-placeholder pui-chat"><div class="pui-chat-messages"></div><div class="pui-chat-input-row"><input type="text" class="pui-chat-input" placeholder="Message…"><button type="button" class="pui-chat-send">Send</button></div></div>'
        },
        debug: {
            id: 'debug-panel',
            title: '🐛 Debug',
            slot: 'bottom',
            critical: false,
            contentHTML: '<div class="pui-placeholder pui-debug"><div class="pui-debug-toolbar"></div><pre class="pui-debug-output"></pre></div>'
        },
        sessions: {
            id: 'sessions-panel',
            title: '📂 Sessions',
            slot: 'left',
            critical: false,
            contentHTML: `
              <div class="session-panel" data-panel="sessions">
                <div class="session-panel-header">
                  <div class="session-panel-title">Sessions</div>
                  <div class="session-panel-status" data-role="session-status">Inactive</div>
                </div>
                <div class="session-panel-messages" data-role="session-messages">
                  <div class="session-panel-empty">No messages yet</div>
                </div>
                <div class="session-panel-execute" data-role="session-execute">
                  <div class="session-panel-empty">Waiting for execute payload</div>
                </div>
              </div>
            `
        },
        settings: {
            id: 'settings-panel',
            title: '⚙️ Settings',
            slot: 'floating',
            critical: false,
            contentHTML: '<div class="pui-placeholder pui-settings"><form class="pui-settings-form"></form></div>'
        },
        alerts: {
            id: 'alerts-panel',
            title: '🔔 Alerts',
            slot: 'header',
            critical: true,
            contentHTML: '<div class="pui-placeholder pui-alerts"><div class="pui-alert-list"></div></div>'
        },
        graph: {
            id: 'graph-panel',
            title: '🕸️ Graph',
            slot: 'left',
            critical: false,
            contentHTML: '<div class="pui-placeholder pui-graph"><div class="pui-graph-canvas"></div></div>'
        }
    };

    let sessionPanelBinder = null;

    function sanitizeText(value) {
        if (value == null) return '';
        const el = document.createElement('div');
        el.textContent = String(value);
        return el.innerHTML;
    }

    class SessionPanelBinder {
        constructor(container) {
            this.container = container;
            this.messagesEl = container.querySelector('[data-role="session-messages"]');
            this.executeEl = container.querySelector('[data-role="session-execute"]');
            this.statusEl = container.querySelector('[data-role="session-status"]');
            this._subscriptions = [];
            this._actionHandlers = [];
            this.renderStatus(null);
            this.renderMessages([]);
            this.renderExecute(null);
        }

        bind(viewModel) {
            if (!viewModel) return;
            this._subscriptions.push(viewModel.on('messages', (messages) => this.renderMessages(messages)));
            this._subscriptions.push(viewModel.on('execute', (execute) => this.renderExecute(execute)));
            this._subscriptions.push(viewModel.on('session', (sessionId) => this.renderStatus(sessionId)));
        }

        renderStatus(sessionId) {
            if (!this.statusEl) return;
            const label = sessionId ? `Active ${sessionId.slice(0, 8)}` : 'Inactive';
            this.statusEl.textContent = label;
            this.statusEl.classList.toggle('session-panel-active', Boolean(sessionId));
        }

        renderMessages(messages = []) {
            if (!this.messagesEl) return;
            const list = Array.isArray(messages) ? messages.slice(-50) : [];
            if (!list.length) {
                this.messagesEl.innerHTML = '<div class="session-panel-empty">No messages yet</div>';
                return;
            }
            this.messagesEl.innerHTML = list.map((msg) => {
                const role = sanitizeText(msg.role || 'unknown');
                const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                const content = sanitizeText(msg.content || msg.message || '');
                return `
                    <div class="session-panel-message message-${role}">
                        <div class="session-panel-message-header">
                            <span class="session-panel-message-role">${role}</span>
                            ${time ? `<span class="session-panel-message-time">${time}</span>` : ''}
                        </div>
                        <div class="session-panel-message-body">${content}</div>
                    </div>`;
            }).join('');
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }

        renderExecute(execute) {
            if (!this.executeEl) return;
            if (!execute) {
                this.executeEl.innerHTML = '<div class="session-panel-empty">Waiting for execute payload</div>';
                return;
            }
            const action = sanitizeText(execute.action || '');
            const step = sanitizeText(execute.step || '');
            const status = sanitizeText(execute.status || '');
            const progress = typeof execute.progress === 'number'
                ? `<div class="session-panel-execute-progress">${Math.round(execute.progress)}%</div>`
                : '';
            const messageContent = execute.message
                ? sanitizeText(typeof execute.message === 'string' ? execute.message : execute.message.content || execute.message.text || '')
                : '';
            const choices = execute.form?.choices || [];
            const choiceItems = choices.map(choice => `<button type="button" class="session-panel-choice-btn" data-choice-id="${sanitizeText(choice.id || choice.value || '')}">${sanitizeText(choice.label || choice.id || choice.value || '')}</button>`).join('');
            const choicesSection = choiceItems
                ? `<div class="session-panel-execute-section session-panel-execute-choices" data-role="session-execute-choices"><strong>Choices</strong><div class="session-panel-choice-grid">${choiceItems}</div></div>`
                : '';
            const defaultReply = messageContent || '';
            const manualInput = `
                <div class="session-panel-user-input">
                    <input type="text" class="session-panel-user-input-field" placeholder="Reply…" value="${defaultReply}" data-role="session-user-input">
                    <button type="button" class="session-panel-user-send" data-action="session-send-message" data-default="${sanitizeText(defaultReply || 'continue')}">Send</button>
                </div>`;
            const finalResult = execute.finalResult
                ? sanitizeText(typeof execute.finalResult === 'string' ? execute.finalResult : JSON.stringify(execute.finalResult))
                : '';
            this.executeEl.innerHTML = `
                <div class="session-panel-execute-meta">
                    <span class="session-panel-execute-name">${action || 'Action'}</span>
                    ${step ? `<span class="session-panel-execute-step">${step}</span>` : ''}
                    ${status ? `<span class="session-panel-execute-status">${status}</span>` : ''}
                </div>
                ${progress}
                ${messageContent ? `<div class="session-panel-execute-message">${messageContent}</div>` : ''}
                ${choicesSection}
                ${manualInput}
                ${finalResult ? `<div class="session-panel-execute-final">Final: ${finalResult}</div>` : ''}
            `;
            this._bindExecuteActions(execute);
        }

        destroy() {
            this._subscriptions.forEach(cancel => cancel());
            this._subscriptions = [];
            this._clearActionHandlers();
        }

        _clearActionHandlers() {
            this._actionHandlers.forEach((cleanup) => cleanup());
            this._actionHandlers = [];
        }

        _addActionHandler(element, event, handler) {
            if (!element) return;
            element.addEventListener(event, handler);
            this._actionHandlers.push(() => element.removeEventListener(event, handler));
        }

        _bindExecuteActions(execute) {
            if (!this.executeEl) return;
            this._clearActionHandlers();

            const choiceButtons = this.executeEl.querySelectorAll('[data-choice-id]');
            choiceButtons.forEach((btn) => {
                const choiceId = btn.dataset.choiceId;
                const handler = () => this._submitChoice(choiceId);
                this._addActionHandler(btn, 'click', handler);
            });

            const inputEl = this.executeEl.querySelector('[data-role="session-user-input"]');
            const sendBtn = this.executeEl.querySelector('[data-action="session-send-message"]');
            if (sendBtn) {
                const handler = () => {
                    const text = inputEl?.value?.trim() || sendBtn.dataset.default || '';
                    if (!text) return;
                    this._submitMessage(text);
                    if (inputEl) inputEl.value = '';
                };
                this._addActionHandler(sendBtn, 'click', handler);
            }
            if (inputEl) {
                const keyHandler = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        sendBtn?.click();
                    }
                };
                this._addActionHandler(inputEl, 'keydown', keyHandler);
            }
        }

        _submitChoice(choiceId) {
            if (!choiceId) return;
            this.emit('choice', choiceId);
            const handler = async () => {
                const taskFlow = global.TaskFlow;
                if (taskFlow?.sendChoice) {
                    try {
                        await taskFlow.sendChoice(choiceId, null);
                        return;
                    } catch (err) {
                        console.error('[SessionPanelBinder] choice send failed', err);
                    }
                }
                global.SessionViewModel?.pushMessage({ content: choiceId }, 'user');
            };
            handler();
        }

        _submitMessage(message) {
            if (!message) return;
            this.emit('userMessage', message);
            const handler = async () => {
                const taskFlow = global.TaskFlow;
                if (taskFlow?.sendMessageResult) {
                    try {
                        await taskFlow.sendMessageResult(message, null);
                        return;
                    } catch (err) {
                        console.error('[SessionPanelBinder] message send failed', err);
                    }
                }
                global.SessionViewModel?.pushMessage({ content: message }, 'user');
            };
            handler();
        }
    }

    function getTypeConfig(typeName, overrides) {
        const t = PANEL_TYPES[typeName];
        if (!t) return null;
        return {...t, ...overrides};
    }

    /**
     * Run workflow: create PlasticineUI (or use existing) and add panels for given types.
     * @param {HTMLElement} mount - container for panels
     * @param {Object} options
     * @param {string[]|Object[]} options.types - e.g. ['task','logs','chat'] or [{ type:'task', slot:'left' }, ...]
     * @param {PlasticineUI} [options.pui] - reuse existing UI (adds panels to it)
     * @param {Object} [options.hooks] - { onPanelReady: (id, panel, contentEl) => {}, onClose: (id) => {} }
     * @returns {{ pui: PlasticineUI, panels: Map<string, PlasticinePanel>, panelIds: string[] }}
     */
    function run(mount, options = {}) {
        const {types = [], pui: existingPui = null, hooks = {}} = options;
        const pui = existingPui || new global.PlasticineUI({mount});
        const panels = new Map();
        const panelIds = [];

        const specs = types.map(t => {
            if (typeof t === 'string') return {type: t, overrides: {}};
            const {type, ...overrides} = t;
            return {type, overrides: overrides || {}};
        });

        for (const {type, overrides} of specs) {
            const config = getTypeConfig(type, overrides);
            if (!config) continue;
            const panel = pui.addPanel({
                id: config.id,
                title: config.title,
                slot: config.slot,
                critical: config.critical,
                contentHTML: config.contentHTML,
                onClose: () => {
                    hooks.onClose?.(config.id);
                },
                onStateChange: config.onStateChange
            });
            panels.set(config.id, panel);
            panelIds.push(config.id);
            const contentEl = pui.getContentEl(config.id);
            if (config.id === 'sessions-panel' && contentEl) {
                sessionPanelBinder?.destroy();
                sessionPanelBinder = new SessionPanelBinder(contentEl);
                sessionPanelBinder.bind(global.SessionViewModel);
                if (global.PlasticineWorkflow) {
                    global.PlasticineWorkflow.sessionBinder = sessionPanelBinder;
                }
            }
            if (contentEl && hooks.onPanelReady) hooks.onPanelReady(config.id, panel, contentEl);
        }

        return {pui, panels, panelIds};
    }

    /**
     * Register or override a panel type.
     * @param {string} name
     * @param {Object} config - { id, title, slot, critical?, contentHTML }
     */
    function registerType(name, config) {
        PANEL_TYPES[name] = {...PANEL_TYPES[name], ...config};
    }

    global.PlasticineWorkflow = {
        run,
        registerType,
        PANEL_TYPES,
        getTypeConfig,
        sessionBinder: null
    };
})(typeof window !== 'undefined' ? window : globalThis);
