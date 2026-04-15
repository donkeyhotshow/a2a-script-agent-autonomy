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
    };

    function escapeHtml(s) {
        return global.escapeHtml ? global.escapeHtml(s) : String(s ?? '');
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
                newState === UI_STATES.POLLING;
            spin.hidden = !busy;
            spin.classList.toggle('is-on', busy);
        }

        const label = els.connLabel();
        if (label) {
            const map = {
                [UI_STATES.IDLE]: 'Ready',
                [UI_STATES.CREATING]: 'Creating…',
                [UI_STATES.SENDING]: 'Sending…',
                [UI_STATES.POLLING]: 'Polling…',
                [UI_STATES.WAITING_INPUT]: 'Choose',
                [UI_STATES.WAITING_TEXT]: 'Form',
                [UI_STATES.WAITING_APPROVAL]: 'Approval',
                [UI_STATES.ERROR]: 'Error',
                [UI_STATES.DONE]: 'Done',
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
            container.innerHTML = `<div class="op-empty">No messages</div>`;
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
        for (const m of msgs) {
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
            avatar.textContent = av;

            const col = document.createElement('div');
            col.className = 'op-msg-col';

            const meta = document.createElement('div');
            meta.className = 'op-msg-meta';
            meta.textContent = role;

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
        if (!ex || typeof ex !== 'object') {
            pane.innerHTML = '<div class="op-empty">Waiting for agent changes…</div>';
            return;
        }
        const parts = [];
        if (typeof ex.message === 'string' && ex.message.trim()) parts.push(ex.message.trim());
        const a = ex.attachments;
        if (a && typeof a === 'object') {
            try {
                parts.push(JSON.stringify(a, null, 2));
            } catch (e) {
                parts.push(String(a));
            }
        }
        const text = parts.length ? parts.join('\n\n---\n\n') : '(no projection)';
        const pre = document.createElement('pre');
        pre.className = 'op-diff-pre';
        pre.textContent = text;
        pane.innerHTML = '';
        pane.appendChild(pre);
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
        const bar = els.retryBar();
        if (bar) {
            bar.hidden = true;
            bar.innerHTML = '';
        }
    }

    function showRetryBar(message) {
        const bar = els.retryBar();
        if (!bar) return;
        bar.hidden = false;
        bar.innerHTML = '';
        const span = document.createElement('span');
        span.className = 'op-retry-text';
        span.textContent = String(message || 'Request failed');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'op-btn op-btn-primary';
        btn.textContent = 'Retry';
        btn.addEventListener('click', () => {
            const ctx = state.lastSubmitCtx;
            if (!ctx?.sid || !ctx.body) return;
            clearRetryBar();
            void sendSecondBeat(ctx.body, { label: 'retry' });
        });
        bar.appendChild(span);
        bar.appendChild(btn);
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
        const rows = loadSessionListFromStorage();
        if (rows.length === 0) {
            list.innerHTML = `<div class="op-empty-small">No sessions yet</div>`;
            return;
        }
        list.innerHTML = rows
            .map((s) => {
                const id = escapeHtml(s.id);
                const title = escapeHtml(s.title || s.id.slice(0, 8));
                const isActive = s.id === state.activeSessionId;
                return `<button class="op-session-item ${isActive ? 'is-on' : ''}" type="button" data-sid="${id}" title="${id}">${title}</button>`;
            })
            .join('');
        list.querySelectorAll('[data-sid]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const sid = btn.getAttribute('data-sid');
                if (!sid) return;
                void switchSession(sid);
            });
        });
    }

    function setActiveSession(sessionId, hydrate = true) {
        state.activeSessionId = sessionId;
        if (sessionId) persistActiveSessionId(sessionId);
        const el = els.activeSession();
        if (el) el.textContent = `Session: ${sessionId ? sessionId.slice(0, 8) : '—'}`;
        renderSessionList();
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
    }

    async function runPollAfterAck(sid) {
        state.lastPollAttempts = 0;
        try {
            const pollRes = await api.pollUntilDone(sid, 60, 500, {
                onTick: (r) => {
                    if (r?.execute) store.setExecute?.(r.execute);
                    state.lastPollAttempts++;
                    if (state.lastPollAttempts % 4 === 0) {
                        setConn(`Polling… (${state.lastPollAttempts})`);
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
                store.pushMessage?.(String(em), 'error');
                renderMessagesFromStore();
            }
        } catch (pe) {
            console.error('[operator-ui] pollUntilDone', pe);
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
        let ack;
        try {
            ack = await api.postNext(sid, body);
        } catch (e) {
            console.error('[operator-ui] postNext failed', e);
            setState(UI_STATES.ERROR);
            renderFormError(e?.payload?.message || e?.message || 'Submit failed');
            showRetryBar(e?.payload?.message || e?.message || 'Submit failed');
            setThinkingVisible(false);
            await hydrateFromServer();
            return;
        }
        setState(UI_STATES.POLLING);
        const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
        if (shouldPoll) {
            await runPollAfterAck(sid);
        }
        await hydrateFromServer();
        setThinkingVisible(false);
        setState(UI_STATES.IDLE);
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

            let ack;
            try {
                ack = await api.postNext(sid, submitBody);
            } catch (e) {
                console.error('[operator-ui] postNext', e);
                setState(UI_STATES.ERROR);
                renderFormError(e?.payload?.message || e?.message || 'Submit failed');
                showRetryBar(e?.payload?.message || e?.message || 'Submit failed');
                setThinkingVisible(false);
                await hydrateFromServer();
                return;
            }

            setState(UI_STATES.POLLING);
            const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
            if (shouldPoll) {
                await runPollAfterAck(sid);
            }
            await hydrateFromServer();
            setThinkingVisible(false);
            setState(UI_STATES.IDLE);
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
        initTabs();
        initMonitor();
        initArtifactModal();
        renderSessionList();
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
                renderFormError(err?.payload?.message || err?.message || 'Submit error');
                showRetryBar(err?.message || 'Submit error');
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
