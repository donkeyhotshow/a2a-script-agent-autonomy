/**
 * Sessions - server-side storage with async protocol
 * Uses API for all operations, with localStorage caching for flow nodes
 *
 * NEW: SSE integration for real-time updates (replaces polling)
 */

const Sessions = {
    state: {
        list: [],
        current: null,
        projectId: null,
        projectPath: null,
        messages: [],
        filter: 'all',
        pendingRequests: new Map(),
        graph: {entities: [], relations: []},
        frameworks: null,
        action: {
            definition: null,
            executionState: null,
            logs: [],
            isRunning: false,
            approved: false,
        },
    },

    api: '/api/v1',
    pollInterval: 5000,
    useSSE: true,  // Enable SSE by default

    init() {
        // Load SSE client script dynamically
        this.loadSSEClient();

        document.getElementById('newSession')?.addEventListener('click', () => this.create());
        document.getElementById('sendMessage')?.addEventListener('click', () => this.send());
        document.getElementById('btnContinue')?.addEventListener('click', () => this.sendContinue());
        document.getElementById('sessionFilter')?.addEventListener('change', (e) => {
            this.state.filter = e.target.value;
            this.load();
        });
        document.getElementById('messageInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
        });
        document.getElementById('action-run')?.addEventListener('click', () => this.runAction());
        document.getElementById('action-cancel')?.addEventListener('click', () => this.cancelAction());
        document.getElementById('action-approve')?.addEventListener('click', () => this.approveAction());
        document.getElementById('showFlow')?.addEventListener('click', () => this.showFlow());
        document.getElementById('flowToggle')?.addEventListener('click', () => this.toggleFlow());
        document.getElementById('flowZoomIn')?.addEventListener('click', () => window.zoomIn?.());
        document.getElementById('flowZoomOut')?.addEventListener('click', () => window.zoomOut?.());
        document.getElementById('flowFitView')?.addEventListener('click', () => window.fitView?.());
        document.getElementById('flowClose')?.addEventListener('click', () => this.hideFlow());

        this.initVueFlow();
        this.initActionDetailsCard();
        setTimeout(() => this.restoreFlowFromStorage(), 500);
    },

    /**
     * Load SSE client script dynamically
     */
    loadSSEClient() {
        if (window.SSEClient) {
            console.log('[Sessions] SSEClient already loaded');
            this.setupSSEHandlers();
            return;
        }

        const script = document.createElement('script');
        script.src = '/js/sse-client.js';
        script.onload = () => {
            console.log('[Sessions] SSE client loaded');
            this.setupSSEHandlers();
        };
        script.onerror = () => {
            console.error('[Sessions] Failed to load SSE client, falling back to polling');
            this.useSSE = false;
        };
        document.head.appendChild(script);
    },

    /**
     * Setup SSE event handlers
     */
    setupSSEHandlers() {
        if (!window.SSEClient) return;

        const client = window.SSEClient;

        // Connected
        client.on('connected', (data) => {
            console.log('[Sessions] SSE connected:', data);
            this.addActionLog('Connected to real-time updates', 'info');
        });

        // Log events
        client.on('log', (data) => {
            console.log('[Sessions] SSE log:', data);
            this.addActionLog(data.message, data.level || 'info');
        });

        // Progress events
        client.on('progress', (data) => {
            console.log('[Sessions] SSE progress:', data);
            this.updateProgress(data.current, data.total, data.message);
        });

        // Status events
        client.on('status', (data) => {
            console.log('[Sessions] SSE status:', data);
            this.handleStatusUpdate(data);
        });

        // Complete events
        client.on('complete', (data) => {
            console.log('[Sessions] SSE complete:', data);
            this.handleComplete(data.result);
        });

        // Error events
        client.on('error', (data) => {
            console.error('[Sessions] SSE error:', data);
            this.addActionLog(data.error || 'Unknown error', 'error');
        });

        // Max reconnect
        client.on('maxReconnect', (data) => {
            console.error('[Sessions] SSE max reconnect reached');
            this.addActionLog('Connection lost. Using fallback to polling.', 'warn');
            this.useSSE = false;
        });
    },

    /**
     * Connect to SSE for current session
     */
    connectSSE(sessionId) {
        if (!this.useSSE || !window.SSEClient) {
            console.log('[Sessions] SSE disabled or not available');
            return;
        }

        // Disconnect existing
        window.SSEClient.disconnect();

        // Connect to session-specific stream
        window.SSEClient.connect(sessionId, this.api);
        console.log('[Sessions] Connecting to SSE for session:', sessionId);
    },

    /**
     * Update progress bar from SSE
     */
    updateProgress(current, total, message) {
        const progressBar = document.getElementById('action-progress-bar');
        const progressText = document.getElementById('action-progress-text');

        if (progressBar && total > 0) {
            const percent = (current / total) * 100;
            progressBar.style.width = percent + '%';
        }

        if (progressText) {
            progressText.textMessage = `${current}/${total}${message ? ': ' + message : ''}`;
        }
    },

    /**
     * Handle status update from SSE
     */
    handleStatusUpdate(data) {
        // Update UI based on status
        if (data.status === 'running') {
            this.state.action.isRunning = true;
        } else if (data.status === 'completed') {
            this.state.action.isRunning = false;
        }

        this.renderActionProgress();
    },

    /**
     * Handle completion from SSE
     */
    handleComplete(result) {
        this.state.action.isRunning = false;

        if (result) {
            this.state.action.executionState = result.executionState;
            this.updateFlowWithResponse(result);
        }

        this.renderActionProgress();
    },

    initVueFlow() {
        let attempts = 0;
        const maxAttempts = 50;

        const checkAndInit = () => {
            attempts++;
            if (window.setFlowNodes && window.setFlowEdges) {
                console.log('VueFlow initialized from Sessions.init()');
                if (this.state.messages?.length > 0) {
                    this.updateFlowFromMessages();
                }
            } else if (attempts < maxAttempts) {
                setTimeout(checkAndInit, 100);
            } else {
                console.warn('VueFlow modules not loaded after 5 seconds');
            }
        };

        setTimeout(checkAndInit, 100);
    },

    restoreFlowFromStorage() {
        if (!window.SessionFlowStorage) {
            console.log('SessionFlowStorage not available yet, retrying...');
            setTimeout(() => this.restoreFlowFromStorage(), 500);
            return;
        }

        const savedNodes = SessionFlowStorage.getNodes();
        if (savedNodes.length > 0 && window.addContextBlock) {
            console.log('Restoring', savedNodes.length, 'session nodes from localStorage');
            savedNodes.forEach(node => {
                window.addContextBlock(node);
            });
        }
    },

    setProject(id, path) {
        this.state.projectId = id;
        this.state.projectPath = path || null;
        this.state.current = null;
        this.state.messages = [];
        this.state.graph = {entities: [], relations: []};
        this.state.frameworks = null;
        this.resetActionState();
        window.clearFlowView?.();

        // Disconnect SSE when switching projects
        if (window.SSEClient) {
            window.SSEClient.disconnect();
        }

        if (id) this.load();
        else this.renderEmpty();
    },

    renderEmpty() {
        const list = document.getElementById('sessionsList');
        const msg = document.getElementById('sessionMessages');
        const hdr = document.getElementById('sessionHeader');
        if (list) list.innerHTML = '<div class="empty">Select a project first</div>';
        if (msg) msg.innerHTML = '<div class="empty">Select a project</div>';
        if (hdr) hdr.innerHTML = '';
    },

    async load() {
        const list = document.getElementById('sessionsList');
        if (!list) return;
        if (!this.state.projectId) {
            this.renderEmpty();
            return;
        }
        try {
            const res = await fetch(`${this.api}/sessions?projectId=${this.state.projectId}`);
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            this.state.list = data.success ? data.data : [];
            this.renderList();
        } catch (err) {
            console.error('Failed to load sessions:', err);
            this.state.list = [];
            this.renderList();
        }
    },

    renderList() {
        const el = document.getElementById('sessionsList');
        if (!el) return;
        if (!this.state.list.length) {
            el.innerHTML = '<div class="empty">No sessions. Click + New</div>';
            return;
        }
        el.innerHTML = this.state.list.map((s) => {
            const preview = s.messages?.[s.messages.length - 1]?.contentText?.slice(0, 40) ||
                s.messages?.[s.messages.length - 1]?.content?.text?.slice(0, 40) || 'New';
            const date = s.createdAt ? new Date(s.createdAt).toLocaleString() : '';
            return `<div class="session-item ${this.state.current?.id === s.id ? 'active' : ''}" data-id="${s.id}">
        <div class="session-item-preview">${A2A.escape(preview)}</div>
        <div class="session-item-meta">${s.status || 'active'} · ${date}</div>
      </div>`;
        }).join('');
        el.querySelectorAll('.session-item').forEach((item) => {
            item.addEventListener('click', () => this.open(item.dataset.id));
        });
    },

    async create() {
        if (!this.state.projectId) return;
        try {
            const res = await fetch(`${this.api}/sessions`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({projectId: this.state.projectId}),
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            if (data.success) {
                this.state.current = data.data;
                this.state.messages = [];
                this.state.list = [data.data, ...this.state.list];
                this.renderList();
                this.renderView();
                window.clearFlowView?.();

                // Connect to SSE for new session
                this.connectSSE(this.state.current.id);
            }
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    },

    async open(id) {
        try {
            const res = await fetch(`${this.api}/sessions/${id}`);
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            if (data.success) {
                this.state.current = data.data;
                this.state.messages = data.data.messages || [];
                document.querySelectorAll('.session-item').forEach((i) =>
                    i.classList.toggle('active', i.dataset.id === id)
                );
                this.renderView();
                this.updateFlowFromMessages();

                // Connect to SSE for this session
                this.connectSSE(id);

                this.state.messages.forEach(m => {
                    if (m.status === 'pending' && m.promiseId) {
                        // Use SSE for real-time updates instead of polling
                        if (!this.useSSE) {
                            this.startPolling(m.promiseId, m.id);
                        } else {
                            console.log('[Sessions] Waiting for SSE update for:', m.promiseId);
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Failed to open session:', err);
        }
    },

    renderView() {
        const hdr = document.getElementById('sessionHeader');
        const msg = document.getElementById('sessionMessages');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessage');

        if (!this.state.current) {
            if (hdr) hdr.innerHTML = '';
            if (msg) msg.innerHTML = '<div class="empty">Select or create a session</div>';
            return;
        }

        const s = this.state.current;
        const hasPending = this.state.messages.some(m => m.status === 'pending');
        const statusText = hasPending ? 'Waiting...' : (s.status || 'active');

        let headerHtml = `<span>#${(s.id || '').slice(0, 8)}</span><span class="${hasPending ? 'warn' : ''}">${statusText}</span>`;
        if (this.state.frameworks) {
            const fw = this.state.frameworks;
            const fwList = [...(fw.frontend || []), ...(fw.backend || [])].slice(0, 4).join(', ');
            headerHtml += `<span class="frameworks" title="${A2A.escape(JSON.stringify(fw))}">${A2A.escape(fwList)}</span>`;
        }
        if (hdr) hdr.innerHTML = headerHtml;

        const btnContinue = document.getElementById('btnContinue');
        if (input) input.disabled = hasPending;
        if (sendBtn) sendBtn.disabled = hasPending;
        if (btnContinue) btnContinue.disabled = hasPending;

        if (msg) {
            if (!this.state.messages.length) {
                msg.innerHTML = '<div class="empty">Send a message to start</div>';
            } else {
                msg.innerHTML = this.state.messages.map((m) => {
                    const isPending = m.status === 'pending';
                    const spinner = isPending ? '<span class="spinner"></span>' : '';
                    const statusClass = isPending ? 'pending' : (m.status === 'failed' ? 'failed' : '');

                    let contentHtml = '';
                    if (m.outcome === 'graph_incomplete') {
                        contentHtml = this.renderGraphIncomplete(m);
                    } else if (m.graph) {
                        contentHtml = this.renderCompleted(m);
                    } else {
                        contentHtml = this.fmt(m.contentText || m.content);
                    }

                    return `<div class="msg ${m.role === 'user' ? 'user' : 'server'} ${statusClass}">
            <div class="msg-role">${m.role === 'user' ? 'You' : 'Server'} ${spinner}</div>
            <div class="msg-content">${contentHtml}</div>
          </div>`;
                }).join('');
                msg.scrollTop = msg.scrollHeight;
            }
        }

        this.renderGraphPanel();
    },

    renderGraphIncomplete(m) {
        const questions = m.questions || [];
        const missing = m.missing || [];
        const frameworks = m.frameworks;

        let html = '<div class="result-card incomplete">';
        html += '<div class="result-status">📋 Graph Incomplete</div>';

        if (frameworks) {
            html += '<div class="result-frameworks"><strong>Frameworks:</strong> ';
            html += [...(frameworks.frontend || []), ...(frameworks.backend || [])].join(', ');
            html += '</div>';
        }

        if (questions.length) {
            html += '<div class="result-questions"><strong>Questions:</strong><ul>';
            questions.forEach(q => {
                html += `<li>${A2A.escape(q)}</li>`;
            });
            html += '</ul></div>';
        }

        if (missing.length) {
            html += '<div class="result-missing"><strong>Missing:</strong> ' + A2A.escape(missing.join(', ')) + '</div>';
        }

        html += '</div>';
        return html;
    },

    renderCompleted(m) {
        const graph = m.graph || {entities: [], relations: []};
        const neurons = m.activated_neuron_ids || [];

        let html = '<div class="result-card completed">';
        html += '<div class="result-status">✅ Completed</div>';

        if (graph.entities && graph.entities.length) {
            html += '<div class="result-entities"><strong>Entities:</strong> ' + graph.entities.length + ' ';
            html += graph.entities.slice(0, 5).map(e =>
                `<span class="entity-badge ${e.type}">${A2A.escape(e.name)}</span>`
            ).join(' ');
            if (graph.entities.length > 5) {
                html += ` <span class="more">+${graph.entities.length - 5} more</span>`;
            }
            html += '</div>';
        }

        if (neurons.length) {
            html += `<div class="result-neurons"><strong>Activated neurons:</strong> ${neurons.length}</div>`;
        }

        html += '</div>';
        return html;
    },

    renderGraphPanel() {
        const panel = document.getElementById('graphPanel');
        if (!panel) return;

        const graph = this.state.graph;
        if (!graph.entities || graph.entities.length === 0) {
            panel.innerHTML = '<div class="empty">No entities in graph</div>';
            return;
        }

        const byType = {};
        graph.entities.forEach(e => {
            if (!byType[e.type]) byType[e.type] = [];
            byType[e.type].push(e);
        });

        let html = '<div class="graph-stats">';
        html += Object.entries(byType).map(([type, entities]) =>
            `<span class="type-count">${type}: ${entities.length}</span>`
        ).join(' · ');
        html += '</div><div class="graph-entities">';

        Object.entries(byType).forEach(([type, entities]) => {
            html += `<div class="entity-group"><strong>${type}:</strong> `;
            html += entities.map(e =>
                `<span class="entity-badge ${type}" title="${A2A.escape(e.path)}">${A2A.escape(e.name)}</span>`
            ).join(' ');
            html += '</div>';
        });
        html += '</div>';

        panel.innerHTML = html;
    },

    fmt(c) {
        if (!c) return '';
        if (typeof c === 'object') return `<pre>${A2A.escape(JSON.stringify(c, null, 2))}</pre>`;
        return A2A.escape(c).replace(/\n/g, '<br>');
    },

    async send() {
        const input = document.getElementById('messageInput');
        const text = input?.value.trim();
        if (!text) return;

        if (!this.state.current) {
            await this.create();
            if (!this.state.current) return;
        }

        const sessionId = this.state.current.id;
        const isFirstMessage = this.state.messages.length === 0;

        const tempId = `temp_${Date.now()}`;
        const tempMessage = {
            id: tempId,
            role: 'user',
            contentText: text,
            content: {text},
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.state.messages.push(tempMessage);
        input.value = '';
        this.renderView();
        this.addTaskToFlow(text);

        try {
            const body = {
                context: {
                    version: '1.0',
                    session_id: sessionId,
                    project_path: this.state.projectPath,
                    new_task: [text],
                    graph: this.state.graph,
                },
            };

            if (isFirstMessage) {
                body.codeBlocks = await this.loadProjectFiles();
            }

            const res = await fetch(`${this.api}/requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (data.success) {
                const {promiseId} = data.data;
                const msgIndex = this.state.messages.findIndex(m => m.id === tempId);
                if (msgIndex >= 0) {
                    this.state.messages[msgIndex].promiseId = promiseId;
                }

                // Use SSE if enabled, otherwise fallback to polling
                if (this.useSSE) {
                    console.log('[Sessions] SSE enabled, waiting for real-time update');
                    // Still start polling as fallback after delay
                    setTimeout(() => {
                        const msg = this.state.messages.find(m => m.promiseId === promiseId);
                        if (msg && msg.status === 'pending') {
                            console.log('[Sessions] SSE timeout, falling back to polling');
                            this.startPolling(promiseId, tempId);
                        }
                    }, 10000);
                } else {
                    this.startPolling(promiseId, tempId);
                }

                this.renderView();
            } else {
                const msgIndex = this.state.messages.findIndex(m => m.id === tempId);
                if (msgIndex >= 0) {
                    this.state.messages[msgIndex].status = 'failed';
                }
                this.renderView();
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            const msgIndex = this.state.messages.findIndex(m => m.id === tempId);
            if (msgIndex >= 0) {
                this.state.messages[msgIndex].status = 'failed';
            }
            this.renderView();
        }
    },

    async loadProjectFiles() {
        const codeBlocks = [];
        try {
            if (this.state.projectPath) {
                const files = ['package.json', 'composer.json'];
                for (const file of files) {
                    try {
                        const res = await fetch(`${this.api}/projects/${this.state.projectId}/files/${file}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.success && data.data?.content) {
                                codeBlocks.push({path: file, content: data.data.content});
                            }
                        }
                    } catch (e) {
                    }
                }
            }
        } catch (err) {
            console.warn('Could not load project files:', err);
        }
        return codeBlocks;
    },

    startPolling(promiseId, messageId) {
        // Skip if already polling
        if (this.state.pendingRequests.has(promiseId)) return;

        this.state.pendingRequests.set(promiseId, {messageId});

        const poll = async () => {
            try {
                const res = await fetch(`${this.api}/requests/${promiseId}/status`);
                const data = await res.json();

                if (!data.success) {
                    this.stopPolling(promiseId);
                    return;
                }

                const {status} = data.data;

                if (status === 'completed' || status === 'failed') {
                    const resultRes = await fetch(`${this.api}/requests/${promiseId}/result`);
                    const resultData = await resultRes.json();

                    const pending = this.state.pendingRequests.get(promiseId);
                    if (pending) {
                        const msgIndex = this.state.messages.findIndex(m => m.id === pending.messageId);
                        if (msgIndex >= 0) {
                            this.state.messages[msgIndex].status = status === 'completed' ? 'completed' : 'failed';

                            const result = resultData.data?.result || resultData.data;
                            if (result) {
                                this.state.messages[msgIndex].content = result;
                                this.state.messages[msgIndex].contentText =
                                    typeof result === 'string' ? result : JSON.stringify(result, null, 2);

                                if (result.outcome) {
                                    this.state.messages[msgIndex].outcome = result.outcome;
                                    this.updateFlowWithResponse(result);
                                    if (result.outcome === 'action_proposal' && result.action) {
                                        this.showApproveButton();
                                    }
                                }
                                if (result.graph) {
                                    this.state.messages[msgIndex].graph = result.graph;
                                    this.state.graph = result.graph;
                                }
                                if (result.frameworks) {
                                    this.state.messages[msgIndex].frameworks = result.frameworks;
                                    this.state.frameworks = result.frameworks;
                                }
                                if (result.questions) this.state.messages[msgIndex].questions = result.questions;
                                if (result.missing) this.state.messages[msgIndex].missing = result.missing;
                                if (result.activated_neuron_ids) {
                                    this.state.messages[msgIndex].activated_neuron_ids = result.activated_neuron_ids;
                                }
                                if (result.action || result.executionState) {
                                    this.handleActionResponse(result);
                                }
                            }
                        }
                    }

                    this.stopPolling(promiseId);
                    this.renderView();

                    if (status === 'completed' && resultData.success && resultData.data?.result) {
                        this.addServerMessage(resultData.data.result);
                    }
                } else {
                    setTimeout(poll, this.pollInterval);
                }
            } catch (err) {
                console.error('Polling error:', err);
                this.stopPolling(promiseId);
            }
        };

        poll();
    },

    stopPolling(promiseId) {
        this.state.pendingRequests.delete(promiseId);
    },

    addServerMessage(content) {
        const msg = {
            id: `srv_${Date.now()}`,
            role: 'server',
            content: typeof content === 'string' ? {text: content} : content,
            contentText: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
            status: 'completed',
            createdAt: new Date().toISOString(),
        };
        this.state.messages.push(msg);
        this.renderView();
    },

    async sendContinue() {
        if (!this.state.current) return;
        const text = '[Делаем]';
        const sessionId = this.state.current.id;

        try {
            const res = await fetch(`${this.api}/requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sessionId,
                    message: text,
                    context: {version: '1.0', session_id: sessionId, continue: true},
                }),
            });
            const data = await res.json();

            if (data.success) {
                const msgId = `m_${Date.now()}`;
                this.state.messages.push({
                    id: msgId,
                    role: 'user',
                    contentText: text,
                    content: {text},
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                });
                this.renderView();

                if (this.useSSE) {
                    console.log('[Sessions] Waiting for SSE update');
                    setTimeout(() => {
                        const msg = this.state.messages.find(m => m.id === msgId);
                        if (msg && msg.status === 'pending') {
                            this.startPolling(data.data.promiseId, msgId);
                        }
                    }, 10000);
                } else {
                    this.startPolling(data.data.promiseId, msgId);
                }
            }
        } catch (err) {
            console.error('Failed to send continue:', err);
        }
    },

    // ==================== Flow Integration ====================

    addTaskToFlow(taskText) {
        if (window.addTask) window.addTask(taskText);
    },

    addSessionNodeToFlow(session) {
        if (!session || !window.addContextBlock) return;

        if (window.SessionFlowStorage && window.SessionFlowStorage.hasSessionNode(session.id)) {
            console.log('Session node already exists:', session.id);
            return;
        }

        const position = window.SessionFlowStorage
            ? window.SessionFlowStorage.getNextPosition()
            : {x: 100 + Math.random() * 200, y: 50 + Math.random() * 200};

        const node = {
            id: `session-${session.id}`,
            type: 'session',
            position: position,
            data: {
                sessionId: session.id,
                label: `Session #${session.id.slice(0, 8)}`,
                status: session.status || 'active',
                messageCount: session.messages?.length || this.state.messages.length,
                createdAt: session.createdAt
            }
        };

        window.addContextBlock(node);
        console.log('Session node added to flow:', node.id);

        if (window.SessionFlowStorage) {
            window.SessionFlowStorage.saveNode(node);
        }
    },

    updateFlowWithResponse(result) {
        if (!result) return;
        const flowContainer = document.getElementById('flow-container');
        if (!flowContainer || flowContainer.style.display === 'none') return;

        if (window.setFlowNodes && window.setFlowEdges) {
            const flowData = this.mapToVueFlow(result);
            window.setFlowNodes(flowData.nodes);
            window.setFlowEdges(flowData.edges);
            console.log('Flow updated with response:', flowData.nodes.length, 'nodes');
        }
    },

    updateFlowFromMessages() {
        const flowContainer = document.getElementById('flow-container');
        if (!flowContainer || flowContainer.style.display === 'none') return;

        const lastServerMsg = this.state.messages
            .filter(m => m.role === 'server' && m.outcome)
            .pop();

        if (lastServerMsg && window.setFlowNodes && window.setFlowEdges) {
            try {
                const result = lastServerMsg.content?.outcome ? lastServerMsg.content :
                    lastServerMsg.contentText ? JSON.parse(lastServerMsg.contentText) : null;
                if (result) {
                    const flowData = this.mapToVueFlow(result);
                    window.setFlowNodes(flowData.nodes);
                    window.setFlowEdges(flowData.edges);
                    console.log('Flow updated with', flowData.nodes.length, 'nodes');

                    if (window.updateFlowHistory) {
                        window.updateFlowHistory(flowData.nodes);
                    }
                }
            } catch (e) {
                console.warn('Failed to parse message content for flow:', e);
            }
        }
    },

    mapToVueFlow(result) {
        const nodes = [];
        const edges = [];

        nodes.push({
            id: 'task-request',
            type: 'taskInput',
            position: {x: 250, y: 0},
            data: {
                label: result.message || 'Task',
                task: result.message || 'Task',
                timestamp: new Date().toISOString()
            },
        });

        if (result.outcome === 'action_proposal' && result.proposedActions) {
            nodes.push({
                id: 'proposal',
                type: 'actionProposal',
                position: {x: 250, y: 100},
                data: {
                    label: 'Proposed: ' + result.proposedActions.length + ' actions',
                    actionName: result.proposedActions[0]?.title || 'Proposed Action',
                    description: result.proposedActions[0]?.description || '',
                    subActions: result.proposedActions[0]?.subActions || [],
                    matchScore: result.proposedActions[0]?.matchScore
                },
            });
            edges.push({
                id: 'e1',
                source: 'task-request',
                target: 'proposal',
                type: 'smoothstep',
                style: {stroke: '#eab308', strokeWidth: 2},
                markerEnd: {type: 'arrowclosed', color: '#eab308'}
            });
        }

        if (result.outcome === 'action_executing' || result.outcome === 'action_complete') {
            nodes.push({
                id: 'executing',
                type: result.outcome === 'action_complete' ? 'actionComplete' : 'subAction',
                position: {x: 250, y: 200},
                data: {
                    label: result.outcome === 'action_complete' ? '✓ Completed' : '▶ Executing',
                    status: result.outcome === 'action_complete' ? 'completed' : 'running'
                },
            });
            edges.push({
                id: 'e2',
                source: 'task-request',
                target: 'executing',
                type: 'smoothstep',
                style: {stroke: '#3b82f6', strokeWidth: 2},
                markerEnd: {type: 'arrowclosed', color: '#3b82f6'}
            });
        }

        if (this.state.action.approved && this.state.current) {
            const sessionNode = {
                id: `session-${this.state.current.id}`,
                type: 'session',
                position: {x: 50, y: 100},
                data: {
                    sessionId: this.state.current.id,
                    label: `Session #${this.state.current.id.slice(0, 8)}`,
                    status: this.state.current.status || 'active',
                    messageCount: this.state.messages.length
                }
            };
            nodes.push(sessionNode);

            edges.push({
                id: 'e-session',
                source: sessionNode.id,
                target: 'task-request',
                type: 'smoothstep',
                style: {stroke: '#8b5cf6', strokeWidth: 2},
                markerEnd: {type: 'arrowclosed', color: '#8b5cf6'}
            });
        }

        return {nodes, edges};
    },

    // ==================== Action Progress ====================

    showApproveButton() {
        const approveBtn = document.getElementById('action-approve');
        const runBtn = document.getElementById('action-run');
        if (approveBtn) approveBtn.style.display = 'block';
        if (runBtn) runBtn.style.display = 'none';

        if (document.getElementById('action-details-card')) {
            this.showActionDetailsCard(this.state.action.definition);
        }

        console.log('Approve button shown');
    },

    async approveAction() {
        if (!this.state.current || !this.state.action.definition) return;

        console.log('Approving action for session:', this.state.current.id);

        this.state.action.approved = true;
        this.addSessionNodeToFlow(this.state.current);

        const approveBtn = document.getElementById('action-approve');
        const runBtn = document.getElementById('action-run');
        if (approveBtn) approveBtn.style.display = 'none';
        if (runBtn) runBtn.style.display = 'block';

        this.updateFlowFromMessages();
        this.runAction();
    },

    handleActionResponse(result) {
        if (!result.action && !result.executionState) return;

        if (result.action) {
            this.state.action.definition = result.action.action;
            this.state.action.matchScore = result.action.matchScore;
        }
        if (result.executionState) {
            this.state.action.executionState = result.executionState;
        }

        this.showActionProgress();
        this.renderActionProgress();

        if (result.outcome === 'action_executing' && !this.state.action.isRunning) {
            this.executeCurrentStep();
        }
        if (result.outcome === 'completed' || result.outcome === 'failed') {
            this.finalizeAction(result);
        }
    },

    showActionProgress() {
        const panel = document.getElementById('action-progress');
        if (panel) panel.style.display = 'block';
    },

    hideActionProgress() {
        const panel = document.getElementById('action-progress');
        if (panel) panel.style.display = 'none';
    },

    renderActionProgress() {
        const {definition, executionState} = this.state.action;
        if (!definition) return;

        const titleEl = document.getElementById('action-title');
        const progressTextEl = document.getElementById('action-progress-text');
        const progressBar = document.getElementById('action-progress-bar');

        if (titleEl) titleEl.textContent = `Action: ${definition.id}`;

        if (executionState && definition.subActions) {
            const currentStep = executionState.currentStepIndex + 1;
            const totalSteps = definition.subActions.length;
            const progressPercent = (executionState.currentStepIndex / totalSteps) * 100;

            if (progressTextEl) progressTextEl.textContent = `Step ${currentStep}/${totalSteps}`;
            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
                progressBar.className = 'progress-fill';
                if (this.state.action.isRunning) progressBar.classList.add('running');
            }
        }

        this.renderActionSteps();
        this.renderActionLogs();
        this.updateActionButtons();
    },

    renderActionSteps() {
        const {definition, executionState} = this.state.action;
        const stepsEl = document.getElementById('action-steps');

        if (!stepsEl || !definition?.subActions) return;

        const history = executionState?.history || [];
        const currentIndex = executionState?.currentStepIndex || 0;

        stepsEl.innerHTML = definition.subActions.map((step, index) => {
            const historyItem = history.find(h => h.stepId === step.id);
            let status = 'pending';
            let statusText = '';

            if (historyItem) {
                status = historyItem.status;
                statusText = historyItem.status;
            } else if (index < currentIndex) {
                status = 'skipped';
                statusText = 'skipped';
            } else if (index === currentIndex && this.state.action.isRunning) {
                status = 'running';
                statusText = 'running...';
            }

            return `<div class="action-step ${status}">
        <span class="step-icon ${status}"></span>
        <span class="step-name">${A2A.escape(step.title)}</span>
        <span class="step-status">${statusText}</span>
      </div>`;
        }).join('');
    },

    renderActionLogs() {
        const logsEl = document.getElementById('action-log');
        if (!logsEl) return;

        const logs = this.state.action.logs || [];

        if (logs.length === 0) {
            logsEl.innerHTML = '<div class="log-entry info">Waiting for execution...</div>';
            return;
        }

        logsEl.innerHTML = logs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            return `<div class="log-entry ${log.level || 'info'}">
        <span class="log-time">${time}</span>
        <span class="log-message">${A2A.escape(log.message)}</span>
      </div>`;
        }).join('');

        logsEl.scrollTop = logsEl.scrollHeight;
    },

    updateActionButtons() {
        const runBtn = document.getElementById('action-run');
        const cancelBtn = document.getElementById('action-cancel');
        const {definition, isRunning} = this.state.action;

        if (runBtn) {
            runBtn.style.display = (definition && !isRunning && !this.state.action.approved) ? 'block' : 'none';
        }
        if (cancelBtn) cancelBtn.style.display = isRunning ? 'block' : 'none';
    },

    addActionLog(message, level = 'info') {
        this.state.action.logs.push({
            message,
            level,
            timestamp: new Date().toISOString(),
        });
        this.renderActionLogs();
    },

    async executeCurrentStep() {
        const {definition, executionState} = this.state.action;
        if (!definition || !executionState) return;

        const currentStep = definition.subActions[executionState.currentStepIndex];
        if (!currentStep) {
            this.finalizeAction({outcome: 'completed'});
            return;
        }

        this.state.action.isRunning = true;
        this.addActionLog(`Starting step: ${currentStep.title}`, 'info');
        this.renderActionProgress();

        try {
            const res = await fetch(`${this.api}/actions/execute-step`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sessionId: this.state.current.id,
                    actionId: definition.id,
                    stepId: currentStep.id,
                    context: {projectPath: this.state.projectPath, previousOutput: this.getPreviousStepOutput()},
                }),
            });

            const data = await res.json();

            if (data.success) {
                const result = data.data;

                if (result.executionState) {
                    this.state.action.executionState = result.executionState;
                }

                if (result.success) {
                    this.addActionLog(`Step completed: ${currentStep.title}`, 'success');
                } else {
                    this.addActionLog(`Step failed: ${result.error || 'Unknown error'}`, 'error');
                }

                this.updateFlowWithResponse(result);

                if (result.outcome === 'action_executing') {
                    setTimeout(() => this.executeCurrentStep(), 500);
                } else if (result.outcome === 'completed') {
                    this.finalizeAction(result);
                } else if (result.outcome === 'failed') {
                    this.finalizeAction(result);
                }
            } else {
                this.addActionLog(`API error: ${data.error || 'Unknown error'}`, 'error');
                this.state.action.isRunning = false;
            }
        } catch (err) {
            console.error('Failed to execute step:', err);
            this.addActionLog(`Error: ${err.message}`, 'error');
            this.state.action.isRunning = false;
        }

        this.renderActionProgress();
    },

    getPreviousStepOutput() {
        const {executionState} = this.state.action;
        if (!executionState?.history?.length) return null;
        const lastHistory = executionState.history[executionState.history.length - 1];
        return lastHistory?.result || null;
    },

    finalizeAction(result) {
        this.state.action.isRunning = false;

        const progressBar = document.getElementById('action-progress-bar');
        if (progressBar) {
            progressBar.className = 'progress-fill';
            if (result.outcome === 'completed') {
                progressBar.classList.add('completed');
                this.addActionLog('Action completed successfully!', 'success');

                if (this.state.current && window.SessionFlowStorage) {
                    const node = window.SessionFlowStorage.getNodeBySessionId(this.state.current.id);
                    if (node) {
                        node.data.status = 'completed';
                        window.SessionFlowStorage.updateNode(node.id, node);
                    }
                }
            } else if (result.outcome === 'failed') {
                progressBar.classList.add('failed');
                this.addActionLog(`Action failed: ${result.error || 'Unknown error'}`, 'error');

                if (this.state.current && window.SessionFlowStorage) {
                    const node = window.SessionFlowStorage.getNodeBySessionId(this.state.current.id);
                    if (node) {
                        node.data.status = 'failed';
                        window.SessionFlowStorage.updateNode(node.id, node);
                    }
                }
            }
        }

        this.updateActionButtons();
        this.sendActionContinue(result);
    },

    async sendActionContinue(result) {
        if (!this.state.current) return;

        try {
            const res = await fetch(`${this.api}/requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sessionId: this.state.current.id,
                    context: {
                        version: '1.0',
                        session_id: this.state.current.id,
                        continue: true,
                        actionResult: {
                            actionId: this.state.action.definition?.id,
                            outcome: result.outcome,
                            executionState: this.state.action.executionState,
                        },
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                const msgId = `action_${Date.now()}`;

                if (this.useSSE) {
                    console.log('[Sessions] Waiting for SSE on continue');
                    setTimeout(() => {
                        const msg = this.state.messages.find(m => m.id === msgId);
                        if (msg && msg.status === 'pending') {
                            this.startPolling(data.data.promiseId, msgId);
                        }
                    }, 10000);
                } else {
                    this.startPolling(data.data.promiseId, msgId);
                }
            }
        } catch (err) {
            console.error('Failed to send action continue:', err);
        }
    },

    async runAction() {
        const {definition} = this.state.action;
        if (!definition) return;

        this.state.action.executionState = {
            actionId: definition.id,
            currentStepIndex: 0,
            history: [],
        };
        this.state.action.logs = [];
        this.state.action.isRunning = true;

        this.addActionLog(`Starting action: ${definition.id}`, 'info');
        this.renderActionProgress();
        this.executeCurrentStep();
    },

    cancelAction() {
        this.state.action.isRunning = false;
        this.addActionLog('Action cancelled by user', 'warn');
        this.renderActionProgress();
    },

    resetActionState() {
        this.state.action = {
            definition: null,
            executionState: null,
            logs: [],
            isRunning: false,
            approved: false,
        };
        this.hideActionProgress();
        this.hideActionDetailsCard();
    },

    // ==================== Action Details Card ====================

    showActionDetailsCard(action) {
        const card = document.getElementById('action-details-card');
        if (!card) return;

        if (action) {
            this.state.action.definition = action.definition || action;
            this.state.action.matchScore = action.matchScore || 0;
        }

        const definition = this.state.action.definition;
        const matchScore = this.state.action.matchScore || 0;

        const titleEl = document.getElementById('actionCardTitle');
        if (titleEl) {
            titleEl.textContent = definition?.name || definition?.id || 'Action';
        }

        const descEl = document.getElementById('actionDescription');
        if (descEl) {
            descEl.textContent = definition?.description || 'No description available';
        }

        const scoreEl = document.getElementById('actionMatchScore');
        if (scoreEl) {
            const percentage = Math.round(matchScore * 100);
            scoreEl.textContent = percentage + '%';
            scoreEl.className = 'match-score';
            if (percentage < 70) scoreEl.classList.add('medium');
            if (percentage < 50) scoreEl.classList.add('low');
        }

        const subActions = definition?.subActions || [];
        const countEl = document.getElementById('subactionsCount');
        const listEl = document.getElementById('subactionsList');

        if (countEl) countEl.textContent = subActions.length;

        if (listEl) {
            if (subActions.length === 0) {
                listEl.innerHTML = '<div class="empty-message">No sub-actions</div>';
            } else {
                listEl.innerHTML = subActions.map((sub, idx) => {
                    const status = sub.status || 'pending';
                    const icon = status === 'completed' ? '✓' : (status === 'failed' ? '✕' : (status === 'running' ? '⟳' : idx + 1));
                    return `
            <div class="subaction-item" data-index="${idx}">
              <span class="subaction-icon ${status}">${icon}</span>
              <span class="subaction-name">${this.escape(sub.title || sub.name || sub.id || 'Sub-action ' + (idx + 1))}</span>
              <span class="subaction-status">${status}</span>
            </div>
          `;
                }).join('');
            }
        }

        const paramsEl = document.getElementById('paramsContent');
        const paramsContainer = document.getElementById('actionParams');
        if (paramsEl && paramsContainer) {
            const params = definition?.parameters || {};
            if (Object.keys(params).length > 0) {
                paramsEl.textContent = JSON.stringify(params, null, 2);
                paramsContainer.style.display = 'block';
            } else {
                paramsContainer.style.display = 'none';
            }
        }

        card.style.display = 'block';
        this.hideActionProgress();

        console.log('Action Details Card shown');
    },

    hideActionDetailsCard() {
        const card = document.getElementById('action-details-card');
        if (card) card.style.display = 'none';
    },

    updateSubActionStatus(stepIndex, status) {
        const listEl = document.getElementById('subactionsList');
        if (!listEl) return;

        const items = listEl.querySelectorAll('.subaction-item');
        if (items[stepIndex]) {
            const item = items[stepIndex];
            const icon = item.querySelector('.subaction-icon');
            const statusEl = item.querySelector('.subaction-status');

            if (icon) {
                icon.className = 'subaction-icon ' + status;
                icon.textContent = status === 'completed' ? '✓' : (status === 'failed' ? '✕' : (status === 'running' ? '⟳' : stepIndex + 1));
            }
            if (statusEl) statusEl.textContent = status;
        }
    },

    rejectAction() {
        console.log('Action rejected by user');
        this.hideActionDetailsCard();
        this.resetActionState();
        this.addActionLog('Action rejected by user', 'warn');
        this.showNotification('Action rejected', 'warn');
    },

    initActionDetailsCard() {
        document.getElementById('closeActionCard')?.addEventListener('click', () => {
            this.hideActionDetailsCard();
        });

        document.getElementById('approveActionCard')?.addEventListener('click', () => {
            this.approveAction();
        });

        document.getElementById('rejectAction')?.addEventListener('click', () => {
            this.rejectAction();
        });

        console.log('Action Details Card initialized');
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      background: ${type === 'warn' ? '#fef3c7' : type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : '#dbeafe'};
      color: ${type === 'warn' ? '#b45309' : type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    escape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    },

    showFlow() {
        const flowContainer = document.getElementById('flow-container');
        if (flowContainer) {
            flowContainer.style.display = 'flex';
            flowContainer.classList.add('active');

            const toggleBtn = document.getElementById('flowToggle');
            if (toggleBtn) toggleBtn.textContent = '🔀 Hide Flow';

            if (window.initFlow) {
                window.initFlow();
                this.updateFlowFromMessages();
            }
        }
    },

    hideFlow() {
        const flowContainer = document.getElementById('flow-container');
        if (flowContainer) {
            flowContainer.style.display = '';
            flowContainer.classList.remove('active');

            const toggleBtn = document.getElementById('flowToggle');
            if (toggleBtn) toggleBtn.textContent = '🔀 Flow';
        }
    },

    toggleFlow() {
        const flowContainer = document.getElementById('flow-container');
        if (flowContainer && flowContainer.classList.contains('active')) {
            this.hideFlow();
        } else {
            this.showFlow();
        }
    },
};

window.Sessions = Sessions;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Sessions.init());
} else {
    Sessions.init();
}
