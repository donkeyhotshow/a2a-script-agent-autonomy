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
            contentHTML: '<div class="pui-placeholder pui-sessions"><ul class="pui-session-list"></ul></div>'
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
        getTypeConfig
    };
})(typeof window !== 'undefined' ? window : globalThis);
