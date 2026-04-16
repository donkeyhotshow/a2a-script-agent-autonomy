/**
 * Operator UI — async Client API console (HTTP polling only).
 *
 * Endpoints (same-origin): /api/a2a/sessions, /next, /async, GET session.
 */
(function (global) {
    'use strict';

    const store = global.SessionStore;
    const api = global.apiIntegration;
    if (!store) throw new Error('[operator-ui] SessionStore missing (load js/session-store.js)');
    if (!api) throw new Error('[operator-ui] apiIntegration missing (load js/api-integration.js)');

    const UI_STATES = Object.freeze({
        IDLE: 'IDLE',
        CREATING: 'CREATING',
        SENDING: 'SENDING',
        POLLING: 'POLLING',
        WAITING_INPUT: 'WAITING_INPUT',
        WAITING_TEXT: 'WAITING_TEXT',
        WAITING_APPROVAL: 'WAITING_APPROVAL',
        ERROR: 'ERROR',
        DONE: 'DONE',
        // Phase 1 additions — richer execution states
        PLANNING: 'PLANNING',
        GENERATING: 'GENERATING',
        TOOL_RUNNING: 'TOOL_RUNNING',
        RETRYING: 'RETRYING',
        COMPRESSING: 'COMPRESSING',
        RECOVERING: 'RECOVERING',
        BLOCKED: 'BLOCKED',
    });

    const SESSION_STORAGE_KEY = 'a2a_session_id';
    const SESSION_LIST_KEY = 'a2a_session_list';

    const els = {
        root: () => document.getElementById('operator-root'),
        newSessionBtn: () => document.getElementById('op-new-session'),
        sessionList: () => document.getElementById('op-session-list'),
        activeSession: () => document.getElementById('op-active-session'),
        connDot: () => document.getElementById('op-conn-dot'),
        connLabel: () => document.getElementById('op-conn-label'),
        headerSpinner: () => document.getElementById('op-header-spinner'),
        messages: () => document.getElementById('op-messages'),
        thinking: () => document.getElementById('op-thinking'),
        waiting: () => document.getElementById('op-waiting'),
        choices: () => document.getElementById('op-choices'),
        grayroom: () => document.getElementById('op-grayroom'),
        retryBar: () => document.getElementById('op-retry-bar'),
        errorCenter: () => document.getElementById('op-error-center'),
        inputForm: () => document.getElementById('op-input-form'),
        formFields: () => document.getElementById('op-form-fields'),
        input: () => document.getElementById('op-input'),
        sendBtn: () => document.getElementById('op-send'),
        stopBtn: () => document.getElementById('op-stop'),
        monitorToggle: () => document.getElementById('op-monitor-toggle'),
        monitorBody: () => document.getElementById('op-monitor-body'),
        runningBadge: () => document.getElementById('op-running-badge'),
        clearDoneBtn: () => document.getElementById('op-clear-done'),
        tabs: () => Array.from(document.querySelectorAll('.op-tab')),
        panes: () => Array.from(document.querySelectorAll('.op-pane')),
        monitor: () => document.getElementById('operator-monitor'),
        artifactModal: () => document.getElementById('op-artifact-modal'),
        artifactModalTitle: () => document.getElementById('op-artifact-modal-title'),
        artifactModalBody: () => document.getElementById('op-artifact-modal-body'),
        artifactModalClose: () => document.getElementById('op-artifact-modal-close'),
        // Phase 1-3 additions
        tracePane: () => document.querySelector('.op-pane[data-pane="trace"]'),
        artifactsPane: () => document.querySelector('.op-pane[data-pane="artifacts"]'),
        evidencePane: () => document.querySelector('.op-pane[data-pane="evidence"]'),
        tagFilter: () => document.getElementById('op-tag-filter'),
        memoryCard: () => document.getElementById('op-memory-card'),
        replayOverlay: () => document.getElementById('op-replay-overlay'),
        replaySeek: () => document.getElementById('op-replay-seek'),
        replayPos: () => document.getElementById('op-replay-pos'),
        replayPlay: () => document.getElementById('op-replay-play'),
    };

    const state = {
        sessions: [],
        activeSessionId: null,
        monitorOpen: true,
        tasks: [],
        pendingChoices: null,
        lastExecuteSignature: null,
        lastPollAttempts: 0,
        activeFormSpec: null,
        /** @type {string} */
        uiState: UI_STATES.IDLE,
        lastSubmitCtx: null,
        waitingCountdownTimer: null,
        /** @type {Promise<void>|null} */
        _sendChain: null,
        _artifactSeq: 0,
        /** @type {Record<string, unknown[]>} */
        _artifactBlobs: {},
        // Phase 1: trace timeline
        /** @type {Record<string, Array<{type:string, label:string, ts:number, icon:string, sessionId:string}>>} */
        traceEvents: {},
        _traceSeq: 0,
        // Phase 2: diff review status
        /** @type {Record<string, 'accepted'|'rejected'>} */
        diffReviews: {},
        // Phase 2: error center
        lastError: null,
        // Phase 3: session memory
        /** @type {Record<string, {goal:string, touchedFiles:string[], decisions:string[]}>>} */
        sessionMemory: {},
        // Phase 3: session tags
        /** @type {Record<string, string[]>} */
        sessionTags: {},
        // Phase 3: replay
        replayActive: false,
        replayStep: 0,
        replayTimer: null,
        // Phase 3: active tag filter
        activeTagFilter: null,
    };

    function escapeHtml(s) {
        return global.escapeHtml ? global.escapeHtml(s) : String(s ?? '');
    }

    // ── Trace timeline helpers ────────────────────────────────────────────────

    const TRACE_ICONS = {
        'message-sent': '↑',
        'ack-received': '✓',
        'polling-start': '⟳',
        'polling-tick': '·',
        'polling-done': '⊙',
        'tool-call': '▶',
        'hydrate': '⬇',
        'gray-room': '◈',
        'waiting-input': '⬡',
        'waiting-approval': '⏸',
        'form-submit': '↑',
        'choice': '↗',
        'done': '✓',
        'error': '✕',
        'retry': '↺',
        'session-created': '＋',
        'session-switch': '⇄',
    };

    /**
     * Record a trace event for the active session.
     * @param {string} type
     * @param {string} label
     */
    function addTraceEvent(type, label) {
        const sid = state.activeSessionId;
        if (!sid) return;
        if (!state.traceEvents[sid]) state.traceEvents[sid] = [];
        const events = state.traceEvents[sid];
        const prev = events.length > 0 ? events[events.length - 1] : null;
        const now = Date.now();
        const elapsedMs = prev ? now - prev.ts : 0;
        events.push({ type, label, ts: now, icon: TRACE_ICONS[type] || '•', elapsedMs, sessionId: sid });
        // Persist last 200 events per session
        if (events.length > 200) events.splice(0, events.length - 200);
        renderTracePane();
        renderArtifactsPane();
    }

    /** Render the vertical timeline in the Trace pane. */
    function renderTracePane() {
        const pane = els.tracePane();
        if (!pane) return;
        const sid = state.activeSessionId;
        const events = sid ? (state.traceEvents[sid] || []) : [];
        if (events.length === 0) {
            pane.innerHTML = '<div class="op-empty">Waiting for trace steps…</div>';
            return;
        }
        const isReplaying = state.replayActive;
        const showCount = isReplaying ? state.replayStep + 1 : events.length;
        const visible = events.slice(0, showCount);
        const html = visible.map((ev, i) => {
            const isLast = i === visible.length - 1;
            const elapsed = ev.elapsedMs > 0 ? `+${ev.elapsedMs}ms` : '';
            const tsStr = new Date(ev.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isError = ev.type === 'error';
            const isActive = isLast && !isReplaying && (
                state.uiState === UI_STATES.POLLING ||
                state.uiState === UI_STATES.SENDING ||
                state.uiState === UI_STATES.TOOL_RUNNING
            );
            return `<div class="op-trace-row${isError ? ' is-error' : ''}${isActive ? ' is-active' : ''}" data-type="${escapeHtml(ev.type)}">` +
                `<div class="op-trace-icon" aria-hidden="true">${escapeHtml(ev.icon)}</div>` +
                `<div class="op-trace-body">` +
                `<div class="op-trace-label">${escapeHtml(ev.label)}</div>` +
                `<div class="op-trace-meta">${escapeHtml(tsStr)}${elapsed ? ' · ' + escapeHtml(elapsed) : ''}</div>` +
                `</div>` +
                (isActive ? `<div class="op-trace-spinner" aria-hidden="true"></div>` : '') +
                `</div>`;
        }).join('');
        pane.innerHTML = `<div class="op-trace-list">${html}</div>`;
        // Auto-scroll to bottom when not replaying
        if (!isReplaying) pane.scrollTop = pane.scrollHeight;
    }

    // ── Diff rendering helpers ────────────────────────────────────────────────

    /**
     * Parse a unified diff string into file blocks.
     * @param {string} text
     * @returns {Array<{filename:string, added:number, removed:number, lines:Array<{type:string,text:string}>}>}
     */
    function parseDiff(text) {
        const lines = String(text || '').split('\n');
        const files = [];
        let cur = null;
        for (const line of lines) {
            if (line.startsWith('diff --git ') || line.startsWith('--- ') && !cur) {
                if (cur) files.push(cur);
                const fname = line.startsWith('diff --git ')
                    ? (line.split(' b/')[1] || line).trim()
                    : line.replace(/^--- [ab]\//, '').trim();
                cur = { filename: fname, added: 0, removed: 0, lines: [] };
            } else if (cur && line.startsWith('+++ ')) {
                // Update filename from +++ line (more reliable)
                const fname = line.replace(/^\+\+\+ [ab]\//, '').replace(/^\+\+\+ /, '').trim();
                if (fname && fname !== '/dev/null') cur.filename = fname;
            } else if (line.startsWith('--- ') && !cur) {
                if (cur) files.push(cur);
                cur = { filename: line.replace(/^--- [ab]\//, '').trim(), added: 0, removed: 0, lines: [] };
            } else if (cur && line.startsWith('@@')) {
                cur.lines.push({ type: 'hunk', text: line });
            } else if (cur && line.startsWith('+')) {
                cur.lines.push({ type: 'add', text: line.slice(1) });
                cur.added++;
            } else if (cur && line.startsWith('-')) {
                cur.lines.push({ type: 'del', text: line.slice(1) });
                cur.removed++;
            } else if (cur) {
                cur.lines.push({ type: 'ctx', text: line.startsWith(' ') ? line.slice(1) : line });
            }
        }
        if (cur) files.push(cur);
        return files.filter((f) => f.lines.length > 0);
    }

    /**
     * Render a list of diff file blocks as HTML.
     * @param {Array} files
     * @param {string} groupKey - used as key prefix for accept/reject state
     * @param {number} turnIdx
     */
    function renderDiffFiles(files, groupKey, turnIdx) {
        if (!files || files.length === 0) return '';
        return files.map((f, fi) => {
            const key = `${groupKey}:${fi}`;
            const review = state.diffReviews[key];
            const reviewClass = review === 'accepted' ? ' is-accepted' : review === 'rejected' ? ' is-rejected' : '';
            const reviewLabel = review === 'accepted' ? '✓ Accepted' : review === 'rejected' ? '✕ Rejected' : '';
            const linesHtml = f.lines.map((l) => {
                if (l.type === 'hunk') {
                    return `<div class="op-diff-hunk">${escapeHtml(l.text)}</div>`;
                }
                const cls = l.type === 'add' ? 'op-diff-add' : l.type === 'del' ? 'op-diff-del' : 'op-diff-ctx';
                const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' ';
                return `<div class="${cls}"><span class="op-diff-prefix">${prefix}</span>${escapeHtml(l.text)}</div>`;
            }).join('');
            const turnBadge = typeof turnIdx === 'number' ? `<span class="op-diff-turn">turn ${turnIdx + 1}</span>` : '';
            return `<details class="op-diff-file${reviewClass}" data-diff-key="${escapeHtml(key)}" open>` +
                `<summary class="op-diff-summary">` +
                `<span class="op-diff-fname">${escapeHtml(f.filename)}</span>` +
                `${turnBadge}` +
                `<span class="op-diff-stat op-diff-stat-add">+${f.added}</span>` +
                `<span class="op-diff-stat op-diff-stat-del">−${f.removed}</span>` +
                (review ? `<span class="op-diff-review-badge">${reviewLabel}</span>` : '') +
                `</summary>` +
                `<div class="op-diff-lines">${linesHtml}</div>` +
                `<div class="op-diff-actions">` +
                `<button type="button" class="op-btn op-btn-accept" data-diff-accept="${escapeHtml(key)}">✓ Accept</button>` +
                `<button type="button" class="op-btn op-btn-reject" data-diff-reject="${escapeHtml(key)}">✕ Reject</button>` +
                `</div>` +
                `</details>`;
        }).join('');
    }

    /** Wire accept/reject buttons in a container. */
    function wireDiffReviewButtons(container) {
        if (!container) return;
        container.querySelectorAll('[data-diff-accept]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-diff-accept');
                if (!key) return;
                state.diffReviews[key] = 'accepted';
                refreshWorkbenchDiff();
            });
        });
        container.querySelectorAll('[data-diff-reject]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-diff-reject');
                if (!key) return;
                state.diffReviews[key] = 'rejected';
                refreshWorkbenchDiff();
            });
        });
    }

    // ── Artifacts pane ────────────────────────────────────────────────────────

    /** Render the Artifacts pane — all artifact blobs grouped by sequence. */
    function renderArtifactsPane() {
        const pane = els.artifactsPane();
        if (!pane) return;
        const blobKeys = Object.keys(state._artifactBlobs);
        if (blobKeys.length === 0) {
            pane.innerHTML = '<div class="op-empty">No artifacts yet — agent activity will appear here.</div>';
            return;
        }
        const rows = blobKeys.flatMap((blobId) => {
            const arts = state._artifactBlobs[blobId];
            if (!Array.isArray(arts)) return [];
            return arts.map((a, i) => {
                const label = (a && (a.title || a.name || a.label)) || `artifact-${i + 1}`;
                const type = (a && (a.type || a.kind)) || 'file';
                const iconMap = { file: '📄', command: '⚡', 'test-result': '✅', log: '📋', evidence: '🔬', patch: '📝' };
                const icon = iconMap[type] || '📄';
                return { blobId, index: i, label, type, icon };
            });
        });
        const html = rows.map((r) => (
            `<div class="op-artifact-row" data-artifact-blob="${escapeHtml(r.blobId)}" data-artifact-index="${r.index}" role="button" tabindex="0">` +
            `<span class="op-artifact-row-icon" aria-hidden="true">${r.icon}</span>` +
            `<span class="op-artifact-row-label">${escapeHtml(r.label)}</span>` +
            `<span class="op-artifact-row-type">${escapeHtml(r.type)}</span>` +
            `</div>`
        )).join('');
        pane.innerHTML = `<div class="op-artifact-list">${html}</div>`;
        pane.querySelectorAll('.op-artifact-row').forEach((row) => {
            const activate = () => {
                const blobId = row.getAttribute('data-artifact-blob');
                const arts = blobId ? state._artifactBlobs[blobId] : null;
                const idx = parseInt(row.getAttribute('data-artifact-index') || '0', 10);
                if (!Array.isArray(arts)) return;
                openArtifactModal(arts[idx], idx);
            };
            row.addEventListener('click', activate);
            row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') activate(); });
        });
    }

    // ── Evidence pane ─────────────────────────────────────────────────────────

    /** Render the Evidence pane — artifact blobs tagged type=evidence. */
    function renderEvidencePane() {
        const pane = els.evidencePane();
        if (!pane) return;
        const evidenceItems = [];
        Object.entries(state._artifactBlobs).forEach(([blobId, arts]) => {
            if (!Array.isArray(arts)) return;
            arts.forEach((a, i) => {
                const type = (a && (a.type || a.kind)) || '';
                if (type !== 'evidence') return;
                evidenceItems.push({ blobId, index: i, artifact: a });
            });
        });
        if (evidenceItems.length === 0) {
            pane.innerHTML = '<div class="op-empty">No evidence recorded — build/test results will appear here.</div>';
            return;
        }
        const html = evidenceItems.map(({ blobId, index, artifact: a }) => {
            const label = (a.title || a.name || a.label || 'Evidence');
            const status = a.status || 'unknown';
            const statusClass = status === 'pass' ? 'ev-pass' : status === 'fail' ? 'ev-fail' : 'ev-warn';
            const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠';
            const detail = a.detail || a.message || '';
            return `<div class="op-evidence-card ${statusClass}" data-artifact-blob="${escapeHtml(blobId)}" data-artifact-index="${index}">` +
                `<div class="op-evidence-header">` +
                `<span class="op-evidence-icon" aria-hidden="true">${statusIcon}</span>` +
                `<span class="op-evidence-label">${escapeHtml(label)}</span>` +
                `<span class="op-evidence-status">${escapeHtml(status)}</span>` +
                `</div>` +
                (detail ? `<div class="op-evidence-detail">${escapeHtml(String(detail).slice(0, 200))}</div>` : '') +
                `</div>`;
        }).join('');
        pane.innerHTML = `<div class="op-evidence-list">${html}</div>`;
        pane.querySelectorAll('[data-artifact-blob]').forEach((card) => {
            card.addEventListener('click', () => {
                const blobId = card.getAttribute('data-artifact-blob');
                const arts = blobId ? state._artifactBlobs[blobId] : null;
                const idx = parseInt(card.getAttribute('data-artifact-index') || '0', 10);
                if (!Array.isArray(arts)) return;
                openArtifactModal(arts[idx], idx);
            });
        });
    }

    // ── Error center ─────────────────────────────────────────────────────────

    function clearErrorCenter() {
        const ec = els.errorCenter();
        if (ec) { ec.hidden = true; ec.innerHTML = ''; }
        const bar = els.retryBar();
        if (bar) { bar.hidden = true; bar.innerHTML = ''; }
    }

    function showErrorCenter(message, opts) {
        clearErrorCenter();
        const ec = els.errorCenter();
        if (!ec) { showRetryBar(message); return; }
        const code = (opts && opts.code) || '';
        const stack = (opts && opts.stack) || '';
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        state.lastError = { message, code, stack, ts };
        const stackHtml = stack
            ? `<details class="op-ec-stack"><summary>Stack trace</summary><pre class="op-ec-stack-pre">${escapeHtml(stack.slice(0, 1000))}</pre></details>`
            : '';
        ec.hidden = false;
        ec.innerHTML =
            `<div class="op-ec-header">` +
            `<span class="op-ec-icon" aria-hidden="true">✕</span>` +
            `<span class="op-ec-title">${escapeHtml(message)}</span>` +
            `<span class="op-ec-ts">${escapeHtml(ts)}</span>` +
            `</div>` +
            (code ? `<div class="op-ec-code">Code: ${escapeHtml(String(code))}</div>` : '') +
            stackHtml +
            `<div class="op-ec-actions">` +
            `<button type="button" class="op-btn op-btn-primary op-ec-retry">↺ Retry</button>` +
            `<button type="button" class="op-btn op-btn-ghost op-ec-dismiss">Dismiss</button>` +
            `</div>`;
        ec.querySelector('.op-ec-retry')?.addEventListener('click', () => {
            const ctx = state.lastSubmitCtx;
            if (!ctx?.sid || !ctx.body) return;
            clearErrorCenter();
            void sendSecondBeat(ctx.body, { label: 'retry' });
        });
        ec.querySelector('.op-ec-dismiss')?.addEventListener('click', clearErrorCenter);
        addTraceEvent('error', message.slice(0, 80));
    }

    // ── Session memory ────────────────────────────────────────────────────────

    function getOrInitMemory(sid) {
        if (!sid) return null;
        if (!state.sessionMemory[sid]) {
            state.sessionMemory[sid] = { goal: '', touchedFiles: [], decisions: [] };
        }
        return state.sessionMemory[sid];
    }

    function updateSessionMemory(sid, msgs, execute) {
        if (!sid) return;
        const mem = getOrInitMemory(sid);
        // Set goal from first user message if not yet set
        if (!mem.goal && Array.isArray(msgs)) {
            const first = msgs.find((m) => m.role === 'user');
            if (first) mem.goal = String(first.content || '').slice(0, 200);
        }
        // Extract touched files from artifact blobs
        Object.values(state._artifactBlobs).forEach((arts) => {
            if (!Array.isArray(arts)) return;
            arts.forEach((a) => {
                const fname = a && (a.filename || a.name || a.path || a.file);
                if (fname && typeof fname === 'string' && !mem.touchedFiles.includes(fname)) {
                    mem.touchedFiles.push(fname);
                }
            });
        });
        renderSessionMemoryCard(sid);
    }

    function renderSessionMemoryCard(sid) {
        const card = els.memoryCard();
        if (!card) return;
        if (!sid) { card.hidden = true; return; }
        const mem = state.sessionMemory[sid];
        if (!mem || (!mem.goal && mem.touchedFiles.length === 0)) {
            card.hidden = true;
            return;
        }
        card.hidden = false;
        const filesHtml = mem.touchedFiles.length > 0
            ? `<div class="op-mem-section"><div class="op-mem-label">Touched files</div>` +
              mem.touchedFiles.slice(0, 10).map((f) => `<div class="op-mem-file">${escapeHtml(f)}</div>`).join('') +
              `</div>`
            : '';
        card.innerHTML =
            `<div class="op-mem-header">` +
            `<span class="op-mem-title">Session memory</span>` +
            `<button type="button" class="op-btn op-btn-ghost op-mem-toggle" aria-label="Toggle memory">▾</button>` +
            `</div>` +
            `<div class="op-mem-body">` +
            (mem.goal ? `<div class="op-mem-section"><div class="op-mem-label">Goal</div><div class="op-mem-goal">${escapeHtml(mem.goal)}</div></div>` : '') +
            filesHtml +
            `</div>`;
        const toggle = card.querySelector('.op-mem-toggle');
        const body = card.querySelector('.op-mem-body');
        if (toggle && body) {
            toggle.addEventListener('click', () => {
                const collapsed = body.classList.toggle('is-collapsed');
                toggle.textContent = collapsed ? '▸' : '▾';
            });
        }
    }

    // ── Session tagging ───────────────────────────────────────────────────────

    const ALL_TAGS = ['bugfix', 'refactor', 'research', 'audit', 'hotfix', 'experiment'];

    function loadSessionTags() {
        try {
            const raw = localStorage.getItem('a2a_session_tags');
            if (raw) Object.assign(state.sessionTags, JSON.parse(raw));
        } catch (e) {
            console.warn('[operator-ui] session tags load failed', e);
        }
    }

    function saveSessionTags() {
        try {
            localStorage.setItem('a2a_session_tags', JSON.stringify(state.sessionTags));
        } catch (e) {
            console.warn('[operator-ui] session tags save failed', e);
        }
    }

    function toggleSessionTag(sid, tag) {
        if (!sid || !tag) return;
        if (!state.sessionTags[sid]) state.sessionTags[sid] = [];
        const tags = state.sessionTags[sid];
        const idx = tags.indexOf(tag);
        if (idx >= 0) tags.splice(idx, 1);
        else tags.push(tag);
        saveSessionTags();
        renderSessionList();
        renderTagFilter();
    }

    function renderTagFilter() {
        const host = els.tagFilter();
        if (!host) return;
        const active = state.activeTagFilter;
        const html = ALL_TAGS.map((t) => {
            const isOn = t === active;
            return `<button type="button" class="op-tag-chip${isOn ? ' is-on' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
        }).join('');
        host.innerHTML = html + (active ? `<button type="button" class="op-tag-chip op-tag-clear" data-tag-clear>✕ clear</button>` : '');
        host.querySelectorAll('[data-tag]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                state.activeTagFilter = state.activeTagFilter === tag ? null : tag;
                renderTagFilter();
                renderSessionList();
            });
        });
        host.querySelector('[data-tag-clear]')?.addEventListener('click', () => {
            state.activeTagFilter = null;
            renderTagFilter();
            renderSessionList();
        });
    }

    // ── Turn summary card ─────────────────────────────────────────────────────

    /**
     * Build a turn summary from message content and artifact context.
     * @param {object} msg - message object from store
     * @param {number} turnIdx
     * @returns {string} HTML
     */
    function buildTurnSummaryHtml(msg, turnIdx) {
        if (!msg || msg.role !== 'assistant') return '';
        // Use explicit summary field if present
        const summaryText = msg.summary || '';
        // Count artifacts for this turn
        const artCount = Array.isArray(msg.artifacts) ? msg.artifacts.length : 0;
        if (!summaryText && artCount === 0) return '';
        const parts = [];
        if (summaryText) parts.push(escapeHtml(String(summaryText).slice(0, 300)));
        if (artCount > 0) parts.push(`${artCount} artifact${artCount > 1 ? 's' : ''} produced`);
        return `<div class="op-turn-summary" aria-label="Turn summary">` +
            `<span class="op-turn-summary-icon" aria-hidden="true">◈</span>` +
            `<span class="op-turn-summary-text">${parts.join(' · ')}</span>` +
            `</div>`;
    }

    // ── Replay mode ───────────────────────────────────────────────────────────

    function startReplay(sid) {
        const events = state.traceEvents[sid || state.activeSessionId] || [];
        if (events.length === 0) return;
        state.replayActive = true;
        state.replayStep = 0;
        const overlay = els.replayOverlay();
        const seek = els.replaySeek();
        const pos = els.replayPos();
        if (overlay) overlay.hidden = false;
        if (seek) { seek.max = String(events.length - 1); seek.value = '0'; }
        updateReplayPos();
        renderTracePane();
    }

    function stopReplay() {
        if (state.replayTimer) { clearInterval(state.replayTimer); state.replayTimer = null; }
        state.replayActive = false;
        const overlay = els.replayOverlay();
        if (overlay) overlay.hidden = true;
        renderTracePane();
    }

    function updateReplayPos() {
        const sid = state.activeSessionId;
        const events = sid ? (state.traceEvents[sid] || []) : [];
        const pos = els.replayPos();
        if (pos) pos.textContent = `${state.replayStep + 1} / ${events.length}`;
        const seek = els.replaySeek();
        if (seek) seek.value = String(state.replayStep);
    }

    function replaySeekTo(step) {
        const sid = state.activeSessionId;
        const events = sid ? (state.traceEvents[sid] || []) : [];
        state.replayStep = Math.max(0, Math.min(step, events.length - 1));
        updateReplayPos();
        renderTracePane();
    }

    function initReplay() {
        const overlay = els.replayOverlay();
        if (!overlay) return;
        document.getElementById('op-replay-prev')?.addEventListener('click', () => {
            replaySeekTo(state.replayStep - 1);
        });
        document.getElementById('op-replay-next')?.addEventListener('click', () => {
            replaySeekTo(state.replayStep + 1);
        });
        document.getElementById('op-replay-play')?.addEventListener('click', () => {
            const btn = document.getElementById('op-replay-play');
            if (state.replayTimer) {
                clearInterval(state.replayTimer);
                state.replayTimer = null;
                if (btn) btn.textContent = '▶';
            } else {
                if (btn) btn.textContent = '⏸';
                state.replayTimer = setInterval(() => {
                    const sid = state.activeSessionId;
                    const events = sid ? (state.traceEvents[sid] || []) : [];
                    if (state.replayStep >= events.length - 1) {
                        clearInterval(state.replayTimer);
                        state.replayTimer = null;
                        if (btn) btn.textContent = '▶';
                    } else {
                        replaySeekTo(state.replayStep + 1);
                    }
                }, 600);
            }
        });
        document.getElementById('op-replay-close')?.addEventListener('click', stopReplay);
        els.replaySeek()?.addEventListener('input', (e) => {
            replaySeekTo(parseInt(e.target.value, 10));
        });
    }

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    function jumpToLastError() {
        const pane = els.tracePane();
        if (!pane) return;
        // Switch to trace tab
        const traceTab = Array.from(document.querySelectorAll('.op-tab')).find((t) => t.getAttribute('data-tab') === 'trace');
        traceTab?.click();
        // Scroll to last error row
        setTimeout(() => {
            const errorRows = pane.querySelectorAll('.op-trace-row.is-error');
            if (errorRows.length > 0) {
                errorRows[errorRows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    function copyTraceId() {
        const sid = state.activeSessionId;
        if (!sid) return;
        navigator.clipboard?.writeText(sid).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = sid;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            switch (e.key.toUpperCase()) {
                case 'N':
                    e.preventDefault();
                    startNewSession().catch(console.error);
                    break;
                case 'P':
                    e.preventDefault();
                    if (state.uiState === UI_STATES.POLLING || state.uiState === UI_STATES.SENDING) {
                        setState(UI_STATES.IDLE);
                        setThinkingVisible(false);
                        setInputBlocked(false, 'Ready');
                    }
                    break;
                case 'R':
                    e.preventDefault();
                    {
                        const ctx = state.lastSubmitCtx;
                        if (ctx?.sid && ctx.body) {
                            clearErrorCenter();
                            void sendSecondBeat(ctx.body, { label: 'retry' });
                        }
                    }
                    break;
                case 'E':
                    e.preventDefault();
                    jumpToLastError();
                    break;
                case 'C':
                    e.preventDefault();
                    copyTraceId();
                    break;
            }
        });
    }

    function setState(newState) {
        if (!UI_STATES[newState] && !Object.values(UI_STATES).includes(newState)) {
            console.warn('[operator-ui] unknown UI state', newState);
        }
        state.uiState = newState;
        const root = els.root();
        if (root) root.dataset.uiState = newState;

        const spin = els.headerSpinner();
        if (spin) {
            const busy =
                newState === UI_STATES.CREATING ||
                newState === UI_STATES.SENDING ||
                newState === UI_STATES.POLLING ||
                newState === UI_STATES.PLANNING ||
                newState === UI_STATES.GENERATING ||
                newState === UI_STATES.TOOL_RUNNING ||
                newState === UI_STATES.RETRYING ||
                newState === UI_STATES.COMPRESSING ||
                newState === UI_STATES.RECOVERING;
            spin.hidden = !busy;
            spin.classList.toggle('is-on', busy);
        }

        const label = els.connLabel();
        if (label) {
            const map = {
                [UI_STATES.IDLE]: 'Ready',
                [UI_STATES.CREATING]: '⚙ Creating…',
                [UI_STATES.SENDING]: '↑ Sending…',
                [UI_STATES.POLLING]: '⟳ Polling…',
                [UI_STATES.WAITING_INPUT]: '⬡ Choose',
                [UI_STATES.WAITING_TEXT]: '✎ Form',
                [UI_STATES.WAITING_APPROVAL]: '⏸ Approval',
                [UI_STATES.ERROR]: '✕ Error',
                [UI_STATES.DONE]: '✓ Done',
                [UI_STATES.PLANNING]: '◈ Planning…',
                [UI_STATES.GENERATING]: '✦ Generating…',
                [UI_STATES.TOOL_RUNNING]: '▶ Tool running…',
                [UI_STATES.RETRYING]: '↺ Retrying…',
                [UI_STATES.COMPRESSING]: '⊙ Compressing…',
                [UI_STATES.RECOVERING]: '⟳ Recovering…',
                [UI_STATES.BLOCKED]: '⊘ Blocked',
            };
            label.textContent = map[newState] || newState;
        }

        const dot = els.connDot();
        if (dot) {
            if (newState === UI_STATES.ERROR) dot.dataset.status = 'Error';
            else if (newState === UI_STATES.IDLE || newState === UI_STATES.DONE) dot.dataset.status = 'Ready';
            else dot.dataset.status = 'Processing…';
        }

        syncInputDisabledForFsm();
    }

    function syncInputDisabledForFsm() {
        const s = state.uiState;
        const blockMain =
            s === UI_STATES.CREATING ||
            s === UI_STATES.SENDING ||
            s === UI_STATES.POLLING ||
            s === UI_STATES.WAITING_APPROVAL ||
            s === UI_STATES.TOOL_RUNNING ||
            s === UI_STATES.RETRYING ||
            s === UI_STATES.COMPRESSING ||
            s === UI_STATES.RECOVERING ||
            s === UI_STATES.BLOCKED ||
            s === UI_STATES.ERROR ||
            !!state.pendingChoices;
        const input = els.input();
        const send = els.sendBtn();
        if (input) input.disabled = blockMain;
        if (send) send.disabled = blockMain;
    }

    function setThinkingVisible(show) {
        const el = els.thinking();
        if (!el) return;
        if (!show) {
            el.hidden = true;
            el.innerHTML = '';
            return;
        }
        el.hidden = false;
        el.innerHTML =
            '<span class="op-thinking-label">Thinking</span>' +
            '<span class="op-thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
    }

    function persistActiveSessionId(sessionId) {
        if (!sessionId) return;
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, String(sessionId));
        } catch (e) {
            console.warn('[operator-ui] sessionStorage persist failed', e);
        }
    }

    function clearPersistedSessionId() {
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
            console.warn('[operator-ui] sessionStorage clear failed', e);
        }
    }

    function loadSessionListFromStorage() {
        try {
            const raw = sessionStorage.getItem(SESSION_LIST_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            console.warn('[operator-ui] session list parse failed', e);
            return [];
        }
    }

    function saveSessionListToStorage(list) {
        try {
            sessionStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list.slice(0, 50)));
        } catch (e) {
            console.warn('[operator-ui] session list save failed', e);
        }
    }

    function upsertSessionEntry(sessionId, title) {
        if (!sessionId) return;
        const ts = Date.now();
        const cur = loadSessionListFromStorage().filter((x) => x && x.id !== sessionId);
        cur.unshift({ id: sessionId, title: title || sessionId.slice(0, 8), ts });
        saveSessionListToStorage(cur);
        state.sessions = cur.map((x) => ({ id: x.id, title: x.title }));
    }

    function isSessionTerminal(session) {
        if (!session || typeof session !== 'object') return true;
        const st = session.status;
        if (st === 'error' || st === 'failed') return true;
        if (st === 'completed' || st === 'done') return true;
        if (session.stage === 'completed') return true;
        return false;
    }

    function syncChoiceInputGuard() {
        const row = document.getElementById('op-input-row');
        if (!row) return;
        row.classList.toggle('is-hidden', !!state.pendingChoices);
    }

    function clearWaitingCountdown() {
        if (state.waitingCountdownTimer) {
            clearInterval(state.waitingCountdownTimer);
            state.waitingCountdownTimer = null;
        }
    }

    function renderWaitingCard(waitPayload, execute) {
        const host = els.waiting();
        if (!host) return;
        clearWaitingCountdown();
        if (!waitPayload) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        const w = typeof waitPayload === 'object' && waitPayload !== null ? waitPayload : { message: String(waitPayload) };
        const reason =
            escapeHtml(w.reason || w.message || w.text || (typeof waitPayload === 'string' ? waitPayload : '') || '—');
        const expiresAt = w.expires_at ?? w.expiresAt ?? null;
        host.hidden = false;
        host.innerHTML =
            '<div class="op-waiting-card">' +
            '<div class="op-waiting-icon" aria-hidden="true">⏸</div>' +
            '<div class="op-waiting-main">' +
            '<div class="op-waiting-title">Waiting for approval</div>' +
            '<div class="op-waiting-reason">' +
            reason +
            '</div>' +
            (expiresAt
                ? '<div class="op-waiting-countdown" id="op-waiting-countdown">--:--</div>'
                : '') +
            '<div class="op-waiting-actions">' +
            '<button type="button" class="op-btn op-btn-primary" id="op-wait-approve">Approve</button>' +
            '<button type="button" class="op-btn op-btn-danger" id="op-wait-reject">Reject</button>' +
            '</div></div></div>';

        const approve = host.querySelector('#op-wait-approve');
        const reject = host.querySelector('#op-wait-reject');
        if (approve) {
            approve.addEventListener('click', () => {
                void sendSecondBeat({ result: { choice: 'approve' } }, { label: 'approve' });
            });
        }
        if (reject) {
            reject.addEventListener('click', () => {
                void sendSecondBeat({ result: { choice: 'reject' } }, { label: 'reject' });
            });
        }

        if (expiresAt) {
            const tick = () => {
                const el = document.getElementById('op-waiting-countdown');
                if (!el) return;
                let expMs = null;
                if (typeof expiresAt === 'number') expMs = expiresAt < 1e12 ? expiresAt * 1000 : expiresAt;
                else {
                    const d = Date.parse(String(expiresAt));
                    if (!Number.isNaN(d)) expMs = d;
                }
                if (expMs == null) {
                    el.textContent = '--:--';
                    return;
                }
                const sec = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
                const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                const ss = String(sec % 60).padStart(2, '0');
                el.textContent = `${mm}:${ss}`;
            };
            tick();
            state.waitingCountdownTimer = setInterval(tick, 1000);
        }

        void execute;
    }

    function clearWaitingDom() {
        clearWaitingCountdown();
        const host = els.waiting();
        if (host) {
            host.hidden = true;
            host.innerHTML = '';
        }
    }

    function deriveChoicesFromExecute(execute) {
        const choices = execute?.form?.choices;
        if (Array.isArray(choices) && choices.length > 0) return choices;
        const metaChoices = execute?.form?.meta?.routerChoices;
        if (Array.isArray(metaChoices) && metaChoices.length > 0) return metaChoices;
        return null;
    }

    function clearDynamicForm() {
        const host = els.formFields();
        if (host) host.innerHTML = '';
        state.activeFormSpec = null;
    }

    function renderChoices(choices) {
        const host = els.choices();
        if (!host) return;
        if (!Array.isArray(choices) || choices.length === 0) {
            host.innerHTML = '';
            state.pendingChoices = null;
            syncChoiceInputGuard();
            return;
        }
        state.pendingChoices = choices;
        host.innerHTML =
            '<div class="op-choices-title">Choose next step</div>' +
            choices
                .map((c) => {
                    const id = escapeHtml(c.id);
                    const label = escapeHtml(c.label || c.id);
                    const desc = c.description ? `<div class="op-choice-desc">${escapeHtml(c.description)}</div>` : '';
                    return `<button class="op-choice" type="button" data-choice="${id}"><div class="op-choice-label">${label}</div>${desc}</button>`;
                })
                .join('');
        host.querySelectorAll('[data-choice]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const choiceId = btn.getAttribute('data-choice');
                if (!choiceId) return;
                host.querySelectorAll('[data-choice]').forEach((b) => {
                    b.disabled = true;
                });
                btn.classList.add('is-selected');
                await sendSecondBeat({ result: { choice: choiceId } }, { label: 'choice', choiceId });
            });
        });
        syncChoiceInputGuard();
    }

    /**
     * Render execute.form: choices, textarea, or input[]; clear when absent.
     * @param {object|null|undefined} execute
     */
    function renderForm(execute) {
        if (execute && execute.wait) {
            clearDynamicForm();
            renderChoices(null);
            renderWaitingCard(execute.wait, execute);
            setState(UI_STATES.WAITING_APPROVAL);
            return;
        }
        clearWaitingDom();
        const form = execute?.form;
        const choices = deriveChoicesFromExecute(execute);
        if (choices) {
            clearDynamicForm();
            renderChoices(choices);
            const send = els.sendBtn();
            const input = els.input();
            if (send) send.disabled = true;
            if (input) input.disabled = true;
            setState(UI_STATES.WAITING_INPUT);
            return;
        }
        renderChoices(null);
        const host = els.formFields();
        if (!host) return;
        host.innerHTML = '';
        if (!form || typeof form !== 'object') {
            setState(UI_STATES.IDLE);
            return;
        }
        if (form.textarea && typeof form.textarea === 'object' && form.textarea.name) {
            const name = String(form.textarea.name);
            const label = String(form.textarea.label || name);
            state.activeFormSpec = { kind: 'textarea', textarea: form.textarea };
            host.innerHTML =
                `<div class="op-field">` +
                `<div class="op-field-label">${escapeHtml(label)}</div>` +
                `<textarea class="op-field-textarea" name="${escapeHtml(name)}" placeholder="${escapeHtml(form.textarea.placeholder || '')}"></textarea>` +
                `</div>` +
                `<button type="button" class="op-btn op-btn-primary op-form-submit" id="op-form-dynamic-submit">Submit</button>`;
            setState(UI_STATES.WAITING_TEXT);
            return;
        }
        const inputs = Array.isArray(form.input) ? form.input : null;
        if (inputs && inputs.length > 0) {
            state.activeFormSpec = { kind: 'input', input: inputs };
            host.innerHTML =
                inputs
                    .map((f) => {
                        if (!f || typeof f !== 'object') return '';
                        const name = String(f.name || '');
                        if (!name) return '';
                        const lbl = String(f.label || name);
                        const type = String(f.type || 'text');
                        const required = !!f.required;
                        const placeholder = String(f.placeholder || '');
                        return (
                            `<div class="op-field">` +
                            `<div class="op-field-label">${escapeHtml(lbl)}${required ? ' *' : ''}</div>` +
                            `<input class="op-field-input" name="${escapeHtml(name)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} />` +
                            `</div>`
                        );
                    })
                    .filter(Boolean)
                    .join('') +
                `<button type="button" class="op-btn op-btn-primary op-form-submit" id="op-form-dynamic-submit">Submit</button>`;
            setState(UI_STATES.WAITING_TEXT);
            return;
        }
        setState(UI_STATES.IDLE);
    }

    function messageBodyLooksLikeDiff(text) {
        const t = String(text || '');
        if (!t) return false;
        return /(^|\n)[+-][^\n]*(\n|$)/.test(t) || /(^|\n)diff --git /.test(t);
    }

    function renderMessageArtifactsHtml(artifacts) {
        if (!Array.isArray(artifacts) || artifacts.length === 0) return '';
        const blobId = 'a_' + String(++state._artifactSeq);
        state._artifactBlobs[blobId] = artifacts;
        const chips = artifacts
            .map((a, i) => {
                const label =
                    escapeHtml((a && (a.title || a.name || a.label || `artifact-${i + 1}`)) || `artifact-${i + 1}`);
                return `<button type="button" class="op-artifact-chip" data-artifact-blob="${escapeHtml(
                    blobId
                )}" data-artifact-index="${i}">${label}</button>`;
            })
            .join('');
        return `<div class="op-artifacts">${chips}</div>`;
    }

    function wireArtifactChips(container) {
        if (!container) return;
        container.querySelectorAll('.op-artifact-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                const blobId = btn.getAttribute('data-artifact-blob');
                const arts = blobId ? state._artifactBlobs[blobId] : null;
                const idx = parseInt(btn.getAttribute('data-artifact-index') || '0', 10) || 0;
                if (!Array.isArray(arts)) return;
                openArtifactModal(arts[idx], idx);
            });
        });
    }

    function openArtifactModal(artifact, index) {
        const modal = els.artifactModal();
        const title = els.artifactModalTitle();
        const body = els.artifactModalBody();
        if (!modal || !title || !body) return;
        let text = '';
        try {
            text = typeof artifact === 'string' ? artifact : JSON.stringify(artifact, null, 2);
        } catch (e) {
            console.error('[operator-ui] artifact stringify', e);
            text = String(artifact);
        }
        title.textContent = `Artifact ${index + 1}`;
        body.textContent = text;
        modal.hidden = false;
    }

    function closeArtifactModal() {
        const modal = els.artifactModal();
        if (modal) modal.hidden = true;
    }

    function initArtifactModal() {
        els.artifactModalClose()?.addEventListener('click', closeArtifactModal);
        els.artifactModal()?.addEventListener('click', (ev) => {
            const t = ev.target;
            if (t && t.getAttribute && t.getAttribute('data-close-modal') === '1') closeArtifactModal();
        });
    }

    function renderMessagesFromStore() {
        const container = els.messages();
        if (!container) return;
        const st = store.getState?.() || {};
        const msgs = st.messages || [];
        if (!Array.isArray(msgs) || msgs.length === 0) {
            // Better empty state with example prompts and backend status
            const dot = els.connDot();
            const backendStatus = dot?.dataset.status || 'unknown';
            const statusIcon = backendStatus === 'Ready' ? '🟢' : backendStatus === 'Error' ? '🔴' : '🟡';
            container.innerHTML =
                `<div class="op-welcome">` +
                `<div class="op-welcome-icon" aria-hidden="true">⬡</div>` +
                `<div class="op-welcome-title">Start a conversation</div>` +
                `<div class="op-welcome-subtitle">Type a message below or choose an example to get started.</div>` +
                `<div class="op-welcome-examples">` +
                `<button type="button" class="op-welcome-example" data-prompt="Analyse the current codebase and suggest improvements.">Analyse codebase</button>` +
                `<button type="button" class="op-welcome-example" data-prompt="Run tests and report the results.">Run tests</button>` +
                `<button type="button" class="op-welcome-example" data-prompt="Fix any failing tests in the project.">Fix failing tests</button>` +
                `<button type="button" class="op-welcome-example" data-prompt="Refactor the main module for clarity.">Refactor module</button>` +
                `</div>` +
                `<div class="op-welcome-status">${statusIcon} Backend: ${escapeHtml(backendStatus)}</div>` +
                `</div>`;
            container.querySelectorAll('[data-prompt]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const prompt = btn.getAttribute('data-prompt') || '';
                    const input = els.input();
                    if (input) { input.value = prompt; input.focus(); }
                });
            });
            const stE = store.getState?.() || {};
            const ex0 = stE.execute;
            if (Array.isArray(ex0?.artifacts) && ex0.artifacts.length > 0) {
                const bar = document.createElement('div');
                bar.className = 'op-exec-artifact-strip';
                bar.innerHTML = renderMessageArtifactsHtml(ex0.artifacts);
                container.appendChild(bar);
                wireArtifactChips(bar);
            }
            return;
        }
        const frag = document.createDocumentFragment();
        for (let mi = 0; mi < msgs.length; mi++) {
            const m = msgs[mi];
            const role = String(m.role || 'assistant');
            const content = String(m.content || '');
            const av = role === 'user' ? 'U' : role === 'assistant' ? 'A' : role === 'error' ? '!' : '•';
            const row = document.createElement('div');
            row.className = `op-msg op-msg-${role}`;
            row.dataset.role = role;

            const inner = document.createElement('div');
            inner.className = 'op-msg-inner';

            const avatar = document.createElement('div');
            avatar.className = 'op-msg-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.textContent = av;

            const col = document.createElement('div');
            col.className = 'op-msg-col';

            const meta = document.createElement('div');
            meta.className = 'op-msg-meta';
            const tsStr = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            meta.textContent = role + (tsStr ? ' · ' + tsStr : '');

            const bodyWrap = document.createElement('div');
            if (messageBodyLooksLikeDiff(content) && role !== 'user') {
                const pre = document.createElement('pre');
                pre.className = 'op-msg-body op-msg-pre';
                pre.textContent = content;
                bodyWrap.appendChild(pre);
            } else {
                const body = document.createElement('div');
                body.className = 'op-msg-body';
                body.textContent = content;
                bodyWrap.appendChild(body);
            }

            col.appendChild(meta);
            col.appendChild(bodyWrap);

            const arts = m.artifacts;
            if (Array.isArray(arts) && arts.length > 0) {
                const wrap = document.createElement('div');
                wrap.innerHTML = renderMessageArtifactsHtml(arts);
                const node = wrap.firstElementChild;
                if (node) col.appendChild(node);
            }

            // Turn summary card
            const summaryHtml = buildTurnSummaryHtml(m, mi);
            if (summaryHtml) {
                const summaryEl = document.createElement('div');
                summaryEl.innerHTML = summaryHtml;
                const node = summaryEl.firstElementChild;
                if (node) col.appendChild(node);
            }

            inner.appendChild(avatar);
            inner.appendChild(col);
            row.appendChild(inner);
            frag.appendChild(row);
        }
        container.innerHTML = '';
        container.appendChild(frag);
        container.querySelectorAll('.op-artifacts').forEach((h) => wireArtifactChips(h));
        const st2 = store.getState?.() || {};
        const ex = st2.execute;
        if (Array.isArray(ex?.artifacts) && ex.artifacts.length > 0) {
            const bar = document.createElement('div');
            bar.className = 'op-exec-artifact-strip';
            bar.innerHTML = renderMessageArtifactsHtml(ex.artifacts);
            container.appendChild(bar);
            wireArtifactChips(bar);
        }
        container.scrollTop = container.scrollHeight;
    }

    function refreshWorkbenchDiff() {
        const pane = document.querySelector('.op-pane[data-pane="diff"]');
        if (!pane) return;
        const st = store.getState?.() || {};
        const ex = st.execute;

        // Collect diff candidates: from artifact blobs and from execute message
        let allFiles = [];
        let groupKey = 'exec';

        // Check artifact blobs for unified diffs
        const blobKeys = Object.keys(state._artifactBlobs);
        blobKeys.forEach((blobId) => {
            const arts = state._artifactBlobs[blobId];
            if (!Array.isArray(arts)) return;
            arts.forEach((a, i) => {
                const content = typeof a === 'string' ? a : (a && (a.content || a.diff || a.patch || ''));
                if (typeof content === 'string' && messageBodyLooksLikeDiff(content)) {
                    const files = parseDiff(content);
                    if (files.length > 0) {
                        allFiles = allFiles.concat(files.map((f) => ({ ...f, _key: `${blobId}:${i}` })));
                    }
                }
            });
        });

        // Also check execute.message / execute.attachments
        if (ex && typeof ex === 'object') {
            const parts = [];
            if (typeof ex.message === 'string' && ex.message.trim()) parts.push(ex.message.trim());
            const a = ex.attachments;
            if (a && typeof a === 'object') {
                try { parts.push(JSON.stringify(a, null, 2)); } catch (_) { parts.push(String(a)); }
            }
            const text = parts.join('\n\n');
            if (messageBodyLooksLikeDiff(text)) {
                const files = parseDiff(text);
                if (files.length > 0) {
                    allFiles = allFiles.concat(files.map((f) => ({ ...f, _key: `${groupKey}:exec` })));
                }
            }
        }

        if (allFiles.length === 0) {
            // Fallback: if execute has plain content but no diff, show it as before
            if (ex && typeof ex === 'object') {
                const parts = [];
                if (typeof ex.message === 'string' && ex.message.trim()) parts.push(ex.message.trim());
                const a = ex.attachments;
                if (a && typeof a === 'object') {
                    try { parts.push(JSON.stringify(a, null, 2)); } catch (_) { parts.push(String(a)); }
                }
                if (parts.length > 0) {
                    const pre = document.createElement('pre');
                    pre.className = 'op-diff-pre';
                    pre.textContent = parts.join('\n\n---\n\n');
                    pane.innerHTML = '';
                    pane.appendChild(pre);
                    return;
                }
            }
            pane.innerHTML = '<div class="op-empty">Waiting for agent changes…</div>';
            return;
        }

        // Group unique file keys into "virtual" turn groups
        const html = renderDiffFiles(allFiles, groupKey, 0);
        pane.innerHTML = `<div class="op-diff-container">${html}</div>`;
        wireDiffReviewButtons(pane);
        renderArtifactsPane();
        renderEvidencePane();
    }

    function renderGrayRoomFromContext() {
        const host = els.grayroom();
        if (!host) return;
        const st = store.getState?.() || {};
        const ctx = st.context;
        if (!ctx) {
            host.innerHTML = '';
            return;
        }
        if (global.TaskFlowRender?.buildGrayRoomHtml) {
            host.innerHTML =
                global.TaskFlowRender.buildGrayRoomHtml(ctx) +
                (global.TaskFlowRender.buildInterruptTraceHtml ? global.TaskFlowRender.buildInterruptTraceHtml(ctx) : '');
            return;
        }
        host.innerHTML = '';
    }

    function clearRetryBar() {
        clearErrorCenter();
    }

    function showRetryBar(message) {
        showErrorCenter(message || 'Request failed', {});
    }

    function renderFormError(message) {
        if (message) {
            store.pushMessage?.(String(message), 'error');
            renderMessagesFromStore();
        }
    }

    function applySessionSnapshot(session) {
        const sid = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
        if (!sid) return;
        if (session?.messages) {
            store.applyServerMessages?.(session.messages);
        }
        if (session?.execute !== undefined) {
            store.setExecute?.(session.execute);
        }
        if (session?.context !== undefined) {
            store.setContext?.(session.context);
        }
        renderMessagesFromStore();
        renderGrayRoomFromContext();
        renderForm(session.execute);
        refreshWorkbenchDiff();
    }

    async function hydrateFromServer() {
        const sid = state.activeSessionId;
        if (!sid) return;
        try {
            setConn('Hydrating…');
            const session = await api.getSession(sid);
            applySessionSnapshot(session);
            const st = store.getState?.() || {};
            const ex = st.execute;
            if (ex?.wait) {
                setInputBlocked(true, 'Awaiting approval');
            } else if (state.pendingChoices) {
                setInputBlocked(true, 'Awaiting choice');
            } else if (global.executeHasActionableForm?.(ex)) {
                setInputBlocked(false, 'Ready');
            } else {
                const blocked = !!store.isInputBlocked?.();
                setInputBlocked(blocked, blocked ? 'Busy' : 'Ready');
            }
            setConn('Ready');
        } catch (e) {
            console.error('[operator-ui] hydrate error', e);
            setConn('Error');
            renderFormError(e?.payload?.message || e?.message || 'Hydrate failed');
            setState(UI_STATES.ERROR);
            setThinkingVisible(false);
        }
    }

    function setConn(status) {
        const dot = els.connDot();
        if (!dot) return;
        dot.dataset.status = status;
    }

    function setInputBlocked(blocked, reason) {
        const input = els.input();
        const fields = els.formFields();
        const send = els.sendBtn();
        if (input) input.disabled = !!blocked;
        if (fields) {
            fields.querySelectorAll('input,textarea,select,button').forEach((el) => {
                el.disabled = !!blocked;
            });
        }
        if (send) send.disabled = !!blocked;
        if (blocked) {
            setConn(reason || 'Busy');
        } else {
            setConn('Ready');
        }
    }

    async function ensureSession() {
        if (state.activeSessionId) return state.activeSessionId;
        setState(UI_STATES.CREATING);
        const session = await api.createSession({});
        const sid = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
        if (!sid) throw new Error('session_id_missing');
        upsertSessionEntry(sid, session?.title || session?.context?.task || 'Chat');
        state.sessions = loadSessionListFromStorage().map((x) => ({ id: x.id, title: x.title }));
        renderSessionList();
        setActiveSession(sid, true);
        setState(UI_STATES.IDLE);
        return sid;
    }

    function renderSessionList() {
        const list = els.sessionList();
        if (!list) return;
        let rows = loadSessionListFromStorage();
        // Apply tag filter
        if (state.activeTagFilter) {
            rows = rows.filter((s) => {
                const tags = state.sessionTags[s.id] || [];
                return tags.includes(state.activeTagFilter);
            });
        }
        if (rows.length === 0) {
            list.innerHTML = `<div class="op-empty-small">${state.activeTagFilter ? `No sessions tagged "${escapeHtml(state.activeTagFilter)}".` : 'No sessions yet — press ＋ New to start.'}</div>`;
            return;
        }
        list.innerHTML = rows
            .map((s) => {
                const id = escapeHtml(s.id);
                const title = escapeHtml(s.title || s.id.slice(0, 8));
                const isActive = s.id === state.activeSessionId;
                const tsStr = s.ts
                    ? new Date(s.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '';
                const sessionTags = state.sessionTags[s.id] || [];
                const tagsHtml = sessionTags.length > 0
                    ? `<div class="op-session-tags">${sessionTags.map((t) => `<span class="op-session-tag">${escapeHtml(t)}</span>`).join('')}</div>`
                    : '';
                const hasTrace = (state.traceEvents[s.id] || []).length > 0;
                const replayBtn = hasTrace
                    ? `<button type="button" class="op-session-replay" data-replay-sid="${id}" title="Replay session trace" aria-label="Replay">↺</button>`
                    : '';
                const addTagBtn = `<button type="button" class="op-session-add-tag" data-tag-sid="${id}" title="Add tag" aria-label="Tag session">🏷</button>`;
                return (
                    `<div class="op-session-row${isActive ? ' is-on' : ''}" data-sid="${id}">` +
                    `<button class="op-session-item${isActive ? ' is-on' : ''}" type="button" data-sid="${id}" title="${id}">` +
                    `<div class="op-session-title">${title}</div>` +
                    (tsStr ? `<div class="op-session-ts">${escapeHtml(tsStr)}</div>` : '') +
                    tagsHtml +
                    `</button>` +
                    `<div class="op-session-row-actions">${addTagBtn}${replayBtn}</div>` +
                    `</div>`
                );
            })
            .join('');
        list.querySelectorAll('[data-sid]').forEach((el) => {
            if (el.tagName === 'BUTTON' && el.classList.contains('op-session-item')) {
                el.addEventListener('click', () => {
                    const sid = el.getAttribute('data-sid');
                    if (!sid) return;
                    void switchSession(sid);
                });
            }
        });
        list.querySelectorAll('[data-replay-sid]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sid = btn.getAttribute('data-replay-sid');
                if (!sid) return;
                // Switch to trace tab and start replay
                const traceTab = Array.from(document.querySelectorAll('.op-tab')).find((t) => t.getAttribute('data-tab') === 'trace');
                traceTab?.click();
                if (sid !== state.activeSessionId) {
                    void switchSession(sid).then(() => startReplay(sid));
                } else {
                    startReplay(sid);
                }
            });
        });
        list.querySelectorAll('[data-tag-sid]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sid = btn.getAttribute('data-tag-sid');
                if (!sid) return;
                showTagPicker(sid, btn);
            });
        });
    }

    function showTagPicker(sid, anchorEl) {
        // Remove any existing picker
        document.querySelectorAll('.op-tag-picker').forEach((p) => p.remove());
        const picker = document.createElement('div');
        picker.className = 'op-tag-picker';
        picker.setAttribute('role', 'menu');
        const currentTags = state.sessionTags[sid] || [];
        picker.innerHTML = ALL_TAGS.map((t) => {
            const on = currentTags.includes(t);
            return `<button type="button" class="op-tag-picker-item${on ? ' is-on' : ''}" data-pick="${escapeHtml(t)}">${on ? '✓ ' : ''}${escapeHtml(t)}</button>`;
        }).join('');
        picker.querySelectorAll('[data-pick]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-pick');
                toggleSessionTag(sid, tag);
                picker.remove();
            });
        });
        // Position near anchor
        const rect = anchorEl.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.top = `${rect.bottom + 4}px`;
        picker.style.left = `${rect.left}px`;
        document.body.appendChild(picker);
        // Close on outside click
        const close = (ev) => {
            if (!picker.contains(ev.target)) {
                picker.remove();
                document.removeEventListener('click', close, true);
            }
        };
        setTimeout(() => document.addEventListener('click', close, true), 0);
    }

    function setActiveSession(sessionId, hydrate = true) {
        state.activeSessionId = sessionId;
        if (sessionId) persistActiveSessionId(sessionId);
        const el = els.activeSession();
        if (el) el.textContent = `Session: ${sessionId ? sessionId.slice(0, 8) : '—'}`;
        renderSessionList();
        renderTracePane();
        renderSessionMemoryCard(sessionId);
        if (hydrate) void hydrateFromServer();
    }

    async function switchSession(sessionId) {
        clearRetryBar();
        clearWaitingDom();
        state.pendingChoices = null;
        setActiveSession(sessionId, true);
    }

    async function startNewSession() {
        clearRetryBar();
        clearWaitingDom();
        state.pendingChoices = null;
        clearDynamicForm();
        setState(UI_STATES.CREATING);
        try {
            store.reset?.(null);
        } catch (e) {
            console.warn('[operator-ui] store reset', e);
        }
        const session = await api.createSession({});
        const sid = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
        if (!sid) {
            setState(UI_STATES.ERROR);
            return;
        }
        upsertSessionEntry(sid, 'New chat');
        state.sessions = loadSessionListFromStorage().map((x) => ({ id: x.id, title: x.title }));
        renderSessionList();
        setActiveSession(sid, true);
        setState(UI_STATES.IDLE);
        addTraceEvent('session-created', `Session ${sid.slice(0, 8)} created`);
        renderTagFilter();
    }

    async function runPollAfterAck(sid) {
        state.lastPollAttempts = 0;
        addTraceEvent('polling-start', 'Polling started');
        try {
            const pollRes = await api.pollUntilDone(sid, 60, 500, {
                onTick: (r) => {
                    if (r?.execute) store.setExecute?.(r.execute);
                    state.lastPollAttempts++;
                    if (state.lastPollAttempts % 4 === 0) {
                        setConn(`Polling… (${state.lastPollAttempts})`);
                    }
                    // Detect tool calls from execute context
                    if (r?.execute?.tool || r?.execute?.action?.tool) {
                        setState(UI_STATES.TOOL_RUNNING);
                        addTraceEvent('tool-call', `Tool: ${r.execute?.tool || r.execute?.action?.tool}`);
                    }
                },
                shouldStop: (r) => {
                    const ex = r?.execute;
                    if (typeof global.executeHasActionableForm === 'function') {
                        return global.executeHasActionableForm(ex) === true;
                    }
                    return false;
                },
            });
            if (pollRes && pollRes.timedOut === true) {
                addTraceEvent('error', 'Polling timed out');
                if (pollRes.snapshot) {
                    applySessionSnapshot(pollRes.snapshot);
                } else {
                    renderFormError('Polling timed out; session state was refreshed if available.');
                }
            } else if (pollRes && (pollRes.status === 'error' || pollRes.status === 'failed')) {
                const em =
                    (typeof pollRes.error === 'string' && pollRes.error) ||
                    (pollRes.error && pollRes.error.message) ||
                    pollRes.message ||
                    'Async step failed';
                addTraceEvent('error', String(em).slice(0, 80));
                store.pushMessage?.(String(em), 'error');
                renderMessagesFromStore();
            } else {
                addTraceEvent('polling-done', `Polling done (${state.lastPollAttempts} ticks)`);
            }
        } catch (pe) {
            console.error('[operator-ui] pollUntilDone', pe);
            addTraceEvent('error', pe?.message || 'Async polling failed');
            renderFormError(pe?.message || 'Async polling failed');
        }
    }

    /**
     * Second beat: `{ result: { ... } }` envelope; first beat uses `{ task }` in sendMessage.
     * @param {object} body
     * @param {{ label?: string }} meta
     */
    async function sendSecondBeat(body, meta) {
        const sid = state.activeSessionId || (await ensureSession());
        if (state.uiState === UI_STATES.SENDING || state.uiState === UI_STATES.POLLING) return;
        state.lastSubmitCtx = { sid, body, meta: meta || {} };
        setState(UI_STATES.SENDING);
        setThinkingVisible(true);
        clearRetryBar();
        const label = (meta && meta.label) || 'form-submit';
        addTraceEvent('form-submit', `Submitting: ${label}`);
        let ack;
        try {
            ack = await api.postNext(sid, body);
        } catch (e) {
            console.error('[operator-ui] postNext failed', e);
            setState(UI_STATES.ERROR);
            const errMsg = e?.payload?.message || e?.message || 'Submit failed';
            showErrorCenter(errMsg, { code: e?.status, stack: e?.stack });
            setThinkingVisible(false);
            await hydrateFromServer();
            return;
        }
        addTraceEvent('ack-received', 'Ack received');
        setState(UI_STATES.POLLING);
        const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
        if (shouldPoll) {
            await runPollAfterAck(sid);
        }
        await hydrateFromServer();
        setThinkingVisible(false);
        setState(UI_STATES.IDLE);
        addTraceEvent('done', 'Turn complete');
    }

    /**
     * @param {string} text trimmed user line (optional when submitting dynamic form only)
     */
    async function sendMessage(text) {
        if (state.uiState === UI_STATES.SENDING || state.uiState === UI_STATES.POLLING) return;

        const run = async () => {
            const sid = await ensureSession();
            if (state.pendingChoices) {
                console.warn('[operator-ui] choices pending');
                return;
            }
            if (typeof store.isInputBlocked === 'function' && store.isInputBlocked()) {
                renderFormError('Busy: wait for the current step to finish (polling /async).');
                return;
            }

            const st = store.getState?.() || {};
            const execute = st.execute;
            const dynHost = els.formFields();

            let submitBody = null;

            if (dynHost && dynHost.querySelector('input[name],textarea[name]')) {
                const data = {};
                dynHost.querySelectorAll('input[name],textarea[name]').forEach((el) => {
                    const name = el.getAttribute('name');
                    if (!name) return;
                    data[name] = el.value;
                });
                if (state.activeFormSpec?.kind === 'input' && typeof global.validateForm === 'function') {
                    const vr = global.validateForm(state.activeFormSpec.input, data);
                    if (vr && vr.valid === false) {
                        renderFormError(vr.firstError || 'Invalid form');
                        return;
                    }
                }
                if (typeof data.task === 'string' && data.task.trim()) {
                    submitBody = { task: data.task.trim() };
                    store.pushMessage?.(data.task.trim(), 'user');
                } else if (typeof data.message === 'string' && data.message.trim()) {
                    submitBody = { result: { message: data.message.trim() } };
                    store.pushMessage?.(data.message.trim(), 'user');
                } else {
                    const keys = Object.keys(data);
                    const payload =
                        keys.length === 1 && keys[0] === 'message'
                            ? { message: String(data.message) }
                            : { message: JSON.stringify(data) };
                    submitBody = { result: payload };
                    store.pushMessage?.(text || JSON.stringify(data), 'user');
                }
            } else {
                if (!text) return;
                submitBody = { task: text };
                store.pushMessage?.(text, 'user');
            }

            renderMessagesFromStore();
            state.lastSubmitCtx = { sid, body: submitBody };
            setState(UI_STATES.SENDING);
            setThinkingVisible(true);
            clearRetryBar();
            addTraceEvent('message-sent', `Sent: ${(text || '').slice(0, 60)}`);

            let ack;
            try {
                ack = await api.postNext(sid, submitBody);
            } catch (e) {
                console.error('[operator-ui] postNext', e);
                setState(UI_STATES.ERROR);
                const errMsg = e?.payload?.message || e?.message || 'Submit failed';
                showErrorCenter(errMsg, { code: e?.status, stack: e?.stack });
                setThinkingVisible(false);
                await hydrateFromServer();
                return;
            }

            addTraceEvent('ack-received', 'Ack received');
            setState(UI_STATES.POLLING);
            const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
            if (shouldPoll) {
                await runPollAfterAck(sid);
            }
            await hydrateFromServer();
            setThinkingVisible(false);
            setState(UI_STATES.IDLE);
            addTraceEvent('done', 'Turn complete');
            // Update session memory after each turn
            const stPost = store.getState?.() || {};
            updateSessionMemory(sid, stPost.messages, stPost.execute);
        };

        state._sendChain = (state._sendChain || Promise.resolve()).then(run).catch((err) => {
            console.error('[operator-ui] sendMessage chain', err);
            setState(UI_STATES.ERROR);
            renderFormError(err?.message || 'Unexpected error');
            showRetryBar(err?.message || 'Unexpected error');
            setThinkingVisible(false);
            setInputBlocked(false, 'Ready');
        });
        await state._sendChain;
    }

    function initTabs() {
        els.tabs().forEach((t) => {
            t.addEventListener('click', () => {
                const tab = t.getAttribute('data-tab');
                els.tabs().forEach((x) => x.classList.toggle('is-on', x === t));
                els.tabs().forEach((x) => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
                els.panes().forEach((p) => p.classList.toggle('is-on', p.getAttribute('data-pane') === tab));
            });
        });
    }

    function initMonitor() {
        const monitor = els.monitor();
        const toggle = els.monitorToggle();
        const body = els.monitorBody();
        if (!monitor || !toggle || !body) return;
        function apply() {
            monitor.classList.toggle('is-collapsed', !state.monitorOpen);
            toggle.textContent = state.monitorOpen ? '▼' : '▲';
            toggle.setAttribute('aria-expanded', state.monitorOpen ? 'true' : 'false');
        }
        toggle.addEventListener('click', () => {
            state.monitorOpen = !state.monitorOpen;
            apply();
        });
        els.clearDoneBtn()?.addEventListener('click', () => {
            state.tasks = state.tasks.filter((t) => t.status === 'running' || t.status === 'pending');
            renderMonitor();
        });
        apply();
        renderMonitor();
    }

    function renderMonitor() {
        const body = els.monitorBody();
        const badge = els.runningBadge();
        if (!body || !badge) return;
        const running = state.tasks.filter((t) => t.status === 'running').length;
        badge.textContent = `running: ${running}`;
        badge.classList.toggle('is-hidden', running === 0);
        if (state.tasks.length === 0) {
            body.innerHTML = `<div class="op-empty-small">No tasks</div>`;
            return;
        }
        body.innerHTML =
            `<div class="op-table op-table-head"><div>Status</div><div>Label</div><div>Session</div><div>Age</div></div>` +
            state.tasks
                .map((t) => {
                    const st = escapeHtml(t.status);
                    const label = escapeHtml(t.label);
                    const sess = escapeHtml((t.sessionId || '').slice(0, 8));
                    const age = escapeHtml(t.age || '');
                    return `<div class="op-table op-table-row"><div><span class="op-badge op-badge-${st}">${st}</span></div><div>${label}</div><div>${sess}</div><div>${age}</div></div>`;
                })
                .join('');
    }

    function wireEvents() {
        store.on?.('messages', renderMessagesFromStore);
        store.on?.('execute', function (ex) {
            renderForm(ex);
            refreshWorkbenchDiff();
        });
        store.on?.('context', renderGrayRoomFromContext);
        store.on?.('promisePending', function (pending) {
            if (!state.pendingChoices && !store.getState?.().execute?.wait) {
                setInputBlocked(!!pending, pending ? 'Processing…' : 'Ready');
            }
        });
        store.on?.('error', function () {
            setState(UI_STATES.ERROR);
        });
    }

    async function initResumeFlow() {
        state.sessions = loadSessionListFromStorage().map((x) => ({ id: x.id, title: x.title }));
        renderSessionList();

        let raw = '';
        try {
            raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
        } catch (e) {
            console.warn('[operator-ui] sessionStorage read failed', e);
        }
        const sid = raw.trim();
        if (sid) {
            try {
                const session = await api.getSession(sid);
                const id = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
                if (!id) {
                    clearPersistedSessionId();
                    await startNewSession();
                    return;
                }
                if (isSessionTerminal(session)) {
                    clearPersistedSessionId();
                    await startNewSession();
                    return;
                }
                upsertSessionEntry(id, session?.context?.task || id.slice(0, 8));
                state.sessions = loadSessionListFromStorage().map((x) => ({ id: x.id, title: x.title }));
                renderSessionList();
                setActiveSession(id, true);
                addTraceEvent('session-switch', `Resumed session ${id.slice(0, 8)}`);
                if (session.asyncPending === true) {
                    setThinkingVisible(true);
                    setState(UI_STATES.POLLING);
                    await runPollAfterAck(id);
                    await hydrateFromServer();
                    setThinkingVisible(false);
                }
                setState(UI_STATES.IDLE);
            } catch (e) {
                console.warn('[operator-ui] resume session failed', e);
                clearPersistedSessionId();
                await startNewSession();
            }
            return;
        }
        await startNewSession();
    }

    function initUI() {
        loadSessionTags();
        initTabs();
        initMonitor();
        initArtifactModal();
        initReplay();
        initKeyboardShortcuts();
        renderSessionList();
        renderTagFilter();
        wireEvents();
        setState(UI_STATES.IDLE);

        els.newSessionBtn()?.addEventListener('click', async () => {
            try {
                await startNewSession();
            } catch (e) {
                console.error('[operator-ui] new session', e);
                renderFormError(e?.message || 'New session failed');
            }
        });

        els.inputForm()?.addEventListener('click', async (ev) => {
            const t = ev.target;
            if (!t || t.id !== 'op-form-dynamic-submit') return;
            ev.preventDefault();
            if (state.uiState === UI_STATES.SENDING || state.uiState === UI_STATES.POLLING) return;
            t.disabled = true;
            try {
                await sendMessage('');
            } catch (err) {
                console.error('[operator-ui] form submit', err);
            } finally {
                t.disabled = false;
            }
        });

        els.inputForm()?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = els.input();
            const text = (input?.value || '').trim();
            if (text) input.value = '';
            try {
                await sendMessage(text);
            } catch (err) {
                console.error('[operator-ui] submit error', err);
                setState(UI_STATES.ERROR);
                showErrorCenter(err?.payload?.message || err?.message || 'Submit error', { stack: err?.stack });
                setThinkingVisible(false);
                setInputBlocked(false, 'Ready');
            }
        });

        els.stopBtn()?.addEventListener('click', () => {
            state.pendingChoices = null;
            renderChoices(null);
            clearWaitingDom();
            setInputBlocked(false, 'Ready');
            setState(UI_STATES.IDLE);
        });

        void initResumeFlow();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }

    global.operatorUi = { initUI, setState, sendMessage, renderForm, renderWaitingCard, pollUntilDone: api.pollUntilDone };
})(typeof window !== 'undefined' ? window : globalThis);
