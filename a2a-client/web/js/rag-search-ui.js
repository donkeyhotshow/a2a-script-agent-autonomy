/**
 * RAG Search UI Module
 * Provides RAG search interface in the web interface
 * Integrates with a2a-client/packages/rag/ via API
 */

(function (global) {
    'use strict';

    const RAGSearchUI = {
        // Configuration
        apiBase: '/api/v1',
        searchEndpoint: '/rag/search',
        indexEndpoint: '/rag/index',
        
        // State
        isSearching: false,
        currentResults: [],
        searchHistory: [],
        
        // UI Elements
        container: null,
        input: null,
        resultsContainer: null,
        
        /**
         * Configure RAG Search UI
         */
        configure(options = {}) {
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.searchEndpoint) this.searchEndpoint = options.searchEndpoint;
            if (options.indexEndpoint) this.indexEndpoint = options.indexEndpoint;
            return this;
        },
        
        /**
         * Initialize RAG Search UI
         */
        init(containerSelector = '#rag-search-container') {
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                console.warn('[RAG Search] Container not found:', containerSelector);
                return this;
            }
            
            this._createUI();
            this._bindEvents();
            
            console.log('[RAG Search] Initialized');
            return this;
        },
        
        /**
         * Create UI elements
         */
        _createUI() {
            this.container.innerHTML = `
                <div class="rag-search-panel">
                    <div class="rag-search-header">
                        <h3>RAG Search</h3>
                        <button class="rag-search-toggle" title="Toggle RAG Search">
                            <span class="icon">🔍</span>
                        </button>
                    </div>
                    <div class="rag-search-content">
                        <div class="rag-search-input-group">
                            <input type="text" 
                                   class="rag-search-input" 
                                   placeholder="Search codebase..."
                                   id="rag-search-input">
                            <button class="rag-search-btn" id="rag-search-btn">Search</button>
                        </div>
                        <div class="rag-search-options">
                            <label>
                                <input type="checkbox" id="rag-use-semantic" checked>
                                Semantic
                            </label>
                            <label>
                                <input type="checkbox" id="rag-use-bm25" checked>
                                BM25
                            </label>
                            <label>
                                <input type="checkbox" id="rag-use-code-similarity">
                                Code Similarity
                            </label>
                        </div>
                        <div class="rag-search-results" id="rag-search-results">
                            <div class="rag-search-hint">Enter a query to search the codebase</div>
                        </div>
                        <div class="rag-search-history" id="rag-search-history"></div>
                    </div>
                </div>
            `;
            
            this.input = this.container.querySelector('#rag-search-input');
            this.resultsContainer = this.container.querySelector('#rag-search-results');
        },
        
        /**
         * Bind event listeners
         */
        _bindEvents() {
            // Search button
            const searchBtn = this.container.querySelector('#rag-search-btn');
            searchBtn?.addEventListener('click', () => this.performSearch());
            
            // Enter key
            this.input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            // Toggle panel
            const toggleBtn = this.container.querySelector('.rag-search-toggle');
            toggleBtn?.addEventListener('click', () => {
                this.container.classList.toggle('collapsed');
            });
        },
        
        /**
         * Perform RAG search
         */
        async performSearch(query = null) {
            const searchQuery = query || this.input?.value?.trim();
            if (!searchQuery) {
                this._showError('Please enter a search query');
                return;
            }
            
            if (this.isSearching) {
                console.log('[RAG Search] Search already in progress');
                return;
            }
            
            this.isSearching = true;
            this._showLoading();
            
            try {
                // Get search options
                const options = {
                    useSemantic: this.container.querySelector('#rag-use-semantic')?.checked ?? true,
                    useBM25: this.container.querySelector('#rag-use-bm25')?.checked ?? true,
                    useCodeSimilarity: this.container.querySelector('#rag-use-code-similarity')?.checked ?? false,
                    limit: 10
                };
                
                // Make API request
                const response = await fetch(`${this.apiBase}${this.searchEndpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: searchQuery,
                        ...options
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Search failed: ${response.status}`);
                }
                
                const data = await response.json();
                this.currentResults = data.results || [];
                
                // Add to history
                this._addToHistory(searchQuery);
                
                // Display results
                this._displayResults(this.currentResults);
                
            } catch (error) {
                console.error('[RAG Search] Error:', error);
                this._showError(error.message || 'Search failed');
            } finally {
                this.isSearching = false;
            }
        },
        
        /**
         * Display search results
         */
        _displayResults(results) {
            if (!results || results.length === 0) {
                this.resultsContainer.innerHTML = `
                    <div class="rag-search-no-results">
                        No results found
                    </div>
                `;
                return;
            }
            
            const html = results.map((result, index) => {
                const chunk = result.chunk || {};
                const filePath = chunk.filePath || 'Unknown';
                const content = this._highlightText(chunk.content || '', result.highlights || []);
                const score = (result.score || 0).toFixed(2);
                
                return `
                    <div class="rag-search-result" data-index="${index}">
                        <div class="rag-result-header">
                            <span class="rag-result-file">${this._escapeHtml(filePath)}</span>
                            <span class="rag-result-score" title="Relevance Score">${score}</span>
                        </div>
                        <div class="rag-result-content">${content}</div>
                        <div class="rag-result-actions">
                            <button class="rag-result-copy" data-content="${this._escapeHtml(chunk.content || '')}">
                                Copy
                            </button>
                            <button class="rag-result-view" data-file="${this._escapeHtml(filePath)}">
                                View File
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            this.resultsContainer.innerHTML = html;
            
            // Bind result actions
            this._bindResultActions();
        },
        
        /**
         * Bind actions for search results
         */
        _bindResultActions() {
            // Copy button
            this.resultsContainer.querySelectorAll('.rag-result-copy').forEach(btn => {
                btn.addEventListener('click', () => {
                    const content = btn.dataset.content;
                    navigator.clipboard.writeText(content).then(() => {
                        this._showNotification('Copied to clipboard');
                    });
                });
            });
            
            // View file button
            this.resultsContainer.querySelectorAll('.rag-result-view').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filePath = btn.dataset.file;
                    this._emit('viewFile', { filePath });
                });
            });
        },
        
        /**
         * Highlight search terms in text
         */
        _highlightText(text, highlights) {
            if (!highlights || highlights.length === 0) {
                return this._escapeHtml(text);
            }
            
            let escaped = this._escapeHtml(text);
            
            // Highlight each match
            highlights.forEach(match => {
                const regex = new RegExp(this._escapeRegex(match), 'gi');
                escaped = escaped.replace(regex, `<mark>$&</mark>`);
            });
            
            return escaped;
        },
        
        /**
         * Add query to search history
         */
        _addToHistory(query) {
            // Remove duplicates
            this.searchHistory = this.searchHistory.filter(q => q !== query);
            
            // Add to beginning
            this.searchHistory.unshift(query);
            
            // Keep only last 10
            this.searchHistory = this.searchHistory.slice(0, 10);
            
            // Update UI
            this._updateHistoryUI();
        },
        
        /**
         * Update history UI
         */
        _updateHistoryUI() {
            const historyContainer = this.container.querySelector('#rag-search-history');
            if (!historyContainer) return;
            
            if (this.searchHistory.length === 0) {
                historyContainer.innerHTML = '';
                return;
            }
            
            historyContainer.innerHTML = `
                <div class="rag-history-header">Recent Searches</div>
                <div class="rag-history-list">
                    ${this.searchHistory.map(q => `
                        <button class="rag-history-item" data-query="${this._escapeHtml(q)}">
                            ${this._escapeHtml(q)}
                        </button>
                    `).join('')}
                </div>
            `;
            
            // Bind history clicks
            historyContainer.querySelectorAll('.rag-history-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const query = btn.dataset.query;
                    this.input.value = query;
                    this.performSearch(query);
                });
            });
        },
        
        /**
         * Show loading state
         */
        _showLoading() {
            this.resultsContainer.innerHTML = `
                <div class="rag-search-loading">
                    <div class="spinner"></div>
                    <span>Searching...</span>
                </div>
            `;
        },
        
        /**
         * Show error message
         */
        _showError(message) {
            this.resultsContainer.innerHTML = `
                <div class="rag-search-error">
                    <span class="error-icon">⚠️</span>
                    <span>${this._escapeHtml(message)}</span>
                </div>
            `;
        },
        
        /**
         * Show notification
         */
        _showNotification(message) {
            // Emit event for external handling
            this._emit('notification', { message });
            
            // Or show inline
            const notification = document.createElement('div');
            notification.className = 'rag-notification';
            notification.textContent = message;
            this.container.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        },
        
        // Event system
        _listeners: new Map(),
        
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },
        
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },
        
        _emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) {
                    console.error('[RAG Search] Event handler error:', e);
                }
            });
        },
        
        // Utility functions
        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        _escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    };

    // Export
    global.RAGSearchUI = RAGSearchUI;

})(typeof window !== 'undefined' ? window : global);
