/**
 * Projects - data from project .a2a folders
 */

const Projects = {
  state: { list: [], current: null },

  init() {
    document.getElementById('addProject')?.addEventListener('click', () => this.showModal());
    document.getElementById('saveProject')?.addEventListener('click', () => this.save());
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(b => b.addEventListener('click', () => this.hideModal()));
    document.getElementById('addProjectModal')?.addEventListener('click', e => { if (e.target.id === 'addProjectModal') this.hideModal(); });
    this.load();
  },

  async load() {
    const el = document.getElementById('projectsList');
    if (!el) return;
    el.innerHTML = '<div class="loading">Loading...</div>';
    try {
      this.state.list = await Storage.loadProjects();
      const curId = Storage.getCurrentProjectId();
      const p = this.state.list.find((x) => x.id === curId);
      if (p) {
        this.state.current = p;
        A2A.setProject(p);
        if (window.Sessions) Sessions.setProject(p.id);
      }
      this.render();
    } catch {
      el.innerHTML = '<div class="error">Failed to load</div>';
      if (window.A2A?.renderStatus) A2A.renderStatus(false);
      return;
    }
    if (window.A2A?.renderStatus) A2A.renderStatus();
  },

  render() {
    const el = document.getElementById('projectsList');
    if (!el) return;
    if (!this.state.list.length) {
      el.innerHTML = '<div class="empty">No projects. Add project path with .a2a folder.</div>';
      return;
    }
    el.innerHTML = this.state.list.map((p) => `
      <div class="project-card ${this.state.current?.id === p.id ? 'active' : ''}" data-id="${p.id}">
        <div class="project-name">${A2A.escape(p.name)}</div>
        <div class="project-path">${A2A.escape(p.path ?? '')}</div>
        <div class="project-actions">
          <button class="btn btn-small" data-action="open">Open</button>
          <button class="btn btn-small" data-action="remove">Remove</button>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.project-actions')) this.select(card.dataset.id);
      });
    });
    el.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.project-card').dataset.id;
        if (btn.dataset.action === 'open') this.select(id);
        else if (btn.dataset.action === 'remove') this.remove(id);
      });
    });
  },

  selectInUI(id) {
    document.querySelectorAll('.project-card').forEach((c) => c.classList.toggle('active', c.dataset.id === id));
  },

  select(id) {
    const p = this.state.list.find((x) => x.id === id);
    if (!p) return;
    this.state.current = p;
    this.selectInUI(id);
    A2A.setProject(p);
    if (window.Sessions) Sessions.setProject(p.id);
    A2A.nav('sessions');
  },

  async remove(id) {
    if (!confirm('Remove this project?')) return;
    const list = this.state.list.filter((x) => x.id !== id);
    await Storage.saveProjects(list);
    if (this.state.current?.id === id) {
      this.state.current = null;
      A2A.setProject(null);
      if (window.Sessions) Sessions.setProject(null);
    }
    this.load();
  },

  showModal(edit = null) {
    const m = document.getElementById('addProjectModal');
    document.getElementById('projectName').value = edit?.name || '';
    document.getElementById('projectPath').value = edit?.path || '';
    m.dataset.editId = edit?.id || '';
    m.classList.add('active');
  },

  hideModal() {
    document.getElementById('addProjectModal')?.classList.remove('active');
    delete document.getElementById('addProjectModal')?.dataset?.editId;
  },

  async save() {
    const name = document.getElementById('projectName').value.trim();
    const path = document.getElementById('projectPath').value.trim();
    if (!name || !path) return;
    const editId = document.getElementById('addProjectModal')?.dataset?.editId;
    let list = [...this.state.list];
    if (editId) {
      const i = list.findIndex((x) => x.id === editId);
      if (i >= 0) list[i] = { ...list[i], name, path };
    } else {
      list.push({ id: `p_${Date.now()}`, name, path });
    }
    await Storage.saveProjects(list);
    this.hideModal();
    this.load();
  },

  getCurrent() {
    return this.state.current;
  },
};

window.Projects = Projects;
