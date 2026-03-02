/**
 * Doc panels: one input, open root doc (ACTIONS.md, TODO.md, …) in a panel.
 * Panel id = doc-{key}; never open same doc twice — focus existing.
 * Docs served via /api/a2a/projects/{projectId}/files/{path} (vite-plugin-a2a).
 */

const DOC_LIST = {
    ACTIONS: {title: 'ACTIONS', path: 'ACTIONS.md'},
    ENTITY_TYPES: {title: 'ENTITY_TYPES', path: 'ENTITY_TYPES.md'},
    FEATURES: {title: 'FEATURES', path: 'FEATURES.md'},
    NODES: {title: 'NODES', path: 'NODES.md'},
    PACKAGES: {title: 'PACKAGES', path: 'PACKAGES.md'},
    README: {title: 'README', path: 'README.md'},
    SCRIPTS: {title: 'SCRIPTS', path: 'SCRIPTS.md'},
    SERVICES: {title: 'SERVICES', path: 'SERVICES.md'},
    SOLUTIONS: {title: 'SOLUTIONS', path: 'SOLUTIONS.md'},
    SYSTEMS: {title: 'SYSTEMS', path: 'SYSTEMS.md'},
    TASKS: {title: 'TASKS', path: 'TASKS.md'},
    TERMINATORS: {title: 'TERMINATORS', path: 'TERMINATORS.md'},
    TODO: {title: 'TODO', path: 'TODO.md'},
};

function escapeHtml(s) {
    const el = document.createElement('div');
    el.textContent = s;
    return el.innerHTML;
}

function normalizeDocKey(input) {
    if (!input || typeof input !== 'string') return null;
    const t = input.trim().toUpperCase().replace(/\.md$/i, '');
    return DOC_LIST[t] ? t : null;
}

function panelId(docKey) {
    return `doc-${docKey}`;
}

function createDocPanelDOM(docKey, title) {
    const id = panelId(docKey);
    const div = document.createElement('div');
    div.className = 'pui-panel pui-slot-floating pui-doc-panel expanded';
    div.dataset.panelId = id;
    div.dataset.docKey = docKey;
    div.innerHTML = `
    <div class="pui-panel-header">
      <span class="pui-panel-title">${escapeHtml(title)}</span>
      <div class="pui-panel-controls">
        <button type="button" class="pui-panel-control-btn" data-action="minimize" title="Minimize">−</button>
        <button type="button" class="pui-panel-control-btn" data-action="close" title="Close">×</button>
      </div>
    </div>
    <div class="pui-panel-content pui-doc-content"><pre class="pui-doc-body">Loading…</pre></div>
    <div class="pui-panel-resize"></div>`;
    return div;
}

let openDocPanels = new Map(); // panelId -> { el, contentEl }

function openDocPanel(docKey, container, options = {}) {
    const id = panelId(docKey);
    const existing = openDocPanels.get(id);
    if (existing) {
        existing.el.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        existing.el.style.zIndex = String(1e4 + openDocPanels.size);
        return existing.el;
    }

    const meta = DOC_LIST[docKey];
    const title = meta?.title ?? docKey;
    const path = meta?.path ?? docKey + '.md';
    const projectId = options.projectId ?? 'default';
    const url = `/api/a2a/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(path)}`;

    const el = createDocPanelDOM(docKey, title);
    const contentEl = el.querySelector('.pui-doc-body');
    el.style.left = (options.left ?? 40 + (openDocPanels.size % 4) * 30) + 'px';
    el.style.top = (options.top ?? 40 + (openDocPanels.size % 3) * 24) + 'px';
    el.style.zIndex = String(1e4 + openDocPanels.size);

    container.appendChild(el);
    openDocPanels.set(id, {el, contentEl});

    fetch(url)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.statusText))))
        .then((text) => {
            contentEl.textContent = text;
        })
        .catch((err) => {
            contentEl.textContent = `Error loading ${path}: ${err.message}`;
        });

    el.querySelector('[data-action="close"]')?.addEventListener('click', () => {
        el.remove();
        openDocPanels.delete(id);
    });

    el.querySelector('[data-action="minimize"]')?.addEventListener('click', () => {
        el.classList.toggle('minimized');
        if (el.classList.contains('minimized')) {
            el.style.height = '40px';
            el.querySelector('.pui-panel-content').style.display = 'none';
        } else {
            el.style.height = '';
            el.querySelector('.pui-panel-content').style.display = '';
        }
    });

    return el;
}

function getDocKeys() {
    return Object.keys(DOC_LIST);
}

export {DOC_LIST, getDocKeys, normalizeDocKey, openDocPanel, panelId};
