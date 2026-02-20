/**
 * Explorer - file tree from project .a2a/index/rag-files.json
 */

const Explorer = {
  state: { files: [], currentFile: null, content: null },

  init() {
    document.getElementById('refreshFiles')?.addEventListener('click', () => this.load());
    document.getElementById('sendChat')?.addEventListener('click', () => this.sendChat());
    document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChat();
      }
    });
  },

  async load() {
    const el = document.getElementById('fileTree');
    if (!el) return;
    const proj = A2A.state.project;
    if (!proj) {
      el.innerHTML = '<div class="empty">Select a project</div>';
      return;
    }
    el.innerHTML = '<div class="loading">Loading...</div>';
    try {
      const data = await Storage.loadProjectData(proj.id);
      if (!data) throw new Error('No data');
      const index = data.index || {};
      this.state.files = index.files || [];
      this.renderTree();
    } catch {
      el.innerHTML = '<div class="error">Failed</div>';
    }
  },

  renderTree() {
    const el = document.getElementById('fileTree');
    if (!el) return;
    const files = this.state.files;
    if (!files.length) {
      el.innerHTML = '<div class="empty">No index. Run indexer on project.</div>';
      return;
    }
    const paths = files.map((f) => (typeof f === 'string' ? f : f.path));
    el.innerHTML = paths
      .slice(0, 300)
      .map((p) => `<div class="file-item" data-path="${A2A.escape(p)}">📄 ${A2A.escape(p.split('/').pop() || p)}</div>`)
      .join('');
    el.querySelectorAll('.file-item').forEach((item) => {
      item.addEventListener('click', () => this.openFile(item.dataset.path));
    });
  },

  async openFile(filePath) {
    document.querySelectorAll('.file-item').forEach((i) => i.classList.toggle('active', i.dataset.path === filePath));
    this.state.currentFile = filePath;
    document.getElementById('editorHeader').textContent = filePath;
    const proj = A2A.state.project;
    if (!proj) return;
    const content = await Storage.loadFile(proj.id, filePath);
    const el = document.getElementById('editorContent');
    el.innerHTML = '';
    el.textContent = content ?? '(failed to load)';
  },

  sendChat() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text) return;
    const msg = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `<div class="msg-role">You</div><div class="msg-content">${A2A.escape(text)}</div>`;
    msg.appendChild(div);
    msg.scrollTop = msg.scrollHeight;
    input.value = '';
  },
};

window.Explorer = Explorer;
