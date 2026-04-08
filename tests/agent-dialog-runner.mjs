import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const PROMPTS_DIR = join(REPO_ROOT, 'prompts-to-agent-mode');
const STATE_DIR = join(REPO_ROOT, 'state');
const STATE_DOC = join(STATE_DIR, 'agent-dialog-state.md');
const HISTORY_DIR = join(STATE_DIR, 'agent-dialog-history');

const DEFAULT_BASE = 'http://localhost:5173';
const SKIP_PROMPTS = new Set(['README.md', 'STACK-RUN.md', 'ONE-PIPELINE.md', 'START-FULL-SPECTRUM.md']);

function parseArgs(argv) {
    const options = {
        baseUrl: DEFAULT_BASE,
        projectId: 'default',
        prompts: [],
        list: false,
        defaultReply: 'продолжай',
        maxPrompts: Infinity,
        pollMs: 1000,
        pollCap: 60,
        markComplete: true,
        maxFormLoops: 6,
        dryRun: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--prompt' || arg === '-p') {
            const value = argv[++i];
            if (!value) throw new Error(`${arg} requires a path`);
            options.prompts.push(value);
            continue;
        }
        if (arg === '--list' || arg === '-l') {
            options.list = true;
            continue;
        }
        if (arg === '--base' || arg === '-b') {
            const value = argv[++i];
            if (!value) throw new Error(`${arg} requires a URL`);
            options.baseUrl = value.replace(/\/$/, '');
            continue;
        }
        if (arg === '--project' || arg === '-j') {
            const value = argv[++i];
            if (!value) throw new Error(`${arg} requires a project ID`);
            options.projectId = value;
            continue;
        }
        if (arg === '--default-reply' || arg === '-r') {
            const value = argv[++i];
            if (!value) throw new Error(`${arg} requires a value`);
            options.defaultReply = value;
            continue;
        }
        if (arg === '--max' || arg === '-m') {
            const value = Number(argv[++i]);
            if (!Number.isFinite(value) || value <= 0) throw new Error(`${arg} requires a positive number`);
            options.maxPrompts = value;
            continue;
        }
        if (arg === '--no-mark') {
            options.markComplete = false;
            continue;
        }
        if (arg === '--poll-ms') {
            const value = Number(argv[++i]);
            if (!Number.isFinite(value) || value <= 0) throw new Error(`${arg} requires a positive number`);
            options.pollMs = value;
            continue;
        }
        if (arg === '--poll-cap') {
            const value = Number(argv[++i]);
            if (!Number.isFinite(value) || value <= 0) throw new Error(`${arg} requires a positive number`);
            options.pollCap = value;
            continue;
        }
        if (arg === '--dry-run') {
            options.dryRun = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            printUsage();
            process.exit(0);
        }
        throw new Error(`Unknown option ${arg}`);
    }

    return options;
}

function printUsage() {
    console.log(`Usage: node tests/agent-dialog-runner.mjs [options]
Options:
  --prompt, -p <path>        Run a specific prompt file (repeatable). 
  --list, -l                 Show pending prompts and exit.
  --base, -b <url>           Client API base (default ${DEFAULT_BASE}).
  --project, -j <id>         projectId to seed on session create (default "default").
  --default-reply, -r <text> Fallback reply for text forms (default "продолжай").
  --max, -m <n>              Limit to first n pending prompts.
  --no-mark                  Do not toggle Completion bullets.
  --poll-ms <ms>             Sleep between /async polls.
  --poll-cap <count>         Max polls per round.
  --dry-run                  Log steps without creating sessions.
  --help, -h                 Show this message.
`);
}

async function findPendingPrompts() {
    const entries = await readdir(PROMPTS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !SKIP_PROMPTS.has(entry.name));
    const pending = [];
    for (const entry of files) {
        const fullPath = join(PROMPTS_DIR, entry.name);
        const text = await readFile(fullPath, 'utf8');
        if (hasUncheckedCompletion(text)) {
            pending.push(fullPath);
        }
    }
    pending.sort((a, b) => a.localeCompare(b));
    return pending;
}

