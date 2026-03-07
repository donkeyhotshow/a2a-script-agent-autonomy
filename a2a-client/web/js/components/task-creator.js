/**
 * Task Creator - Global overlay for creating new tasks via AI suggestions
 * 
 * Flow:
 * 1. User clicks "+" button in header
 * 2. Overlay appears with input field
 * 3. User types query and submits
 * 4. Server analyzes and returns suggested actions
 * 5. User selects an option
 * 6. New session is created with selected action context
 */
(function (global) {
    'use strict';

    const TaskCreator = {
        _overlay: null,
        _input: null,
        _suggestionsContainer: null,
        _isOpen: false,
        _currentQuery: '',

        /**
         * Initialize the task creator
         */
        init() {
            this._createOverlay();
            this._bindGlobalShortcut();
            console.log('[TaskCreator] Initialized');
            return this;
        },

        /**
         * Create the overlay DOM structure
         * @private
         */
        _createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'task-creator-overlay';
            overlay.className = 'task-creator-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 80px;
            `;

            overlay.innerHTML = `
                <div class="task-creator-modal">
                    <div class="task-creator-header">
                        <h3>What do you want to do?</h3>
                        <button class="task-creator-close" title="Close (Esc)">×</button>
                    </div>
                    <div class="task-creator-body">
                        <div class="task-creator-input-wrapper">
                            <input type="text" 
                                   class="task-creator-input" 
                                   placeholder="Describe your task... (e.g., 'create a React component for user profile')"
                                   autocomplete="off">
                            <button class="task-creator-submit" title="Send to AI">➤</button>
                        </div>
                        <div class="task-creator-hint">
                            Press Enter to send, Esc to close
                        </div>
                        <div class="task-creator-suggestions" style="display: none;">
                            <div class="suggestions-loading">Analyzing your request...</div>
                        </div>
                        <div class="task-creator-options" style="display: none;">
                            <h4>Select how to proceed:</h4>
                            <div class="options-list"></div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            this._overlay = overlay;
            this._input = overlay.querySelector('.task-creator-input');
            this._suggestionsContainer = overlay.querySelector('.task-creator-suggestions');

            // Bind events
            this._bindEvents();
        },

        /**
         * Bind event handlers
         * @private
         */
        _bindEvents() {
            // Close on backdrop click
            this._overlay.addEventListener('click', (e) => {
                if (e.target === this._overlay) {
                    this.close();
                }
            });

            // Close button
            const closeBtn = this._overlay.querySelector('.task-creator-close');
            closeBtn?.addEventListener('click', () => this.close());

            // Submit on button click
            const submitBtn = this._overlay.querySelector('.task-creator-submit');
            submitBtn?.addEventListener('click', () => this._submitQuery());

            // Submit on Enter
            this._input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._submitQuery();
                }
                if (e.key === 'Escape') {
                    this.close();
                }
            });

            // Focus input when opened
            this._overlay.addEventListener('transitionend', () => {
                if (this._isOpen) {
                    this._input?.focus();
                }
            });
        },

        /**
         * Bind global keyboard shortcut (Cmd/Ctrl + K)
         * @private
         */
        _bindGlobalShortcut() {
            document.addEventListener('keydown', (e) => {
                // Cmd/Ctrl + K to open
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    this.open();
                }
                // Escape to close
                if (e.key === 'Escape' && this._isOpen) {
                    this.close();
                }
            });
        },

        /**
         * Open the task creator overlay
         */
        open() {
            if (this._isOpen) return;
            this._isOpen = true;

            this._overlay.style.display = 'flex';
            // Trigger reflow for animation
            void this._overlay.offsetHeight;
            this._overlay.classList.add('visible');

            // Reset state
            this._input.value = '';
            this._hideSuggestions();
            this._hideOptions();

            // Focus input
            setTimeout(() => this._input?.focus(), 50);

            console.log('[TaskCreator] Opened');
        },

        /**
         * Close the task creator overlay
         */
        close() {
            if (!this._isOpen) return;
            this._isOpen = false;

            this._overlay.classList.remove('visible');
            setTimeout(() => {
                this._overlay.style.display = 'none';
                this._input.value = '';
                this._hideSuggestions();
                this._hideOptions();
            }, 200);

            console.log('[TaskCreator] Closed');
        },

        /**
         * Toggle the overlay
         */
        toggle() {
            if (this._isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Submit the query to server for analysis
         * @private
         */
        async _submitQuery() {
            const query = this._input.value.trim();
            if (!query) return;

            this._currentQuery = query;
            this._showLoading();

            try {
                // Server returns suggestions (options); web only displays them
                const raw = await this._fetchSuggestions(query);
                this._hideLoading();
                const response = raw && typeof raw === 'object' ? (raw.data !== undefined ? raw.data : raw) : null;

                if (response && Array.isArray(response.options) && response.options.length > 0) {
                    this._showOptions(response.options, response.summary ?? '');
                } else {
                    // No options from server → start session with query as-is
                    this._createSessionWithQuery(query);
                }
            } catch (error) {
                console.error('[TaskCreator] Failed to get suggestions:', error);
                this._hideLoading();
                this._createSessionWithQuery(query);
            }
        },

        /**
         * Fetch suggestions from server. List is defined by server; we only request and pass through.
         * @private
         */
        async _fetchSuggestions(query) {
            const g = (typeof window !== 'undefined' ? window : globalThis);
            if (!g.apiIntegration?.analyzeTask) throw new Error('API not available');
            return await g.apiIntegration.analyzeTask(query, 'new-task');
        },

        /**
         * Show loading state
         * @private
         */
        _showLoading() {
            this._suggestionsContainer.style.display = 'block';
            this._suggestionsContainer.innerHTML = `
                <div class="suggestions-loading">
                    <span class="loading-spinner"></span>
                    <span>Analyzing your request...</span>
                </div>
            `;
        },

        /**
         * Hide loading state
         * @private
         */
        _hideLoading() {
            this._suggestionsContainer.style.display = 'none';
        },

        /**
         * Show suggestion options from server response (display only; list comes from server).
         * @private
         */
        _showOptions(options, summary) {
            const optionsContainer = this._overlay.querySelector('.task-creator-options');
            const optionsList = optionsContainer.querySelector('.options-list');

            // Update summary if provided
            if (summary) {
                this._suggestionsContainer.style.display = 'block';
                this._suggestionsContainer.innerHTML = `<div class="suggestions-summary">${this._escapeHtml(summary)}</div>`;
            }

            // Render options
            optionsList.innerHTML = options.map((option, index) => `
                <button class="option-card" data-index="${index}" data-action="${this._escapeHtml(option.action || '')}">
                    <div class="option-icon">${option.icon || '⚡'}</div>
                    <div class="option-content">
                        <div class="option-title">${this._escapeHtml(option.title)}</div>
                        <div class="option-description">${this._escapeHtml(option.description || '')}</div>
                    </div>
                    <div class="option-arrow">→</div>
                </button>
            `).join('');

            // Bind option click handlers
            optionsList.querySelectorAll('.option-card').forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.dataset.index, 10);
                    const selectedOption = options[index];
                    this._selectOption(selectedOption);
                });
            });

            optionsContainer.style.display = 'block';
        },

        /**
         * Hide options
         * @private
         */
        _hideOptions() {
            const optionsContainer = this._overlay.querySelector('.task-creator-options');
            optionsContainer.style.display = 'none';
        },

        /**
         * Hide suggestions
         * @private
         */
        _hideSuggestions() {
            this._suggestionsContainer.style.display = 'none';
        },

        /**
         * Handle option selection
         * @private
         */
        _selectOption(option) {
            console.log('[TaskCreator] Selected option:', option);

            // Create session with selected context
            this._createSessionWithOption(this._currentQuery, option);

            // Close the overlay
            this.close();
        },

        /**
         * Get current project ID from ProjectManager
         * @private
         */
        async _getProjectId() {
            const g = (typeof window !== 'undefined' ? window : globalThis);
            return g.ProjectManager?.getSelectedProjectId?.() ?? null;
        },

        /**
         * Create a new session with the raw query
         * @private
         */
        async _createSessionWithQuery(query) {
            try {
                const projectId = await this._getProjectId();
                if (!projectId) {
                    window.ErrorHandler?.handle(new Error('Select a project first.'), { action: 'createSession', code: 'NO_PROJECT' });
                    return;
                }
                const session = await this._createSession({
                    projectId,
                    title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
                    task: query,
                    context: 'user-query'
                });

                console.log('[TaskCreator] Created session from query:', session.id);
                this.close();
            } catch (error) {
                console.error('[TaskCreator] Failed to create session:', error);
                const msg = error?.message || 'Failed to create session. Please try again.';
                window.ErrorHandler?.handle(new Error(msg), { action: 'createSession' });
            }
        },

        /**
         * Create a new session with selected option (search query is NOT sent as message)
         * @private
         */
        async _createSessionWithOption(query, option) {
            try {
                const projectId = await this._getProjectId();
                if (!projectId) {
                    window.ErrorHandler?.handle(new Error('Select a project first.'), { action: 'createSession', code: 'NO_PROJECT' });
                    return;
                }
                // Note: query is only for finding the action, NOT sent as task/message
                const session = await this._createSession({
                    projectId,
                    title: option.title,
                    task: null,
                    suggestedAction: option.action,
                    actionParams: option.params,
                    context: 'ai-suggested'
                });

                console.log('[TaskCreator] Created session from option:', session.id);

                // If option has immediate action, trigger it
                if (option.autoExecute && option.action) {
                    this._triggerAction(session.id, option);
                }
            } catch (error) {
                console.error('[TaskCreator] Failed to create session:', error);
                const msg = error?.message || 'Failed to create session. Please try again.';
                window.ErrorHandler?.handle(new Error(msg), { action: 'createSession' });
            }
        },

        /**
         * Create session via API
         * @private
         */
        async _createSession(params) {
            const g = (typeof window !== 'undefined' ? window : globalThis);
            if (!g.apiIntegration?.createSession) throw new Error('API not available');
            const session = await g.apiIntegration.createSession(params);

            // Add to SessionStore if available
            if (g.SessionStore) {
                g.SessionStore.createSession(session);
            }

            // Refresh taskbar to show new session
            if (g.TaskbarManager) {
                const taskbarContent = document.querySelector('.taskbar-content');
                if (taskbarContent) {
                    g.TaskbarManager.refreshTaskbar(taskbarContent);
                }
            }

            // Open the new session window
            if (g.WindowManager) {
                setTimeout(() => {
                    g.WindowManager.toggleSessionWindow(session.id);
                }, 100);
            }

            return session;
        },

        /**
         * Trigger immediate action on session
         * @private
         */
        async _triggerAction(sessionId, option) {
            const g = (typeof window !== 'undefined' ? window : globalThis);
            // This would call the action handler to start the task
            if (g.ActionHandler) {
                try {
                    await g.ActionHandler.start(sessionId, option.action, option.params);
                } catch (error) {
                    console.error('[TaskCreator] Failed to trigger action:', error);
                }
            }
        },

        /**
         * Escape HTML for safe rendering
         * @private
         */
        _escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Export
    global.TaskCreator = TaskCreator;

})(typeof window !== 'undefined' ? window : globalThis);
