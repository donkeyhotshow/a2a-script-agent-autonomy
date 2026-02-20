/**
 * Sessions - per-project, stored in localStorage (session state).
 * Task/message data from .a2a when available.
 */

const Sessions = {
  state: { list: [], current: null, projectId: null, messages: [], filter: 'all' },

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

  load() {
    const list = document.getElementById('sessionsList');
    if (!list || !this.state.projectId) return;
    this.state.list = Storage.getSessions(this.state.projectId);
    this.renderList();
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
        const preview = s.messages?.[s.messages.length - 1]?.content?.slice(0, 40) || 'New';
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

  create() {
    if (!this.state.projectId) return;
    const s = {
      id: `s_${Date.now()}`,
      projectId: this.state.projectId,
      status: 'active',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    Storage.saveSession(this.state.projectId, s);
    this.state.current = s;
    this.state.messages = [];
    this.state.list = [s, ...this.state.list.filter((x) => x.id !== s.id)];
    this.renderList();
    this.renderView();
  },

  open(id) {
    const s = Storage.getSession(this.state.projectId, id);
    if (!s) return;
    this.state.current = s;
    this.state.messages = s.messages || [];
    document.querySelectorAll('.session-item').forEach((i) => i.classList.toggle('active', i.dataset.id === id));
    this.renderView();
  },

  renderView() {
    const hdr = document.getElementById('sessionHeader');
    const msg = document.getElementById('sessionMessages');
    if (!this.state.current) {
      if (hdr) hdr.innerHTML = '';
      if (msg) msg.innerHTML = '<div class="empty">Select or create a session</div>';
      return;
    }
    const s = this.state.current;
    if (hdr) hdr.innerHTML = `<span>#${(s.id || '').slice(0, 8)}</span><span>${s.status || 'active'}</span>`;
    if (msg) {
      if (!this.state.messages.length) {
        msg.innerHTML = '<div class="empty">Send a message to start</div>';
      } else {
        msg.innerHTML = this.state.messages
          .map(
            (m) => `
          <div class="msg ${m.role === 'user' ? 'user' : 'server'}">
            <div class="msg-role">${m.role === 'user' ? 'You' : 'Server'}</div>
            <div class="msg-content">${this.fmt(m.content)}</div>
          </div>
        `
          )
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

  send() {
    const input = document.getElementById('messageInput');
    const text = input?.value.trim();
    if (!text) return;
    if (!this.state.current) this.create();
    const m = { id: `m_${Date.now()}`, role: 'user', content: text };
    this.state.messages.push(m);
    const s = { ...this.state.current, messages: [...this.state.messages] };
    Storage.saveSession(this.state.projectId, s);
    input.value = '';
    this.renderView();
  },

  sendContinue() {
    if (!this.state.current) return;
    const m = { id: `m_${Date.now()}`, role: 'server', content: '[Делаем]' };
    this.state.messages.push(m);
    const s = { ...this.state.current, messages: [...this.state.messages] };
    Storage.saveSession(this.state.projectId, s);
    this.renderView();
  },
};

window.Sessions = Sessions;