function hasUncheckedCompletion(text) {
    const match = text.match(/## Completion([\s\S]*?)(?=\n## |$)/);
    if (!match) return false;
    return /\- \[ \]/.test(match[1]);
}

function extractAgentPrompt(text) {
    const match = text.match(/## Agent prompt(?: \(copy\))?\s+([\s\S]*?)(?=\n## |$)/);
    if (!match) return null;
    return match[1].trim();
}

async function createSession(baseUrl, promptText, projectId, dryRun) {
    if (dryRun) {
        return { sessionId: 'dry-run', response: {} };
    }

    const prefix = `${baseUrl}/api/a2a`;
    const body = {
        projectId,
        task: promptText,
        mode: 'agent',
    };

    const response = await fetch(`${prefix}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Create session failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const sessionId = payload.session?.id || payload.id;
    if (!sessionId) throw new Error('Create response missing session id');
    return { sessionId, response: payload };
}

async function postNext(baseUrl, sessionId, body) {
    const prefix = `${baseUrl}/api/a2a`;
    const response = await fetch(`${prefix}/sessions/${encodeURIComponent(sessionId)}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`POST /next failed (${response.status}): ${text}`);
    }
    return response.json();
}

async function pollAsync(baseUrl, sessionId, pollMs, pollCap) {
    const prefix = `${baseUrl}/api/a2a`;
    for (let i = 0; i < pollCap; i += 1) {
        const response = await fetch(`${prefix}/sessions/${encodeURIComponent(sessionId)}/async`);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`/async poll failed (${response.status}): ${text}`);
        }
        const payload = await response.json();
        if (!payload) return payload;
        const pending = payload.asyncPending === true || payload.status === 'pending' || payload.status === 'processing';
        if (!pending) {
            return payload;
        }
        await new Promise((res) => setTimeout(res, pollMs));
    }
    throw new Error('Async poll timed out');
}

async function fetchSession(baseUrl, sessionId) {
    const prefix = `${baseUrl}/api/a2a`;
    const response = await fetch(`${prefix}/sessions/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Fetch session failed (${response.status}): ${text}`);
    }
    return response.json();
}

function getExecute(session) {
    return session.session?.execute || session.execute || session.data?.execute || null;
}

function buildResponseBody(form, options) {
    if (!form) return null;
    if (Array.isArray(form.choices) && form.choices.length) {
        return { result: { choice: form.choices[0].id } };
    }
    if (Array.isArray(form.input) && form.input.length) {
        const fallback = form.input[0].default ?? options.defaultReply;
        return { result: { message: fallback } };
    }
    return { task: options.defaultReply };
}

function summarizeForm(form) {
    if (!form) return 'no form';
    const parts = [];
    if (form.title) parts.push(`title="${form.title}"`);
    if (Array.isArray(form.choices)) parts.push(`choices=${form.choices.length}`);
    if (Array.isArray(form.input)) parts.push(`inputs=${form.input.length}`);
    return parts.length ? parts.join(', ') : 'form (no metadata)';
}

function summarizeExecute(execute) {
    if (!execute) return 'no execute';
    const keys = Object.keys(execute).filter((key) => key !== 'message');
    const action = execute?.action || execute?.form?.action || '';
    const parts = [];
    if (keys.length) parts.push(`keys=${keys.join(',')}`);
    if (action) parts.push(`action=${action}`);
    if (execute?.form?.choices) parts.push(`choices=${execute.form.choices.length}`);
    return parts.length ? parts.join(' | ') : 'execute (message-only)';
}

async function markPromptDone(filePath) {
    const text = await readFile(filePath, 'utf8');
    const start = text.indexOf('## Completion');
    if (start === -1) return;
    const end = (() => {
        const rest = text.slice(start + 1);
        const next = rest.indexOf('\n## ');
        return next === -1 ? text.length : start + 1 + next;
    })();
    const block = text.slice(start, end);
    const now = new Date().toISOString();
    const note = `- [x] Completed by agent-dialog-runner at ${now}`;
    let replacedBlock = block;
    if (/\- \[ \]/.test(block)) {
        replacedBlock = block.replace(/\- \[ \]/, '- [x]');
        if (!replacedBlock.includes(note)) {
            replacedBlock = `${replacedBlock.trimEnd()}\n${note}\n`;
        }
    } else if (!block.includes(note)) {
        replacedBlock = `${block.trimEnd()}\n${note}\n`;
    } else {
        return;
    }
    const updated = `${text.slice(0, start)}${replacedBlock}${text.slice(end)}`;
    await writeFile(filePath, updated, 'utf8');
}

async function ensureStateDirs() {
    await mkdir(STATE_DIR, { recursive: true });
    await mkdir(HISTORY_DIR, { recursive: true });
}

async function writeStateDoc(state) {
    const lines = [
        '# Agent dialog runner state',
        '',
        `Last update: ${state.lastUpdated}`,
        '',
        '## Active run',
        `- Prompt: ${state.prompt || 'none'}`,
        `- Session: ${state.sessionId || 'n/a'}`,
        `- Stage: ${state.stage || 'idle'}`,
        `- Status: ${state.status || 'ok'}`,
        '',
        '## Timeline',
        ...state.timeline.map((entry) => `- ${entry.time} — ${entry.event}${entry.detail ? ` (${entry.detail})` : ''}`),
        '',
    ];
    await writeFile(STATE_DOC, lines.join('\n'), 'utf8');
}

