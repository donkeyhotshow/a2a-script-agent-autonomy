/**
 * Operator UI controller for a2a-client/packages/web
 *
 * - 3-column layout wiring (sessions/chat/workbench + bottom monitor)
 * - Session create + active session UI
 * - Router "two beats" guard: disable free-text input while choices pending
 *
 * Transport contract:
 * - POST /api/a2a/sessions/:id/next returns ack (no promiseId)
 * - Poll GET /api/a2a/sessions/:id/async until asyncPending=false / completed=true
 */
(function (global) {
    'use strict';

    const store = global.SessionStore;
    const api = global.apiIntegration;
    if (!store) throw new Error('[operator-ui] SessionStore missing (load js/session-store.js)');
    if (!api) throw new Error('[operator-ui] apiIntegration missing (load js/api-integration.js)');

    const els = {
        newSessionBtn: () => document.getElementById('op-new-session'),
        sessionList: () => document.getElementById('op-session-list'),
        activeSession: () => document.getElementById('op-active-session'),
        connDot: () => document.getElementById('op-conn-dot'),
        connLabel: () => document.getElementById('op-conn-label'),
        messages: () => document.getElementById('op-messages'),
        choices: () => document.getElementById('op-choices'),
        grayroom: () => document.getElementById('op-grayroom'),
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
    };

    /** Canonical key for resume-after-refresh (see acceptance checklist). */
    const SESSION_STORAGE_KEY = 'a2a_session_id';

    const state = {
        sessions: [],
        activeSessionId: null,
        monitorOpen: true,
        tasks: [],
        // choices pending (array) comes from execute.form.choices
        pendingChoices: null,
        lastExecuteSignature: null,
        lastPollAttempts: 0,
        activeFormSpec: null,
    };

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

    function syncChoiceInputGuard() {
        const row = document.getElementById('op-input-row');
        if (!row) return;
        row.classList.toggle('is-hidden', !!state.pendingChoices);
    }

    function updateThinkingUI(blocked, reason) {
        const el = document.getElementById('op-thinking');
        if (!el) return;
        const r = String(reason || '');
        const show = !!blocked && /processing|hydrating|busy/i.test(r);
        if (!show) {
            el.hidden = true;
            el.innerHTML = '';
            return;
        }
        el.hidden = false;
        el.innerHTML =
            '<span class="op-thinking-label">Working…</span>' +
            '<span class="op-thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
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
        pane.innerHTML = '<pre class="op-diff-pre">' + escapeHtml(text) + '</pre>';
    }

    async function resumeFromStorage() {
        let raw = '';
        try {
            raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
        } catch (e) {
            console.warn('[operator-ui] sessionStorage read failed', e);
            return;
        }
        const sid = raw.trim();
        if (!sid) return;
        try {
            const session = await api.getSession(sid);
            const id =
                global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
            if (!id) {
                clearPersistedSessionId();
                return;
            }
            const exists = state.sessions.some((s) => s.id === id);
            if (!exists) state.sessions = [{ id }, ...state.sessions];
            renderSessionList();
            setActiveSession(id);
        } catch (e) {
            console.warn('[operator-ui] resume session failed', e);
            clearPersistedSessionId();
        }
    }

    function escapeHtml(s) {
        return global.escapeHtml ? global.escapeHtml(s) : String(s ?? '');
    }

    function setConn(status) {
        const dot = els.connDot();
        const label = els.connLabel();
        if (!dot || !label) return;
        dot.dataset.status = status;
        label.textContent = status;
    }

    function renderSessionList() {
        const list = els.sessionList();
        if (!list) return;
        if (state.sessions.length === 0) {
            list.innerHTML = `<div class="op-empty-small">No sessions yet</div>`;
            return;
        }
        list.innerHTML = state.sessions
            .map((s) => {
                const id = escapeHtml(s.id);
                const label = escapeHtml((s.id || '').slice(0, 8) || '—');
                const isActive = s.id === state.activeSessionId;
                return `<button class="op-session-item ${isActive ? 'is-on' : ''}" type="button" data-sid="${id}">${label}</button>`;
            })
            .join('');
        list.querySelectorAll('[data-sid]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const sid = btn.getAttribute('data-sid');
                if (!sid) return;
                setActiveSession(sid);
            });
        });
    }

    function setActiveSession(sessionId) {
        state.activeSessionId = sessionId;
        if (sessionId) persistActiveSessionId(sessionId);
        const el = els.activeSession();
        if (el) el.textContent = `Session: ${sessionId ? sessionId.slice(0, 8) : '—'}`;
        renderSessionList();
        // Hydrate snapshot for messages/execute/context
        void hydrateFromServer();
    }

    function renderMessagesFromStore() {
        const container = els.messages();
        if (!container) return;
        const st = store.getState?.() || {};
        const msgs = st.messages || [];
        if (!Array.isArray(msgs) || msgs.length === 0) {
            container.innerHTML = `<div class="op-empty">No messages</div>`;
            return;
        }
        container.innerHTML = msgs
            .map((m) => {
                const role = escapeHtml(m.role || 'assistant');
                const content = escapeHtml(m.content || '');
                return `<div class="op-msg" data-role="${role}"><div class="op-msg-role">${role}</div><div class="op-msg-body">${content}</div></div>`;
            })
            .join('');
        container.scrollTop = container.scrollHeight;
    }

    function buildExecuteBadgesHtml(execute) {
        const a = execute?.attachments;
        if (!a || typeof a !== 'object') return '';
        const badges = [];
        if (Array.isArray(a.readFiles) && a.readFiles.length > 0) badges.push(['readFiles', String(a.readFiles.length)]);
        if (Array.isArray(a.writtenFiles) && a.writtenFiles.length > 0) badges.push(['writtenFiles', String(a.writtenFiles.length)]);
        if (typeof a.ragQuery === 'string' && a.ragQuery) badges.push(['rag', '1']);
        if (typeof a.shellCommand === 'string' && a.shellCommand) badges.push(['shell', '1']);
        if (typeof a.grepPattern === 'string' && a.grepPattern) badges.push(['grep', '1']);
        if (typeof a.listDirectoryPath === 'string' && a.listDirectoryPath) badges.push(['ls', '1']);
        if (typeof a.pendingClientAction === 'string' && a.pendingClientAction) badges.push(['pending', '1']);
        if (badges.length === 0) return '';
        return (
            '<div class="op-exec-badges">' +
            badges
                .map(([k, v]) => `<span class="op-badge op-badge-accent">${escapeHtml(k)}: ${escapeHtml(v)}</span>`)
                .join('') +
            '</div>'
        );
    }

    function maybeEmitExecuteActivity(execute) {
        if (!execute || typeof execute !== 'object') return;
        const msg = typeof execute.message === 'string' ? execute.message.trim() : '';
        const attachments = execute.attachments && typeof execute.attachments === 'object' ? execute.attachments : null;
        if (!msg && !attachments) return;

        const signature = JSON.stringify({
            message: msg || null,
            attachments: attachments || null,
            formChoices: Array.isArray(execute?.form?.choices) ? execute.form.choices.map((c) => c?.id) : null,
        });
        if (signature === state.lastExecuteSignature) return;
        state.lastExecuteSignature = signature;

        const badgesHtml = buildExecuteBadgesHtml(execute);
        const body =
            (msg ? msg : 'Agent activity') +
            (badgesHtml ? '\n' : '') +
            (badgesHtml ? badgesHtml.replace(/<[^>]+>/g, '') : '');

        // Keep it simple: emit a system message in the timeline.
        store.pushMessage?.(body, 'system');
        renderMessagesFromStore();
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
        // Reuse existing TaskFlowRender builder when available.
        if (global.TaskFlowRender?.buildGrayRoomHtml) {
            host.innerHTML =
                global.TaskFlowRender.buildGrayRoomHtml(ctx) +
                (global.TaskFlowRender.buildInterruptTraceHtml ? global.TaskFlowRender.buildInterruptTraceHtml(ctx) : '');
            return;
        }
        host.innerHTML = '';
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
        updateThinkingUI(blocked, reason || '');
    }

    function renderFormError(message) {
        // Minimal predictable error surface; avoid complex per-field wiring.
        if (message) {
            store.pushMessage?.(String(message), 'error');
            renderMessagesFromStore();
        }
    }

    function clearDynamicForm() {
        const host = els.formFields();
        if (host) host.innerHTML = '';
        state.activeFormSpec = null;
    }

    function renderExecuteForm(execute) {
        const host = els.formFields();
        if (!host) return;
        host.innerHTML = '';
        const form = execute?.form;
        if (!form || typeof form !== 'object') return;

        // choices are rendered separately by renderChoices().
        if (Array.isArray(form.choices) && form.choices.length > 0) return;

        // textarea support
        if (form.textarea && typeof form.textarea === 'object' && form.textarea.name) {
            const name = String(form.textarea.name);
            const label = String(form.textarea.label || name);
            state.activeFormSpec = { kind: 'textarea', textarea: form.textarea };
            host.innerHTML =
                `<div class="op-field">` +
                `<div class="op-field-label">${escapeHtml(label)}</div>` +
                `<textarea class="op-field-textarea" name="${escapeHtml(name)}" placeholder="${escapeHtml(form.textarea.placeholder || '')}"></textarea>` +
                `</div>`;
            return;
        }

        // input array support
        const inputs = Array.isArray(form.input) ? form.input : null;
        if (inputs && inputs.length > 0) {
            state.activeFormSpec = { kind: 'input', input: inputs };
            host.innerHTML = inputs
                .map((f) => {
                    if (!f || typeof f !== 'object') return '';
                    const name = String(f.name || '');
                    if (!name) return '';
                    const label = String(f.label || name);
                    const type = String(f.type || 'text');
                    const required = !!f.required;
                    const placeholder = String(f.placeholder || '');
                    return (
                        `<div class="op-field">` +
                        `<div class="op-field-label">${escapeHtml(label)}${required ? ' *' : ''}</div>` +
                        `<input class="op-field-input" name="${escapeHtml(name)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} />` +
                        `</div>`
                    );
                })
                .filter(Boolean)
                .join('');
            return;
        }
    }

    function renderChoices(choices) {
        const host = els.choices();
        if (!host) return;
        if (!Array.isArray(choices) || choices.length === 0) {
            host.innerHTML = '';
            state.pendingChoices = null;
            syncChoiceInputGuard();
            // When choices are cleared, re-enable dynamic form and input unless async blocks.
            return;
        }
        state.pendingChoices = choices;
        host.innerHTML = `<div class="op-choices-title">Choose next step</div>` +
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
                await submitChoice(choiceId);
            });
        });
        // Two-beats guard: while choices pending, disable free-text input.
        setInputBlocked(true, 'Awaiting choice');
        syncChoiceInputGuard();
    }

    function deriveChoicesFromExecute(execute) {
        const choices = execute?.form?.choices;
        if (Array.isArray(choices) && choices.length > 0) return choices;
        const metaChoices = execute?.form?.meta?.routerChoices;
        if (Array.isArray(metaChoices) && metaChoices.length > 0) return metaChoices;
        return null;
    }

    async function hydrateFromServer() {
        const sid = state.activeSessionId;
        if (!sid) return;
        try {
            setConn('Hydrating…');
            const session = await api.getSession(sid);
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
            const st = store.getState?.() || {};
            const execute = st.execute;
            const choices = deriveChoicesFromExecute(execute);
            if (choices) {
                renderChoices(choices);
            } else {
                renderChoices(null);
                renderExecuteForm(execute);
                setInputBlocked(!!store.isInputBlocked?.(), 'Busy');
            }
            setConn('Ready');
            refreshWorkbenchDiff();
        } catch (e) {
            console.error('[operator-ui] hydrate error', e);
            setConn('Error');
            renderFormError(e?.payload?.message || e?.message || 'Hydrate failed');
            updateThinkingUI(false, '');
        }
    }

    async function ensureSession() {
        if (state.activeSessionId) return state.activeSessionId;
        const session = await api.createSession({});
        const sid = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
        if (!sid) throw new Error('session_id_missing');
        state.sessions = [{ id: sid }, ...state.sessions];
        renderSessionList();
        setActiveSession(sid);
        return sid;
    }

    async function submitMessage(text) {
        const sid = await ensureSession();
        if (state.pendingChoices) {
            console.warn('[operator-ui] Choices pending; refusing free-text submit.');
            return;
        }
        // If store considers input blocked (async work), refuse to prevent 409 async_pending.
        if (typeof store.isInputBlocked === 'function' && store.isInputBlocked()) {
            renderFormError('Busy: wait for the current step to finish (polling /async).');
            return;
        }
        // Prefer server-provided form if present: submit form fields; else fall back to message.
        const st = store.getState?.() || {};
        const execute = st.execute;
        const pendingForm = execute?.form;

        let submitBody = null;
        const dynHost = els.formFields();
        if (dynHost && dynHost.querySelector('input[name],textarea[name]')) {
            const data = {};
            dynHost.querySelectorAll('input[name],textarea[name]').forEach((el) => {
                const name = el.getAttribute('name');
                if (!name) return;
                data[name] = el.value;
            });
            // Validate form if we have a spec.
            if (state.activeFormSpec?.kind === 'input' && typeof global.validateForm === 'function') {
                const vr = global.validateForm(state.activeFormSpec.input, data);
                if (vr && vr.valid === false) {
                    renderFormError(vr.firstError || 'Invalid form');
                    return;
                }
            }
            // Router first beat: common field name is `task` (API expects it at top-level, not inside result).
            if (typeof data.task === 'string' && data.task.trim()) {
                submitBody = { task: data.task.trim() };
                store.pushMessage?.(data.task.trim(), 'user');
            } else if (typeof data.message === 'string' && data.message.trim()) {
                submitBody = { result: { message: data.message.trim() } };
                store.pushMessage?.(data.message.trim(), 'user');
            } else {
                submitBody = { result: data };
                store.pushMessage?.(text, 'user');
            }
        } else {
            submitBody = { result: { message: text } };
            store.pushMessage?.(text, 'user');
        }

        renderMessagesFromStore();
        setInputBlocked(true, 'Processing…');

        let ack;
        try {
            ack = await api.postNext(sid, submitBody);
        } catch (e) {
            // Expected when user races async_pending; show message and rehydrate.
            renderFormError(e?.payload?.message || e?.message || 'Submit failed');
            await hydrateFromServer();
            return;
        }
        state.lastPollAttempts = 0;
        const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
        if (shouldPoll) {
            try {
                await api.pollUntilDone(sid, {
                    onTick: (r) => {
                        if (r?.execute) store.setExecute?.(r.execute);
                        state.lastPollAttempts++;
                        if (state.lastPollAttempts % 5 === 0) {
                            setConn(`Processing… (${state.lastPollAttempts})`);
                        }
                    },
                    shouldStop: (r) => {
                        // Stop early if server surfaces an actionable form (choices/input/textarea) for the user.
                        const ex = r?.execute;
                        if (typeof global.executeHasActionableForm === 'function') {
                            return global.executeHasActionableForm(ex) === true;
                        }
                        return false;
                    },
                    intervalMs: 800,
                    maxAttempts: 200,
                });
            } catch (pe) {
                console.error('[operator-ui] pollUntilDone', pe);
                renderFormError(pe?.message || 'Async polling failed');
            }
        }
        await hydrateFromServer();
    }

    async function submitChoice(choiceId) {
        const sid = await ensureSession();
        renderChoices(null);
        clearDynamicForm();
        setInputBlocked(true, 'Processing…');
        let ack;
        try {
            ack = await api.postNext(sid, { result: { choice: choiceId } });
        } catch (e) {
            renderFormError(e?.payload?.message || e?.message || 'Choice submit failed');
            await hydrateFromServer();
            return;
        }
        state.lastPollAttempts = 0;
        const shouldPoll = ack?.asyncPending === true || ack?.promiseId || ack?.accepted === true;
        if (shouldPoll) {
            try {
                await api.pollUntilDone(sid, {
                    onTick: (r) => {
                        if (r?.execute) store.setExecute?.(r.execute);
                        state.lastPollAttempts++;
                        if (state.lastPollAttempts % 5 === 0) {
                            setConn(`Processing… (${state.lastPollAttempts})`);
                        }
                    },
                    shouldStop: (r) => {
                        const ex = r?.execute;
                        if (typeof global.executeHasActionableForm === 'function') {
                            return global.executeHasActionableForm(ex) === true;
                        }
                        return false;
                    },
                    intervalMs: 800,
                    maxAttempts: 200,
                });
            } catch (pe) {
                console.error('[operator-ui] pollUntilDone (choice)', pe);
                renderFormError(pe?.message || 'Async polling failed');
            }
        }
        await hydrateFromServer();
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
        // Minimal table (placeholder until server emits tasks via execute/context)
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
        // Store events
        store.on?.('messages', renderMessagesFromStore);
        store.on?.('execute', function (ex) {
            maybeEmitExecuteActivity(ex);
            const choices = deriveChoicesFromExecute(ex);
            if (choices) renderChoices(choices);
            else renderChoices(null);
        });
        store.on?.('context', renderGrayRoomFromContext);
        store.on?.('promisePending', function (pending) {
            if (!state.pendingChoices) setInputBlocked(!!pending, pending ? 'Processing…' : 'Ready');
        });
        store.on?.('error', function () {
            setConn('Error');
        });
    }

    function boot() {
        initTabs();
        initMonitor();
        renderSessionList();
        wireEvents();

        els.newSessionBtn()?.addEventListener('click', async () => {
            const session = await api.createSession({});
            const sid = global.resolveSessionIdFromPayload?.(session) || session?.id || session?.sessionId;
            if (!sid) return;
            state.sessions = [{ id: sid }, ...state.sessions];
            renderSessionList();
            setActiveSession(sid);
        });

        els.inputForm()?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = els.input();
            const text = (input?.value || '').trim();
            // If there is a dynamic form rendered, allow submit without the single-line input.
            if (text) input.value = '';
            try {
                await submitMessage(text);
            } catch (err) {
                console.error('[operator-ui] submit error', err);
                setConn('Error');
                renderFormError(err?.payload?.message || err?.message || 'Submit error');
                setInputBlocked(false, 'Ready');
            }
        });

        els.stopBtn()?.addEventListener('click', () => {
            // No WS interrupt in this repo; best-effort UX: unblock input locally.
            // Real interrupt requires server-side contract and is out of scope for low-risk today.
            state.pendingChoices = null;
            renderChoices(null);
            setInputBlocked(false, 'Ready');
        });

        setConn('Ready');
        void resumeFromStorage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : globalThis);

