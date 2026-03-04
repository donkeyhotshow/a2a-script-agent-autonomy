/**
 * Simulation Replay and Debug UI
 * Task 36: Client Web Simulation Replay и Debug UI
 *
 * Features:
 * - Simulation and step selector
 * - Pipeline files viewer (request.json, request.md, response.md, response.json)
 * - Live replay with diff comparison
 * - Integration with simulation-helpers
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        apiBase: '/api',
        simulationsPath: '/simulations',
        volatileFields: ['timestamp', 'created_at', 'updated_at', 'promiseId', 'session_id', 'id', 'request_id'],
        defaultProjectId: 'default'
    };

    // State
    const state = {
        simulations: [],
        currentSimulation: null,
        currentStep: null,
        steps: [],
        pipelineFiles: {},
        liveResponse: null,
        isLoading: false
    };

    // DOM Elements cache
    const elements = {};

    /**
     * Initialize the application
     */
    function init() {
        cacheElements();
        bindEvents();
        loadSimulations();
        console.log('[simulation-debug] Replay and Debug UI initialized');
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.simulationSelect = document.getElementById('simulation-select');
        elements.stepSelect = document.getElementById('step-select');
        elements.pipelineTabs = document.querySelectorAll('.pipeline-tab');
        elements.pipelineContent = document.getElementById('pipeline-content');
        elements.runStepBtn = document.getElementById('run-step-btn');
        elements.diffView = document.getElementById('diff-view');
        elements.diffContent = document.getElementById('diff-content');
        elements.liveResponse = document.getElementById('live-response');
        elements.fixtureResponse = document.getElementById('fixture-response');
        elements.statusBar = document.getElementById('status-bar');
        elements.simulationInfo = document.getElementById('simulation-info');
        elements.stepInfo = document.getElementById('step-info');
        elements.refreshBtn = document.getElementById('refresh-simulations');
        elements.compareBtn = document.getElementById('compare-btn');
        elements.clearDiffBtn = document.getElementById('clear-diff-btn');
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        elements.simulationSelect?.addEventListener('change', handleSimulationChange);
        elements.stepSelect?.addEventListener('change', handleStepChange);
        elements.refreshBtn?.addEventListener('click', loadSimulations);
        elements.runStepBtn?.addEventListener('click', runLiveStep);
        elements.compareBtn?.addEventListener('click', compareResponses);
        elements.clearDiffBtn?.addEventListener('click', clearDiff);

        elements.pipelineTabs.forEach(tab => {
            tab.addEventListener('click', () => switchPipelineTab(tab.dataset.tab));
        });
    }

    /**
     * Load simulations list
     */
    async function loadSimulations() {
        setLoading(true);
        updateStatus('Loading simulations...');

        try {
            // Try to load from Client API first
            const response = await fetch(`${CONFIG.apiBase}/simulations`);
            if (response.ok) {
                const data = await response.json();
                state.simulations = data.simulations || data || [];
            } else {
                // Fallback: load from static index
                const indexResponse = await fetch('/simulations/simulations-index.json');
                if (indexResponse.ok) {
                    const indexData = await indexResponse.json();
                    state.simulations = indexData.simulations || [];
                } else {
                    // Use mock data for development
                    state.simulations = getMockSimulations();
                }
            }

            populateSimulationSelect();
            updateStatus(`Loaded ${state.simulations.length} simulations`);
        } catch (error) {
            console.error('[simulation-debug] Failed to load simulations:', error);
            state.simulations = getMockSimulations();
            populateSimulationSelect();
            updateStatus('Using mock data (API unavailable)');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Get mock simulations for development
     */
    function getMockSimulations() {
        return [
            {
                id: 'user-onboarding',
                name: 'User Onboarding',
                description: 'New user registration and setup flow',
                steps: 5,
                path: '/simulations/user-onboarding'
            },
            {
                id: 'file-analysis',
                name: 'File Analysis',
                description: 'Analyze project files and generate report',
                steps: 3,
                path: '/simulations/file-analysis'
            },
            {
                id: 'task-decomposition',
                name: 'Task Decomposition',
                description: 'Break down complex tasks into subtasks',
                steps: 4,
                path: '/simulations/task-decomposition'
            }
        ];
    }

    /**
     * Populate simulation select dropdown
     */
    function populateSimulationSelect() {
        if (!elements.simulationSelect) return;

        elements.simulationSelect.innerHTML = '<option value="">-- Select Simulation --</option>';
        state.simulations.forEach(sim => {
            const option = document.createElement('option');
            option.value = sim.id;
            option.textContent = sim.name || sim.id;
            elements.simulationSelect.appendChild(option);
        });
    }

    /**
     * Handle simulation selection change
     */
    async function handleSimulationChange(event) {
        const simulationId = event.target.value;
        if (!simulationId) {
            state.currentSimulation = null;
            state.steps = [];
            populateStepSelect();
            return;
        }

        setLoading(true);
        updateStatus(`Loading steps for ${simulationId}...`);

        try {
            state.currentSimulation = state.simulations.find(s => s.id === simulationId);
            await loadSimulationSteps(simulationId);
            populateStepSelect();
            updateSimulationInfo();
            updateStatus(`Loaded ${state.steps.length} steps`);
        } catch (error) {
            console.error('[simulation-debug] Failed to load steps:', error);
            updateStatus('Error loading steps');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Load steps for a simulation
     */
    async function loadSimulationSteps(simulationId) {
        try {
            // Try to load from simulation metadata
            const metaResponse = await fetch(`${CONFIG.simulationsPath}/${simulationId}/simulation.json`);
            if (metaResponse.ok) {
                const meta = await metaResponse.json();
                state.steps = meta.steps || [];
            } else {
                // Generate steps from directory structure
                state.steps = await discoverSteps(simulationId);
            }
        } catch (error) {
            console.warn('[simulation-debug] Using generated steps:', error);
            state.steps = generateMockSteps(simulationId);
        }
    }

    /**
     * Discover steps from simulation directory
     */
    async function discoverSteps(simulationId) {
        const steps = [];
        const stepNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        for (const stepNum of stepNumbers) {
            const stepPath = `${CONFIG.simulationsPath}/${simulationId}/step-${stepNum}`;
            try {
                const response = await fetch(`${stepPath}/request.json`, { method: 'HEAD' });
                if (response.ok) {
                    steps.push({
                        id: `step-${stepNum}`,
                        number: stepNum,
                        name: `Step ${stepNum}`,
                        path: stepPath
                    });
                }
            } catch {
                // Step doesn't exist, stop here
                break;
            }
        }

        return steps;
    }

    /**
     * Generate mock steps for development
     */
    function generateMockSteps(simulationId) {
        const stepCount = state.currentSimulation?.steps || 3;
        return Array.from({ length: stepCount }, (_, i) => ({
            id: `step-${i + 1}`,
            number: i + 1,
            name: `Step ${i + 1}`,
            path: `${CONFIG.simulationsPath}/${simulationId}/step-${i + 1}`
        }));
    }

    /**
     * Populate step select dropdown
     */
    function populateStepSelect() {
        if (!elements.stepSelect) return;

        elements.stepSelect.innerHTML = '<option value="">-- Select Step --</option>';
        state.steps.forEach(step => {
            const option = document.createElement('option');
            option.value = step.id;
            option.textContent = step.name;
            elements.stepSelect.appendChild(option);
        });

        elements.stepSelect.disabled = state.steps.length === 0;
    }

    /**
     * Handle step selection change
     */
    async function handleStepChange(event) {
        const stepId = event.target.value;
        if (!stepId) {
            state.currentStep = null;
            clearPipelineFiles();
            return;
        }

        state.currentStep = state.steps.find(s => s.id === stepId);
        updateStepInfo();
        await loadPipelineFiles();
    }

    /**
     * Update simulation info display
     */
    function updateSimulationInfo() {
        if (!elements.simulationInfo || !state.currentSimulation) return;

        elements.simulationInfo.innerHTML = `
            <h4>${state.currentSimulation.name || state.currentSimulation.id}</h4>
            <p>${state.currentSimulation.description || 'No description'}</p>
            <small>Steps: ${state.steps.length}</small>
        `;
    }

    /**
     * Update step info display
     */
    function updateStepInfo() {
        if (!elements.stepInfo || !state.currentStep) return;

        elements.stepInfo.innerHTML = `
            <h4>${state.currentStep.name}</h4>
            <small>Path: ${state.currentStep.path}</small>
        `;
    }

    /**
     * Load pipeline files for current step
     */
    async function loadPipelineFiles() {
        if (!state.currentStep) return;

        setLoading(true);
        updateStatus('Loading pipeline files...');

        const files = ['request.json', 'request.md', 'response.md', 'response.json'];
        state.pipelineFiles = {};

        for (const file of files) {
            try {
                const content = await fetchPipelineFile(file);
                state.pipelineFiles[file] = content;
            } catch (error) {
                console.warn(`[simulation-debug] Failed to load ${file}:`, error);
                state.pipelineFiles[file] = `// File not found: ${file}`;
            }
        }

        displayPipelineFile('request.json');
        updateStatus('Pipeline files loaded');
        setLoading(false);
    }

    /**
     * Fetch a pipeline file
     */
    async function fetchPipelineFile(filename) {
        const path = `${state.currentStep.path}/${filename}`;
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    }

    /**
     * Clear pipeline files display
     */
    function clearPipelineFiles() {
        state.pipelineFiles = {};
        if (elements.pipelineContent) {
            elements.pipelineContent.textContent = '// Select a step to view pipeline files';
        }
    }

    /**
     * Switch pipeline tab
     */
    function switchPipelineTab(tabName) {
        elements.pipelineTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        displayPipelineFile(tabName);
    }

    /**
     * Display pipeline file content
     */
    function displayPipelineFile(filename) {
        if (!elements.pipelineContent) return;

        const content = state.pipelineFiles[filename] || `// ${filename} not loaded`;
        elements.pipelineContent.textContent = content;
        elements.pipelineContent.className = `code-block ${getLanguageClass(filename)}`;
    }

    /**
     * Get language class for syntax highlighting
     */
    function getLanguageClass(filename) {
        if (filename.endsWith('.json')) return 'language-json';
        if (filename.endsWith('.md')) return 'language-markdown';
        return '';
    }

    /**
     * Run the current step live
     */
    async function runLiveStep() {
        if (!state.currentStep) {
            alert('Please select a step first');
            return;
        }

        setLoading(true);
        updateStatus('Running step live...');

        try {
            const requestData = parseRequestJson();
            const response = await executeLiveRequest(requestData);
            state.liveResponse = response;

            displayLiveResponse(response);
            updateStatus('Live execution completed');
        } catch (error) {
            console.error('[simulation-debug] Live execution failed:', error);
            updateStatus(`Error: ${error.message}`);
            state.liveResponse = { error: error.message };
        } finally {
            setLoading(false);
        }
    }

    /**
     * Parse request.json for current step
     */
    function parseRequestJson() {
        const content = state.pipelineFiles['request.json'];
        if (!content) throw new Error('request.json not loaded');
        return JSON.parse(content);
    }

    /**
     * Execute live request using Client API
     */
    async function executeLiveRequest(requestData) {
        const context = requestData.context || {};
        const sessionId = context.session_id;

        if (!sessionId) {
            throw new Error('No session_id in request context');
        }

        // Use Client API to send message
        const response = await fetch(`${CONFIG.apiBase}/sessions/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data || data;
    }

    /**
     * Display live response
     */
    function displayLiveResponse(response) {
        if (!elements.liveResponse) return;
        elements.liveResponse.textContent = JSON.stringify(response, null, 2);
    }

    /**
     * Compare live response with fixture
     */
    function compareResponses() {
        if (!state.liveResponse) {
            alert('Please run the step live first');
            return;
        }

        const fixtureContent = state.pipelineFiles['response.json'];
        if (!fixtureContent) {
            alert('Response fixture not found');
            return;
        }

        try {
            const fixture = JSON.parse(fixtureContent);
            const diff = computeDiff(fixture, state.liveResponse);
            displayDiff(diff);
        } catch (error) {
            console.error('[simulation-debug] Comparison failed:', error);
            updateStatus(`Comparison error: ${error.message}`);
        }
    }

    /**
     * Compute diff between fixture and live response
     */
    function computeDiff(fixture, live) {
        const differences = [];

        function compareObjects(fixtureObj, liveObj, path = '') {
            const allKeys = new Set([
                ...Object.keys(fixtureObj || {}),
                ...Object.keys(liveObj || {})
            ]);

            for (const key of allKeys) {
                const currentPath = path ? `${path}.${key}` : key;

                // Skip volatile fields
                if (CONFIG.volatileFields.some(f => currentPath.toLowerCase().includes(f.toLowerCase()))) {
                    continue;
                }

                const fixtureVal = fixtureObj?.[key];
                const liveVal = liveObj?.[key];

                if (typeof fixtureVal === 'object' && fixtureVal !== null &&
                    typeof liveVal === 'object' && liveVal !== null) {
                    compareObjects(fixtureVal, liveVal, currentPath);
                } else if (JSON.stringify(fixtureVal) !== JSON.stringify(liveVal)) {
                    differences.push({
                        path: currentPath,
                        fixture: fixtureVal,
                        live: liveVal,
                        type: fixtureVal === undefined ? 'added' :
                              liveVal === undefined ? 'removed' : 'modified'
                    });
                }
            }
        }

        compareObjects(fixture, live);
        return differences;
    }

    /**
     * Display diff results
     */
    function displayDiff(differences) {
        if (!elements.diffContent) return;

        if (differences.length === 0) {
            elements.diffContent.innerHTML = '<div class="diff-match">✓ Responses match (ignoring volatile fields)</div>';
        } else {
            const html = differences.map(diff => `
                <div class="diff-item diff-${diff.type}">
                    <div class="diff-path">${escapeHtml(diff.path)}</div>
                    <div class="diff-values">
                        <div class="diff-fixture">
                            <label>Fixture:</label>
                            <code>${escapeHtml(JSON.stringify(diff.fixture))}</code>
                        </div>
                        <div class="diff-live">
                            <label>Live:</label>
                            <code>${escapeHtml(JSON.stringify(diff.live))}</code>
                        </div>
                    </div>
                </div>
            `).join('');
            elements.diffContent.innerHTML = html;
        }

        elements.diffView?.classList.remove('hidden');
    }

    /**
     * Clear diff view
     */
    function clearDiff() {
        if (elements.diffContent) {
            elements.diffContent.innerHTML = '';
        }
        elements.diffView?.classList.add('hidden');
        state.liveResponse = null;
        if (elements.liveResponse) {
            elements.liveResponse.textContent = '// Run step to see live response';
        }
    }

    /**
     * Escape HTML entities
     */
    function escapeHtml(text) {
        if (text === undefined) return 'undefined';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Set loading state
     */
    function setLoading(loading) {
        state.isLoading = loading;
        document.body.classList.toggle('loading', loading);
        if (elements.runStepBtn) {
            elements.runStepBtn.disabled = loading;
        }
    }

    /**
     * Update status bar
     */
    function updateStatus(message) {
        if (elements.statusBar) {
            elements.statusBar.textContent = message;
        }
        console.log('[simulation-debug]', message);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API for testing
    window.SimulationDebug = {
        state,
        CONFIG,
        loadSimulations,
        runLiveStep,
        compareResponses,
        computeDiff
    };
})();
