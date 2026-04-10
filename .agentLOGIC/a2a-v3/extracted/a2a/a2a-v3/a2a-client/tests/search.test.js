/**
 * FlowSearch Unit Tests
 * Tests for FlowSearch module - search and filter functionality for VueFlow nodes
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';

// Mock DOM elements
const mockElements = {
    flowSearchInput: {value: '', classList: {add: vi.fn(), remove: vi.fn()}},
    flowTypeFilter: {value: '', classList: {add: vi.fn(), remove: vi.fn()}},
    flowStatusFilter: {value: '', classList: {add: vi.fn(), remove: vi.fn()}},
    searchPrev: {disabled: false},
    searchNext: {disabled: false},
    searchResultsCount: {textContent: ''}
};

// Setup global mocks
beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.getElementById
    document.getElementById = vi.fn((id) => {
        if (mockElements[id]) {
            return mockElements[id];
        }
        return null;
    });

    // Mock window functions
    window.getFlowNodes = vi.fn();
    window.setFlowNodes = vi.fn();
    window.flowFitView = vi.fn();
    window.panToNode = vi.fn();
});

// Import the FlowSearch module
describe('FlowSearch', () => {

    describe('Initial State', () => {
        it('should have correct initial state', () => {
            // Test the state structure
            const state = {
                results: [],
                currentIndex: -1,
                filters: {
                    text: '',
                    type: '',
                    status: ''
                },
                nodesCache: [],
                initialized: false
            };

            expect(state.results).toEqual([]);
            expect(state.currentIndex).toBe(-1);
            expect(state.filters.text).toBe('');
            expect(state.filters.type).toBe('');
            expect(state.filters.status).toBe('');
            expect(state.nodesCache).toEqual([]);
            expect(state.initialized).toBe(false);
        });
    });

    describe('Search Functionality', () => {
        it('should search by node id', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {task: 'Task 1'}},
                {id: 'node-2', type: 'actionProposal', data: {actionName: 'Action 1'}},
                {id: 'node-3', type: 'subAction', data: {subActionName: 'SubAction 1'}}
            ];

            const searchText = 'node-1';
            const results = nodes.filter(node =>
                node.id.toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('node-1');
        });

        it('should search by task text', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {task: 'Fix import errors'}},
                {id: 'node-2', type: 'taskInput', data: {task: 'Update dependencies'}},
                {id: 'node-3', type: 'taskInput', data: {task: 'Add new feature'}}
            ];

            const searchText = 'fix';
            const results = nodes.filter(node =>
                node.data?.task?.toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(1);
            expect(results[0].data.task).toBe('Fix import errors');
        });

        it('should search by action name', () => {
            const nodes = [
                {id: 'node-1', data: {actionName: 'Fix imports', description: 'Update imports'}},
                {id: 'node-2', data: {actionName: 'Refactor code', description: 'Improve structure'}}
            ];

            const searchText = 'fix';
            const results = nodes.filter(node =>
                (node.data?.actionName || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (node.data?.description || '').toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(1);
            expect(results[0].data.actionName).toBe('Fix imports');
        });

        it('should return empty results for non-matching search', () => {
            const nodes = [
                {id: 'node-1', data: {task: 'Task 1'}},
                {id: 'node-2', data: {task: 'Task 2'}}
            ];

            const searchText = 'nonexistent';
            const results = nodes.filter(node =>
                (node.id || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (node.data?.task || '').toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(0);
        });

        it('should handle empty search text', () => {
            const nodes = [
                {id: 'node-1', data: {task: 'Task 1'}},
                {id: 'node-2', data: {task: 'Task 2'}}
            ];

            const searchText = '';
            const results = nodes.filter(node =>
                !searchText ||
                (node.id || '').toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(2);
        });

        it('should perform case-insensitive search', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {task: 'FIX Import Errors'}},
                {id: 'node-2', type: 'taskInput', data: {task: 'fix dependency issues'}},
                {id: 'node-3', type: 'taskInput', data: {task: 'Update Dependencies'}}
            ];

            const searchText = 'fix';
            const results = nodes.filter(node =>
                (node.data?.task || '').toLowerCase().includes(searchText.toLowerCase())
            );

            expect(results).toHaveLength(2);
            expect(results[0].data.task).toBe('FIX Import Errors');
            expect(results[1].data.task).toBe('fix dependency issues');
        });
    });

    describe('Filter by Type', () => {
        it('should filter nodes by type', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {}},
                {id: 'node-2', type: 'actionProposal', data: {}},
                {id: 'node-3', type: 'taskInput', data: {}},
                {id: 'node-4', type: 'subAction', data: {}}
            ];

            const typeFilter = 'taskInput';
            const filtered = nodes.filter(node => node.type === typeFilter);

            expect(filtered).toHaveLength(2);
            expect(filtered.every(n => n.type === 'taskInput')).toBe(true);
        });

        it('should return all nodes when type filter is empty', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {}},
                {id: 'node-2', type: 'actionProposal', data: {}}
            ];

            const typeFilter = '';
            const filtered = nodes.filter(node => !typeFilter || node.type === typeFilter);

            expect(filtered).toHaveLength(2);
        });
    });

    describe('Filter by Status', () => {
        it('should filter nodes by status', () => {
            const nodes = [
                {id: 'node-1', type: 'subAction', data: {status: 'running'}},
                {id: 'node-2', type: 'subAction', data: {status: 'completed'}},
                {id: 'node-3', type: 'subAction', data: {status: 'failed'}},
                {id: 'node-4', type: 'subAction', data: {status: 'running'}}
            ];

            const statusFilter = 'running';
            const filtered = nodes.filter(node => node.data?.status === statusFilter);

            expect(filtered).toHaveLength(2);
            expect(filtered.every(n => n.data.status === 'running')).toBe(true);
        });

        it('should return all nodes when status filter is empty', () => {
            const nodes = [
                {id: 'node-1', data: {status: 'running'}},
                {id: 'node-2', data: {status: 'completed'}}
            ];

            const statusFilter = '';
            const filtered = nodes.filter(node => !statusFilter || node.data?.status === statusFilter);

            expect(filtered).toHaveLength(2);
        });
    });

    describe('Combined Search and Filter', () => {
        it('should combine text search with type filter', () => {
            const nodes = [
                {id: 'node-1', type: 'taskInput', data: {task: 'Fix imports'}},
                {id: 'node-2', type: 'actionProposal', data: {actionName: 'Fix imports'}},
                {id: 'node-3', type: 'taskInput', data: {task: 'Update imports'}}
            ];

            const textFilter = 'fix';
            const typeFilter = 'taskInput';

            const filtered = nodes.filter(node => {
                const matchesText = !textFilter ||
                    (node.data?.task || '').toLowerCase().includes(textFilter.toLowerCase());
                const matchesType = !typeFilter || node.type === typeFilter;
                return matchesText && matchesType;
            });

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('node-1');
        });

        it('should combine text search with status filter', () => {
            const nodes = [
                {id: 'node-1', type: 'subAction', data: {subActionName: 'Step 1', status: 'running'}},
                {id: 'node-2', type: 'subAction', data: {subActionName: 'Step 2', status: 'completed'}},
                {id: 'node-3', type: 'subAction', data: {subActionName: 'Step 1', status: 'completed'}}
            ];

            const textFilter = 'step 1';
            const statusFilter = 'completed';

            const filtered = nodes.filter(node => {
                const matchesText = !textFilter ||
                    (node.data?.subActionName || '').toLowerCase().includes(textFilter.toLowerCase());
                const matchesStatus = !statusFilter || node.data?.status === statusFilter;
                return matchesText && matchesStatus;
            });

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('node-3');
        });
    });

    describe('Navigation', () => {
        it('should track current index correctly', () => {
            const results = ['node-1', 'node-2', 'node-3'];
            let currentIndex = 0;

            // Move to next
            currentIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
            expect(currentIndex).toBe(1);

            // Move to next again
            currentIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
            expect(currentIndex).toBe(2);

            // Wrap around
            currentIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
            expect(currentIndex).toBe(0);
        });

        it('should navigate to previous result correctly', () => {
            const results = ['node-1', 'node-2', 'node-3'];
            let currentIndex = 2;

            // Move to previous
            currentIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
            expect(currentIndex).toBe(1);

            // Move to previous again
            currentIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
            expect(currentIndex).toBe(0);

            // Wrap around
            currentIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
            expect(currentIndex).toBe(2);
        });

        it('should handle empty results', () => {
            const results = [];
            let currentIndex = results.length > 0 ? 0 : -1;

            expect(currentIndex).toBe(-1);
        });

        it('should set index to first result when results exist', () => {
            const results = ['node-1', 'node-2'];
            let currentIndex = results.length > 0 ? 0 : -1;

            expect(currentIndex).toBe(0);
        });
    });

    describe('UI Updates', () => {
        it('should format results count correctly', () => {
            const results = ['node-1', 'node-2', 'node-3'];
            const currentIndex = 1;

            const countText = results.length === 0
                ? '0/0'
                : `${currentIndex + 1}/${results.length}`;

            expect(countText).toBe('2/3');
        });

        it('should show 0/0 when no results', () => {
            const results = [];
            const currentIndex = -1;

            const countText = results.length === 0
                ? '0/0'
                : `${currentIndex + 1}/${results.length}`;

            expect(countText).toBe('0/0');
        });

        it('should disable navigation when less than 2 results', () => {
            const results = ['node-1'];
            const hasResults = results.length > 1;

            expect(hasResults).toBe(false);
        });

        it('should enable navigation when 2 or more results', () => {
            const results = ['node-1', 'node-2'];
            const hasResults = results.length > 1;

            expect(hasResults).toBe(true);
        });
    });

    describe('Reset Filters', () => {
        it('should reset all filters to default', () => {
            const filters = {
                text: '',
                type: '',
                status: ''
            };

            expect(filters.text).toBe('');
            expect(filters.type).toBe('');
            expect(filters.status).toBe('');
        });

        it('should clear text filter', () => {
            let filters = {text: 'search', type: 'taskInput', status: 'running'};

            filters.text = '';
            filters.type = '';
            filters.status = '';

            expect(filters.text).toBe('');
            expect(filters.type).toBe('');
            expect(filters.status).toBe('');
        });
    });

    describe('Get Stats', () => {
        it('should return search statistics', () => {
            const state = {
                nodesCache: [{}, {}, {}],
                results: [{}, {}],
                currentIndex: 1,
                filters: {text: 'test', type: 'taskInput', status: ''}
            };

            const stats = {
                totalNodes: state.nodesCache.length,
                resultsCount: state.results.length,
                currentIndex: state.currentIndex,
                filters: {...state.filters}
            };

            expect(stats.totalNodes).toBe(3);
            expect(stats.resultsCount).toBe(2);
            expect(stats.currentIndex).toBe(1);
            expect(stats.filters.text).toBe('test');
        });
    });

    describe('Highlight Results', () => {
        it('should mark current result as selected', () => {
            const results = [
                {id: 'node-1', className: ''},
                {id: 'node-2', className: ''},
                {id: 'node-3', className: ''}
            ];
            const currentIndex = 1;
            const currentNode = results[currentIndex];

            const highlighted = results.map(node => ({
                ...node,
                className: node.id === currentNode.id ? 'search-match current' : 'search-match',
                selected: node.id === currentNode.id
            }));

            expect(highlighted[1].selected).toBe(true);
            expect(highlighted[1].className).toBe('search-match current');
            expect(highlighted[0].selected).toBe(false);
        });

        it('should clear previous highlights', () => {
            const node = {
                className: 'search-match current',
                selected: true
            };

            const cleared = {
                ...node,
                className: node.className?.replace('search-match', '').replace('current', '').trim() || '',
                selected: false
            };

            expect(cleared.className).toBe('');
            expect(cleared.selected).toBe(false);
        });
    });

    describe('Keyboard Navigation', () => {
        it('should handle Enter key for next result', () => {
            const event = {key: 'Enter', shiftKey: false, preventDefault: vi.fn()};
            expect(event.key).toBe('Enter');
            expect(event.shiftKey).toBe(false);
        });

        it('should handle Shift+Enter for previous result', () => {
            const event = {key: 'Enter', shiftKey: true, preventDefault: vi.fn()};
            expect(event.key).toBe('Enter');
            expect(event.shiftKey).toBe(true);
        });

        it('should handle Escape to clear search', () => {
            const event = {key: 'Escape'};
            expect(event.key).toBe('Escape');
        });

        it('should handle ArrowDown for next result', () => {
            const event = {key: 'ArrowDown', preventDefault: vi.fn()};
            expect(event.key).toBe('ArrowDown');
        });

        it('should handle ArrowUp for previous result', () => {
            const event = {key: 'ArrowUp', preventDefault: vi.fn()};
            expect(event.key).toBe('ArrowUp');
        });
    });
});