async function appendHistory(state) {
    const safeName = state.prompt.replace(/[\\/]/g, '_').replace(/[^a-z0-9._-]/gi, '_');
    const fileName = `${Date.now()}-${safeName}.json`;
    const path = join(HISTORY_DIR, fileName);
    await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}

async function runPromptFile(filePath, options) {
    const relativePath = relative(REPO_ROOT, filePath);
    const raw = await readFile(filePath, 'utf8');
    const promptText = extractAgentPrompt(raw);
    if (!promptText) {
        throw new Error(`Agent prompt block not found in ${relativePath}`);
    }

    const state = {
        prompt: relativePath,
        sessionId: null,
        stage: 'init',
        status: 'starting',
        timeline: [],
        lastUpdated: new Date().toISOString(),
    };
    await ensureStateDirs();
    await writeStateDoc(state);

    const { sessionId } = await createSession(options.baseUrl, promptText, options.projectId, options.dryRun);
    state.sessionId = sessionId;
    state.stage = 'session-created';
    state.timeline.push({ time: new Date().toISOString(), event: 'session created', detail: `sessionId=${sessionId}` });
    state.lastUpdated = new Date().toISOString();
    await writeStateDoc(state);

    if (!options.dryRun) {
        const asyncPayload = await pollAsync(options.baseUrl, sessionId, options.pollMs, options.pollCap);
        state.timeline.push({ time: new Date().toISOString(), event: 'initial async', detail: `status=${asyncPayload?.status || 'idle'}` });
        state.lastUpdated = new Date().toISOString();
        await writeStateDoc(state);
    }

    let loops = 0;
    while (loops < options.maxFormLoops) {
        const session = await fetchSession(options.baseUrl, sessionId);
        const execute = getExecute(session);
        if (!execute?.form) break;
        const formSummary = summarizeForm(execute.form);
        state.stage = 'form-response';
        state.timeline.push({ time: new Date().toISOString(), event: 'form detected', detail: formSummary });
        state.lastUpdated = new Date().toISOString();
        await writeStateDoc(state);

        const body = buildResponseBody(execute.form, options);
        if (!body) break;
        state.timeline.push({ time: new Date().toISOString(), event: 'posting next', detail: JSON.stringify(body) });
        state.lastUpdated = new Date().toISOString();
        await writeStateDoc(state);
        if (!options.dryRun) {
            await postNext(options.baseUrl, sessionId, body);
            const asyncPayload = await pollAsync(options.baseUrl, sessionId, options.pollMs, options.pollCap);
            state.timeline.push({ time: new Date().toISOString(), event: 'polled async', detail: `status=${asyncPayload?.status || 'idle'}` });
            state.lastUpdated = new Date().toISOString();
            await writeStateDoc(state);
        }

        loops += 1;
    }

    const finalSession = options.dryRun ? null : await fetchSession(options.baseUrl, sessionId);
    const finalExecute = finalSession ? getExecute(finalSession) : null;
    state.stage = 'complete';
    state.status = finalExecute ? summarizeExecute(finalExecute) : 'dry-run';
    state.timeline.push({ time: new Date().toISOString(), event: 'run complete', detail: state.status });
    state.lastUpdated = new Date().toISOString();
    await writeStateDoc(state);
    await appendHistory(state);

    if (options.markComplete && !options.dryRun) {
        await markPromptDone(filePath);
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.list) {
        const pending = await findPendingPrompts();
        if (!pending.length) {
            console.log('No pending prompts');
            return;
        }
        console.log('Pending prompts:');
        pending.forEach((prompt, idx) => console.log(`${idx + 1}. ${relative(REPO_ROOT, prompt)}`));
        return;
    }

    const pending = options.prompts.length
        ? options.prompts.map((p) => resolve(REPO_ROOT, p))
        : await findPendingPrompts();

    if (!pending.length) {
        console.log('No pending prompts to run');
        return;
    }

    const toRun = pending.slice(0, options.maxPrompts);
    for (const filePath of toRun) {
        console.log(`Running prompt ${relative(REPO_ROOT, filePath)}`);
        try {
            await runPromptFile(filePath, options);
            console.log(`Finished ${relative(REPO_ROOT, filePath)}`);
        } catch (error) {
            console.error(`Error while processing ${relative(REPO_ROOT, filePath)}:`, error.message || error);
            break;
        }
    }
}

main().catch((error) => {
    console.error('Fatal:', error.message || error);
    process.exit(1);
});
