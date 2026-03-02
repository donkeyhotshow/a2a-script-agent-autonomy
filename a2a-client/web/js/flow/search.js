/**
 * Enhanced Flow Search - поиск и фильтрация узлов в графе
 * Поддерживает:
 * - Поиск по тексту (label, id, name, description, DSL)
 * - Фильтрация по типу узла
 * - Фильтрация по статусу
 * - Подсветка найденных узлов
 * - Навигация между результатами
 */

const FlowSearch = {
    // State
    state: {
        results: [],
        currentIndex: -1,
        filters: {
            text: '',
            type: '',
            status: ''
        },
        nodesCache: [],
        initialized: false
    },

    /**
     * Инициализация
     */
    init() {
        this.bindEvents();
        this.state.initialized = true;
        console.log('FlowSearch initialized');
    },

    /**
     * Привязка событий к элементам
     */
    bindEvents() {
        const searchInput = document.getElementById('flowSearchInput');
        const typeFilter = document.getElementById('flowTypeFilter');
        const statusFilter = document.getElementById('flowStatusFilter');
        const prevBtn = document.getElementById('searchPrev');
        const nextBtn = document.getElementById('searchNext');

        // Search input events
        if (searchInput) {
            // Real-time search on input
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.onSearch(e.target.value);
                }, 300);
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => this.onKeyDown(e));
        }

        // Filter dropdowns
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => this.onFilterChange('type', e.target.value));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.onFilterChange('status', e.target.value));
        }

        // Navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevResult());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextResult());
        }

        console.log('FlowSearch events bound');
    },

    /**
     * Обработка поискового запроса
     * @param {string} text - текст поиска
     */
    onSearch(text) {
        this.state.filters.text = text.toLowerCase().trim();
        this.performSearch();
    },

    /**
     * Обработка изменения фильтра
     * @param {string} filterType - тип фильтра (type или status)
     * @param {string} value - значение фильтра
     */
    onFilterChange(filterType, value) {
        this.state.filters[filterType] = value;

        // Update UI for active filter
        const filterEl = document.getElementById(filterType === 'type' ? 'flowTypeFilter' : 'flowStatusFilter');
        if (filterEl) {
            if (value) {
                filterEl.classList.add('active');
            } else {
                filterEl.classList.remove('active');
            }
        }

        this.performSearch();
    },

    /**
     * Выполнить поиск по всем узлам
     */
    performSearch() {
        const {text, type, status} = this.state.filters;

        // Get all nodes from VueFlow
        const allNodes = this.getAllNodes();
        this.state.nodesCache = allNodes;

        // Filter nodes
        this.state.results = allNodes.filter(node => {
            // Text search - search in multiple fields
            if (text) {
                const searchableText = [
                    node.id,
                    node.data?.label,
                    node.data?.name,
                    node.data?.task,
                    node.data?.actionName,
                    node.data?.description,
                    node.data?.dsl,
                    node.data?.subActionName,
                    node.data?.sessionId
                ].filter(Boolean).join(' ').toLowerCase();

                if (!searchableText.includes(text)) {
                    return false;
                }
            }

            // Type filter
            if (type && node.type !== type) {
                return false;
            }

            // Status filter
            if (status && node.data?.status !== status) {
                return false;
            }

            return true;
        });

        // Set current index to first result or -1 if none
        this.state.currentIndex = this.state.results.length > 0 ? 0 : -1;

        // Update UI
        this.updateUI();

        // Highlight results
        this.highlightResults();

        console.log(`Search: "${text}" | Type: "${type}" | Status: "${status}" => ${this.state.results.length} results`);
    },

    /**
     * Получить все узлы из VueFlow
     * @returns {Array} массив узлов
     */
    getAllNodes() {
        // Try to get nodes from VueFlow reactive state
        if (window.getFlowNodes) {
            try {
                return window.getFlowNodes() || [];
            } catch (e) {
                console.warn('Error getting flow nodes:', e);
            }
        }
        return [];
    },

    /**
     * Обновить UI (счётчик результатов, состояние кнопок)
     */
    updateUI() {
        const countEl = document.getElementById('searchResultsCount');
        const prevBtn = document.getElementById('searchPrev');
        const nextBtn = document.getElementById('searchNext');

        if (countEl) {
            if (this.state.results.length === 0) {
                countEl.textContent = '0/0';
            } else {
                countEl.textContent = `${this.state.currentIndex + 1}/${this.state.results.length}`;
            }
        }

        const hasResults = this.state.results.length > 1;
        if (prevBtn) {
            prevBtn.disabled = !hasResults;
        }
        if (nextBtn) {
            nextBtn.disabled = !hasResults;
        }
    },

    /**
     * Подсветить найденные узлы
     */
    highlightResults() {
        // Clear previous highlights first
        this.clearHighlights();

        if (this.state.results.length === 0) {
            return;
        }

        const currentNode = this.state.results[this.state.currentIndex];
        if (!currentNode) return;

        // Get all nodes and apply highlighting
        const allNodes = this.getAllNodes();
        if (!allNodes || allNodes.length === 0) return;

        const updatedNodes = allNodes.map(node => {
            const isResult = this.state.results.some(r => r.id === node.id);
            const isCurrent = currentNode?.id === node.id;

            if (isCurrent) {
                // Current result - highlight with accent color and animation
                return {
                    ...node,
                    className: 'search-match current',
                    selected: true
                };
            } else if (isResult) {
                // Other results - subtle highlight
                return {
                    ...node,
                    className: 'search-match'
                };
            }

            return node;
        });

        // Update nodes in VueFlow
        if (window.setFlowNodes) {
            window.setFlowNodes(updatedNodes);
        }

        // Center view on current result after a short delay
        if (currentNode && window.flowFitView) {
            setTimeout(() => {
                this.panToNode(currentNode);
            }, 150);
        }
    },

    /**
     * Очистить подсветку всех узлов
     */
    clearHighlights() {
        const allNodes = this.getAllNodes();
        if (!allNodes || allNodes.length === 0) return;

        const clearedNodes = allNodes.map(node => ({
            ...node,
            className: node.className?.replace('search-match', '').replace('current', '').trim() || '',
            selected: false
        }));

        if (window.setFlowNodes) {
            window.setFlowNodes(clearedNodes);
        }
    },

    /**
     * Перейти к предыдущему результату
     */
    prevResult() {
        if (this.state.results.length === 0) return;

        this.state.currentIndex = this.state.currentIndex > 0
            ? this.state.currentIndex - 1
            : this.state.results.length - 1;

        this.updateUI();
        this.highlightResults();
    },

    /**
     * Перейти к следующему результату
     */
    nextResult() {
        if (this.state.results.length === 0) return;

        this.state.currentIndex = this.state.currentIndex < this.state.results.length - 1
            ? this.state.currentIndex + 1
            : 0;

        this.updateUI();
        this.highlightResults();
    },

    /**
     * Панорамировать к узлу
     * @param {Object} node - узел
     */
    panToNode(node) {
        // Use VueFlow's fitView or custom pan function
        if (window.panToNode) {
            window.panToNode(node.id);
        } else if (window.flowFitView) {
            // Fallback to fitView
            window.flowFitView();
        }
    },

    /**
     * Обработка клавиш
     * @param {KeyboardEvent} e - событие клавиатуры
     */
    onKeyDown(e) {
        // Enter - next result
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                this.prevResult();
            } else {
                this.nextResult();
            }
        }

        // Escape - clear search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('flowSearchInput');
            if (searchInput) {
                searchInput.value = '';
                this.onSearch('');
            }
        }

        // Arrow keys for navigation when input is not focused
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            // Only handle if not in input
            if (document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                if (e.key === 'ArrowDown') {
                    this.nextResult();
                } else {
                    this.prevResult();
                }
            }
        }
    },

    /**
     * Сбросить все фильтры
     */
    resetFilters() {
        this.state.filters = {
            text: '',
            type: '',
            status: ''
        };

        // Reset UI elements
        const searchInput = document.getElementById('flowSearchInput');
        const typeFilter = document.getElementById('flowTypeFilter');
        const statusFilter = document.getElementById('flowStatusFilter');

        if (searchInput) searchInput.value = '';
        if (typeFilter) {
            typeFilter.value = '';
            typeFilter.classList.remove('active');
        }
        if (statusFilter) {
            statusFilter.value = '';
            statusFilter.classList.remove('active');
        }

        this.performSearch();
    },

    /**
     * Получить текущий результат
     * @returns {Object|null} текущий узел
     */
    getCurrentResult() {
        return this.state.results[this.state.currentIndex] || null;
    },

    /**
     * Получить статистику поиска
     * @returns {Object} статистика
     */
    getStats() {
        return {
            totalNodes: this.state.nodesCache.length,
            resultsCount: this.state.results.length,
            currentIndex: this.state.currentIndex,
            filters: {...this.state.filters}
        };
    }
};

// Expose globally
window.FlowSearch = FlowSearch;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FlowSearch.init());
} else {
    FlowSearch.init();
}

console.log('FlowSearch module loaded');
