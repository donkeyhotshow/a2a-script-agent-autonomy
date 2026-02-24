/**
 * Sessions - server-side storage with async protocol
 * Uses API for all operations, no localStorage
 * 
 * New protocol: package.json + composer.json on first request
 */

const Sessions = {
  state: { 
    list: [], 
    current: null, 
    projectId: null, 
    projectPath: null,  // Added: project path for file reading
    messages: [], 
    filter: 'all',
    pendingRequests: new Map(), // promiseId -> { messageId, timerId }
    graph: { entities: [], relations: [] },  // Added: knowledge graph
    frameworks: null,  // Added: extracted frameworks
    // Action execution state
    action: {
      definition: null,       // ActionDefinition
      executionState: null,   // ExecutionState
      logs: [],               // Array of log entries
      isRunning: false,       // Is action currently executing
    },
  },

  // API base URL
  api: '/api/v1',

  // Polling interval (5 seconds)
  pollInterval: 5000,

  init() {
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
    // Action buttons
    document.getElementById('action-run')?.addEventListener('click', () => this.runAction());
    document.getElementById('action-cancel')?.addEventListener('click', () => this.cancelAction());
  },

  setProject(id, path) {
    this.state.projectId = id;
    this.state.projectPath = path || null;
    this.state.current = null;
    this.state.messages = [];
    this.state.graph = { entities: [], relations: [] };
    this.state.frameworks = null;
    this.resetActionState();
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
    el.innerHTML = this.state.list
      .map((s) => {
        const preview = s.messages?.[s.messages.length - 1]?.contentText?.slice(0, 40) || 
                       s.messages?.[s.messages.length - 1]?.content?.text?.slice(0, 40) || 'New';
        const date = s.createdAt ? new Date(s.createdAt).toLocaleString() : '';
        return `
        <div class="session-item ${this.state.current?.id === s.id ? 'active' : ''}" data-id="${s.id}">
          <div class="session-item-preview">${A2A.escape(preview)}</div>
          <div class="session-item-meta">${s.status || 'active'} · ${date}</div>
        </div>
      `;
      })
      .join('');
    el.querySelectorAll('.session-item').forEach((item) => {
      item.addEventListener('click', () => this.open(item.dataset.id));
    });
  },

  async create() {
    if (!this.state.projectId) return;

    try {
      const res = await fetch(`${this.api}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.state.projectId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (data.success) {
        this.state.current = data.data;
        this.state.messages = [];
        this.state.list = [data.data, ...this.state.list];
        this.renderList();
        this.renderView();
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
        
        // Resume polling for any pending messages
        this.state.messages.forEach(m => {
          if (m.status === 'pending' && m.promiseId) {
            this.startPolling(m.promiseId, m.id);
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
    
    // Build header with frameworks info
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
        msg.innerHTML = this.state.messages
          .map((m) => {
            const isPending = m.status === 'pending';
            const spinner = isPending ? '<span class="spinner"></span>' : '';
            const statusClass = isPending ? 'pending' : (m.status === 'failed' ? 'failed' : '');
            
            // Check for special content types
            let contentHtml = '';
            if (m.outcome === 'graph_incomplete') {
              contentHtml = this.renderGraphIncomplete(m);
            } else if (m.graph) {
              contentHtml = this.renderCompleted(m);
            } else {
              contentHtml = this.fmt(m.contentText || m.content);
            }
            
            return `
            <div class="msg ${m.role === 'user' ? 'user' : 'server'} ${statusClass}">
              <div class="msg-role">${m.role === 'user' ? 'You' : 'Server'} ${spinner}</div>
              <div class="msg-content">${contentHtml}</div>
            </div>
          `;
          })
          .join('');
        msg.scrollTop = msg.scrollHeight;
      }
    }
    
    // Render graph panel
    this.renderGraphPanel();
  },

  renderGraphIncomplete(m) {
    const questions = m.questions || [];
    const missing = m.missing || [];
    const frameworks = m.frameworks;
    
    let html = '<div class="result-card incomplete">';
    html += '<div class="result-status">📋 Graph Incomplete</div>';
    
    if (frameworks) {
      html += '<div class="result-frameworks">';
      html += '<strong>Frameworks:</strong> ';
      html += [...(frameworks.frontend || []), ...(frameworks.backend || [])].join(', ');
      html += '</div>';
    }
    
    if (questions.length) {
      html += '<div class="result-questions">';
      html += '<strong>Questions:</strong><ul>';
      questions.forEach(q => {
        html += `<li>${A2A.escape(q)}</li>`;
      });
      html += '</ul></div>';
    }
    
    if (missing.length) {
      html += '<div class="result-missing">';
      html += '<strong>Missing:</strong> ' + A2A.escape(missing.join(', '));
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  },

  renderCompleted(m) {
    const graph = m.graph || { entities: [], relations: [] };
    const neurons = m.activated_neuron_ids || [];
    
    let html = '<div class="result-card completed">';
    html += '<div class="result-status">✅ Completed</div>';
    
    if (graph.entities && graph.entities.length) {
      html += '<div class="result-entities">';
      html += `<strong>Entities:</strong> ${graph.entities.length} `;
      html += graph.entities.slice(0, 5).map(e => 
        `<span class="entity-badge ${e.type}">${A2A.escape(e.name)}</span>`
      ).join(' ');
      if (graph.entities.length > 5) {
        html += ` <span class="more">+${graph.entities.length - 5} more</span>`;
      }
      html += '</div>';
    }
    
    if (neurons.length) {
      html += '<div class="result-neurons">';
      html += `<strong>Activated neurons:</strong> ${neurons.length}`;
      html += '</div>';
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
    
    // Group entities by type
    const byType = {};
    graph.entities.forEach(e => {
      if (!byType[e.type]) byType[e.type] = [];
      byType[e.type].push(e);
    });
    
    let html = '<div class="graph-stats">';
    html += Object.entries(byType).map(([type, entities]) => 
      `<span class="type-count">${type}: ${entities.length}</span>`
    ).join(' · ');
    html += '</div>';
    
    html += '<div class="graph-entities">';
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
    return A2A.escape(c).replace(/\n/g, '<br>').replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
  },

  async send() {
    const input = document.getElementById('messageInput');
    const text = input?.value.trim();
    if (!text) return;

    // Create session if needed
    if (!this.state.current) {
      await this.create();
      if (!this.state.current) return;
    }

    const sessionId = this.state.current.id;
    const isFirstMessage = this.state.messages.length === 0;

    // Add message optimistically
    const tempId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      role: 'user',
      contentText: text,
      content: { text },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.state.messages.push(tempMessage);
    input.value = '';
    this.renderView();

    try {
      // Build request body
      const body = {
        context: {
          version: '1.0',
          session_id: sessionId,
          project_path: this.state.projectPath,
          new_task: [text],
          graph: this.state.graph,  // Include current graph
        },
      };
      
      // On first message, include package.json and composer.json
      if (isFirstMessage) {
        body.codeBlocks = await this.loadProjectFiles();
      }

      // Create async request
      const res = await fetch(`${this.api}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        const { promiseId } = data.data;
        
        // Update message with promiseId
        const msgIndex = this.state.messages.findIndex(m => m.id === tempId);
        if (msgIndex >= 0) {
          this.state.messages[msgIndex].promiseId = promiseId;
        }

        // Start polling
        this.startPolling(promiseId, tempId);
        this.renderView();
      } else {
        // Mark message as failed
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
    // Try to load package.json and composer.json via API
    const codeBlocks = [];
    
    try {
      // Use API endpoint to read project files
      if (this.state.projectPath) {
        const files = ['package.json', 'composer.json'];
        for (const file of files) {
          try {
            const res = await fetch(`${this.api}/projects/${this.state.projectId}/files/${file}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data?.content) {
                codeBlocks.push({
                  path: file,
                  content: data.data.content,
                });
              }
            }
          } catch (e) {
            // File not found, skip
          }
        }
      }
    } catch (err) {
      console.warn('Could not load project files:', err);
    }
    
    return codeBlocks;
  },

  startPolling(promiseId, messageId) {
    // Store pending request
    this.state.pendingRequests.set(promiseId, { messageId });

    const poll = async () => {
      try {
        const res = await fetch(`${this.api}/requests/${promiseId}/status`);
        const data = await res.json();

        if (!data.success) {
          this.stopPolling(promiseId);
          return;
        }

        const { status } = data.data;

        if (status === 'completed' || status === 'failed') {
          // Get result
          const resultRes = await fetch(`${this.api}/requests/${promiseId}/result`);
          const resultData = await resultRes.json();

          // Update message
          const pending = this.state.pendingRequests.get(promiseId);
          if (pending) {
            const msgIndex = this.state.messages.findIndex(m => m.id === pending.messageId);
            if (msgIndex >= 0) {
              this.state.messages[msgIndex].status = status === 'completed' ? 'completed' : 'failed';
              
              // Extract result data
              const result = resultData.data?.result || resultData.data;
              if (result) {
                // Store all result fields
                this.state.messages[msgIndex].content = result;
                this.state.messages[msgIndex].contentText = 
                  typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                
                // Extract special fields
                if (result.outcome) {
                  this.state.messages[msgIndex].outcome = result.outcome;
                }
                if (result.graph) {
                  this.state.messages[msgIndex].graph = result.graph;
                  this.state.graph = result.graph;  // Update global graph
                }
                if (result.frameworks) {
                  this.state.messages[msgIndex].frameworks = result.frameworks;
                  this.state.frameworks = result.frameworks;  // Update global frameworks
                }
                if (result.questions) {
                  this.state.messages[msgIndex].questions = result.questions;
                }
                if (result.missing) {
                  this.state.messages[msgIndex].missing = result.missing;
                }
                if (result.activated_neuron_ids) {
                   this.state.messages[msgIndex].activated_neuron_ids = result.activated_neuron_ids;
                 }
                // Handle action response
                if (result.action || result.executionState) {
                  this.handleActionResponse(result);
                }
               }
             }
           }

          this.stopPolling(promiseId);
          this.renderView();

          // Add server response message if completed
          if (status === 'completed' && resultData.success && resultData.data?.result) {
            this.addServerMessage(resultData.data.result);
          }
        } else {
          // Continue polling
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
      content: typeof content === 'string' ? { text: content } : content,
      contentText: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    this.state.messages.push(msg);
    this.renderView();
  },

  async sendContinue() {
    if (!this.state.current) return;
    
    // Send continue command
    const text = '[Делаем]';
    const sessionId = this.state.current.id;

    try {
      const res = await fetch(`${this.api}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          context: {
            version: '1.0',
            session_id: sessionId,
            continue: true,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        const msgId = `m_${Date.now()}`;
        this.state.messages.push({
          id: msgId,
          role: 'user',
          contentText: text,
          content: { text },
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        this.renderView();
        this.startPolling(data.data.promiseId, msgId);
      }
    } catch (err) {
      console.error('Failed to send continue:', err);
    }
  },

  // ==================== Action Progress Methods ====================

  /**
   * Handle action response from server
   * @param {Object} result - Server response with action field
   */
  handleActionResponse(result) {
    if (!result.action && !result.executionState) return;

    // Update action state
    if (result.action) {
      this.state.action.definition = result.action.action;
      this.state.action.matchScore = result.action.matchScore;
    }

    if (result.executionState) {
      this.state.action.executionState = result.executionState;
    }

    // Show action progress panel
    this.showActionProgress();

    // Render current state
    this.renderActionProgress();

    // If action is executing, start step execution
    if (result.outcome === 'action_executing' && !this.state.action.isRunning) {
      this.executeCurrentStep();
    }

    // If action completed/failed, finalize
    if (result.outcome === 'completed' || result.outcome === 'failed') {
      this.finalizeAction(result);
    }
  },

  /**
   * Show action progress panel
   */
  showActionProgress() {
    const panel = document.getElementById('action-progress');
    if (panel) panel.style.display = 'block';
  },

  /**
   * Hide action progress panel
   */
  hideActionProgress() {
    const panel = document.getElementById('action-progress');
    if (panel) panel.style.display = 'none';
  },

  /**
   * Render action progress UI
   */
  renderActionProgress() {
    const { definition, executionState, logs } = this.state.action;
    if (!definition) return;

    // Update title
    const titleEl = document.getElementById('action-title');
    if (titleEl) titleEl.textContent = `Action: ${definition.id}`;

    // Update progress text
    const progressTextEl = document.getElementById('action-progress-text');
    const progressBar = document.getElementById('action-progress-bar');
    
    if (executionState && definition.subActions) {
      const currentStep = executionState.currentStepIndex + 1;
      const totalSteps = definition.subActions.length;
      const progressPercent = (executionState.currentStepIndex / totalSteps) * 100;

      if (progressTextEl) progressTextEl.textContent = `Step ${currentStep}/${totalSteps}`;
      if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
        
        // Update progress bar class based on status
        progressBar.className = 'progress-fill';
        if (this.state.action.isRunning) {
          progressBar.classList.add('running');
        }
      }
    }

    // Render steps
    this.renderActionSteps();

    // Render logs
    this.renderActionLogs();

    // Update buttons
    this.updateActionButtons();
  },

  /**
   * Render action steps list
   */
  renderActionSteps() {
    const { definition, executionState } = this.state.action;
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

      return `
        <div class="action-step ${status}">
          <span class="step-icon ${status}"></span>
          <span class="step-name">${A2A.escape(step.title)}</span>
          <span class="step-status">${statusText}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * Render action log entries
   */
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
      return `
        <div class="log-entry ${log.level || 'info'}">
          <span class="log-time">${time}</span>
          <span class="log-message">${A2A.escape(log.message)}</span>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    logsEl.scrollTop = logsEl.scrollHeight;
  },

  /**
   * Update action buttons visibility
   */
  updateActionButtons() {
    const runBtn = document.getElementById('action-run');
    const cancelBtn = document.getElementById('action-cancel');
    const { definition, isRunning } = this.state.action;

    if (runBtn) {
      runBtn.style.display = definition && !isRunning ? 'block' : 'none';
    }
    if (cancelBtn) {
      cancelBtn.style.display = isRunning ? 'block' : 'none';
    }
  },

  /**
   * Add log entry
   * @param {string} message - Log message
   * @param {string} level - Log level (info, success, error, warn)
   */
  addActionLog(message, level = 'info') {
    this.state.action.logs.push({
      message,
      level,
      timestamp: new Date().toISOString(),
    });
    this.renderActionLogs();
  },

  /**
   * Execute current step via script-runner API
   */
  async executeCurrentStep() {
    const { definition, executionState } = this.state.action;
    if (!definition || !executionState) return;

    const currentStep = definition.subActions[executionState.currentStepIndex];
    if (!currentStep) {
      // All steps completed
      this.finalizeAction({ outcome: 'completed' });
      return;
    }

    this.state.action.isRunning = true;
    this.addActionLog(`Starting step: ${currentStep.title}`, 'info');
    this.renderActionProgress();

    try {
      // Call API to execute step
      const res = await fetch(`${this.api}/actions/execute-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.state.current.id,
          actionId: definition.id,
          stepId: currentStep.id,
          context: {
            projectPath: this.state.projectPath,
            previousOutput: this.getPreviousStepOutput(),
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        const result = data.data;
        
        // Update execution state
        if (result.executionState) {
          this.state.action.executionState = result.executionState;
        }

        // Log result
        if (result.success) {
          this.addActionLog(`Step completed: ${currentStep.title}`, 'success');
        } else {
          this.addActionLog(`Step failed: ${result.error || 'Unknown error'}`, 'error');
        }

        // Continue to next step or finish
        if (result.outcome === 'action_executing') {
          // Execute next step
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

  /**
   * Get output from previous step
   */
  getPreviousStepOutput() {
    const { executionState } = this.state.action;
    if (!executionState?.history?.length) return null;
    
    const lastHistory = executionState.history[executionState.history.length - 1];
    return lastHistory?.result || null;
  },

  /**
   * Finalize action execution
   * @param {Object} result - Final result
   */
  finalizeAction(result) {
    this.state.action.isRunning = false;

    // Update progress bar
    const progressBar = document.getElementById('action-progress-bar');
    if (progressBar) {
      progressBar.className = 'progress-fill';
      if (result.outcome === 'completed') {
        progressBar.classList.add('completed');
        this.addActionLog('Action completed successfully!', 'success');
      } else if (result.outcome === 'failed') {
        progressBar.classList.add('failed');
        this.addActionLog(`Action failed: ${result.error || 'Unknown error'}`, 'error');
      }
    }

    // Update buttons
    this.updateActionButtons();

    // Send continue to server with action result
    this.sendActionContinue(result);
  },

  /**
   * Send continue with action result
   * @param {Object} result - Action execution result
   */
  async sendActionContinue(result) {
    if (!this.state.current) return;

    try {
      const res = await fetch(`${this.api}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        // Start polling for response
        const msgId = `action_${Date.now()}`;
        this.startPolling(data.data.promiseId, msgId);
      }
    } catch (err) {
      console.error('Failed to send action continue:', err);
    }
  },

  /**
   * Run action manually (from button click)
   */
  async runAction() {
    const { definition } = this.state.action;
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

  /**
   * Cancel action execution
   */
  cancelAction() {
    this.state.action.isRunning = false;
    this.addActionLog('Action cancelled by user', 'warn');
    this.renderActionProgress();
  },

  /**
   * Reset action state
   */
  resetActionState() {
    this.state.action = {
      definition: null,
      executionState: null,
      logs: [],
      isRunning: false,
    };
    this.hideActionProgress();
  },
};

window.Sessions = Sessions;
