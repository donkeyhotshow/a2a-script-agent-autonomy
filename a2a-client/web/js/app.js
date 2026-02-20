/**
 * A2A Client - data from project .a2a folders
 */

const A2A = {
  state: { page: 'projects', projectId: null, project: null, indexStatus: '—' },

  init() {
    this.setupNav();
    this.setupHandlers();
    if (window.Projects) Projects.init();
    if (window.Sessions) Sessions.init();
    if (window.Explorer) Explorer.init();
  },

  setupNav() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.nav(link.dataset.page);
      });
    });
  },

  nav(page) {
    this.state.page = page;
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === `page-${page}`));
    if (page === 'projects' && Projects) Projects.load();
    if (page === 'sessions' && Sessions) Sessions.load();
    if (page === 'explorer' && Explorer) Explorer.load();
  },

  setupHandlers() {
    const buildBtn = document.getElementById('buildIndex');
    if (buildBtn) buildBtn.addEventListener('click', () => this.buildIndex());
  },

  loadProject() {
    const id = Storage.getCurrentProjectId();
    this.state.projectId = id;
    this.state.project = null;
    this.renderStatus();
  },

  setProject(project) {
    this.state.project = project;
    this.state.projectId = project?.id ?? null;
    Storage.setCurrentProject(this.state.projectId);
    this.renderStatus();
  },

  buildIndex() {
    this.state.indexStatus = '—';
    this.renderStatus();
  },

  renderStatus() {
    const idx = document.getElementById('indexStatus');
    if (idx) idx.textContent = `Index: ${this.state.indexStatus}`;
    const proj = document.getElementById('currentProject');
    if (proj) proj.textContent = this.state.project?.name || 'No project';
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (dot) dot.classList.add('connected');
    if (text) text.textContent = '.a2a';
  },

  escape(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => A2A.init());
window.A2A = A2A;
