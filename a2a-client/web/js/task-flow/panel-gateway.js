/**
 * TaskFlow Panel Gateway - isolates TaskFlow from concrete panel manager.
 * Also handles dynamic action loading for router choices.
 */
(function (global) {
    'use strict';

    // Action cache for router choices
    const _actionCache = {
        actions: null,
        loading: false,
        loadedAt: null,
        CACHE_TTL: 5 * 60 * 1000 // 5 minutes
    };

    /**
     * Fetch actions from /api/a2a/actions endpoint
     * @returns {Promise<Array|null>} Array of actions or null on failure
     */
    async function fetchActions() {
        // Return cached if still valid
        if (_actionCache.actions && _actionCache.loadedAt &&
            (Date.now() - _actionCache.loadedAt) < _actionCache.CACHE_TTL) {
            return _actionCache.actions;
        }

        // Prevent duplicate requests
        if (_actionCache.loading) {
            return _actionCache.actions;
        }

        _actionCache.loading = true;

        try {
            const api = global.apiIntegration;
            const fetchFn = api?.fetch || (typeof fetch !== 'undefined' ? fetch : null);

            if (!fetchFn) {
                console.warn('[PanelGateway] No fetch function available');
                _actionCache.loading = false;
                return null;
            }

            // Determine base URL
            const baseUrl = api?.baseUrl || '';
            const url = `${baseUrl}/api/a2a/actions`;

            const response = await fetchFn(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                console.warn('[PanelGateway] Failed to fetch actions:', response.status);
                _actionCache.loading = false;
                return null;
            }

            const data = await response.json();
            const actions = data?.actions || [];

            // Cache the result
            _actionCache.actions = actions;
            _actionCache.loadedAt = Date.now();

            console.log('[PanelGateway] Loaded', actions.length, 'actions');
            _actionCache.loading = false;
            return actions;
        } catch (error) {
            console.error('[PanelGateway] Error loading actions:', error.message);
            _actionCache.loading = false;
            return null;
        }
    }

    /**
     * Clean up action title/description from YAML parser artifacts (quotes)
     * @param {string} value - Raw value
     * @returns {string} Cleaned value
     */
    function cleanActionValue(value) {
        if (!value) return '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        }
        if (value.startsWith("'") && value.endsWith("'")) {
            return value.slice(1, -1);
        }
        return value;
    }

    /**
     * Get choices for router - converts actions to choice format
     * Falls back to static choices if actions unavailable
     * @returns {Promise<Array>} Array of choice objects
     */
    async function getRouterChoices() {
        // Try dynamic actions first
        const actions = await fetchActions();

        if (actions && actions.length > 0) {
            // Convert actions to choices format with proper type mapping
            return actions.map(action => {
                // Map action type for UI categorization
                let type = 'default';
                if (action.type === 'yaml') {
                    type = 'yaml';
                } else if (action.type === 'md') {
                    type = 'md';
                } else if (action.type === 'auto-ai') {
                    type = 'auto-ai';
                }
                
                return {
                    id: action.id,
                    label: cleanActionValue(action.title) || action.id,
                    description: cleanActionValue(action.description) || '',
                    icon: action.icon || null,
                    type: type
                };
            });
        }

        // Fallback to static choices
        return getStaticChoices();
    }

    /**
     * Get static fallback choices
     * @returns {Array} Static choices from router-static-choices.json
     */
    function getStaticChoices() {
        // Default static fallback choices
        return [
            {
                id: 'dialog',
                label: 'AI діалог з користувачем',
                description: 'Вільний текстовий діалог з моделлю без інструментів коду.',
                type: 'dialog'
            },
            {
                id: 'agent',
                label: 'Agent (універсальний режим)',
                description: 'Агент з інструментами: пошук по коду, файли, команди.',
                type: 'agent'
            },
            {
                id: 'task-decomposition',
                label: 'Декомпозиція задачі',
                description: 'Розбиття задачі на підзадачі та план виконання.',
                type: 'decomposition'
            }
        ];
    }

    /**
     * Preload actions for faster subsequent access
     * Call this during app initialization
     */
    function preloadActions() {
        // Don't await - fire and forget
        fetchActions().then(actions => {
            if (actions) {
                console.log('[PanelGateway] Actions preloaded:', actions.length);
            }
        }).catch(() => {
            // Silent fail on preload
        });
    }

    /**
     * Get cached actions without fetching (sync)
     * @returns {Array|null} Cached actions or null
     */
    function getCachedActions() {
        return _actionCache.actions;
    }

    /**
     * Force refresh action cache
     */
    function refreshActions() {
        _actionCache.actions = null;
        _actionCache.loadedAt = null;
        return fetchActions();
    }

    function getManager() {
        return global.PanelManager || null;
    }

    function getPanel(panelId) {
        const pm = getManager();
        if (!pm || !panelId || typeof pm.get !== 'function') return null;
        return pm.get(panelId) || null;
    }

    function bringToFront(panelId) {
        const pm = getManager();
        if (!pm || !panelId || typeof pm.bringToFront !== 'function') return false;
        pm.bringToFront(panelId);
        return true;
    }

    function openTaskPanel(options) {
        const pm = getManager();
        if (!pm || typeof pm.open !== 'function') return null;
        return pm.open('task', options) || null;
    }

    const gateway = {
        getPanel,
        bringToFront,
        openTaskPanel,
        // Action loading API
        getRouterChoices,
        preloadActions,
        getCachedActions,
        refreshActions
    };
    global.TaskFlowPanelGateway = gateway;
    
    // Auto-preload on load for convenience
    if (typeof window !== 'undefined') {
        // Don't auto-preload in browser to avoid unnecessary requests
        // Call preloadActions() manually during app init if needed
    }
})(typeof window !== 'undefined' ? window : globalThis);
