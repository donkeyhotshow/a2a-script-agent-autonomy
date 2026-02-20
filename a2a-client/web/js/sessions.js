/**
 * Sessions - server-side storage with async protocol
 * Uses API for all operations, no localStorage
 */

const Sessions = {
  state: { 
    list: [], 
    current: null, 
    projectId: null, 
    messages: [], 
    filter: 'all',
    pendingRequests: new Map(), // promiseId -> { messageId, timerId }
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
  },

  setProject(id) {
    this.state.projectId = id;
    this.state.current = null;
    this.state.messages = [];
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
    if (hdr) hdr.innerHTML = `<span>#${(s.id || '').slice(0, 8)}</span><span class="${hasPending ? 'warn' : ''}">${statusText}</span>`;
    
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
            return `
            <div class="msg ${m.role === 'user' ? 'user' : 'server'} ${statusClass}">
              <div class="msg-role">${m.role === 'user' ? 'You' : 'Server'} ${spinner}</div>
              <div class="msg-content">${this.fmt(m.contentText || m.content)}</div>
            </div>
          `;
          })
          .join('');
        msg.scrollTop = msg.scrollHeight;
      }
    }
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
      // Create async request
      const res = await fetch(`${this.api}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text,
          context: {
            version: '1.0',
            session_id: sessionId,
            new_task: [text],
          },
        }),
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
              if (resultData.success && resultData.data?.result) {
                this.state.messages[msgIndex].content = resultData.data.result;
                this.state.messages[msgIndex].contentText = 
                  typeof resultData.data.result === 'string' 
                    ? resultData.data.result 
                    : JSON.stringify(resultData.data.result, null, 2);
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
};

window.Sessions = Sessions;
