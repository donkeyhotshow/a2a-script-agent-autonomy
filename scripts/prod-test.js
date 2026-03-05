#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_OUTPUT_ROOT = path.join(REPO_ROOT, 'tmp', 'prod-test-results');
const TEST_REQUESTS_DIR = path.join(REPO_ROOT, 'docs', 'production', 'test-requests');
const MODE_INFO = {
    client: {
        label: 'Client API → Server → Ollama',
        description: 'POST /api/v1/invoke on the client proxy (port 3001).',
        file: 'client.json',
    },
    server: {
        label: 'Server only',
        description: 'POST /invoke on the server API (port 3000).',
        file: 'server.json',
    },
    ollama: {
        label: 'Ollama only',
        description: 'POST /api/generate on the configured Ollama URL.',
        file: 'ollama.json',
    },
};
const DEFAULT_MODES = Object.keys(MODE_INFO);

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
        printHelp();
        return;
    }
    if (opts.list) {
        printModeList();
        return;
    }

    const selectedModes = opts.modes.length
        ? expandModes(opts.modes)
        : opts.noPrompt || !process.stdin.isTTY
            ? DEFAULT_MODES
            : await promptModeSelection();

    if (!selectedModes.length) {
        console.error('No valid modes selected; aborting.');
        process.exit(1);
    }

    const urls = {
        client: opts.clientUrl || 'http://localhost:3001',
        server: opts.serverUrl || 'http://localhost:3000',
        ollama: opts.ollamaUrl || 'http://localhost:11434',
    };

    const authHeader = buildAuthHeader(opts.authValue);
    const outputRoot = path.resolve(opts.outputDir || DEFAULT_OUTPUT_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
    await fs.mkdir(outputRoot, {recursive: true});

    console.log(`Running prod-test for modes: ${selectedModes.join(', ')}`);
    console.log(`Writing results to ${outputRoot}`);

    const summary = [];
    for (const mode of selectedModes) {
        const modeInfo = MODE_INFO[mode];
        if (!modeInfo) continue;

        const requests = await loadRequests(modeInfo.file);
        if (!requests.length) {
            console.warn(`No requests found for mode "${mode}" in ${modeInfo.file}`);
            continue;
        }

        const modeDir = path.join(outputRoot, mode);
        await fs.mkdir(modeDir, {recursive: true});

        console.log(`\n[${mode}] ${modeInfo.label} (${requests.length} request${requests.length === 1 ? '' : 's'})`);
        for (let i = 0; i < requests.length; i += 1) {
            const entry = requests[i];
            const safeName = sanitizeFileName(entry.name || `${mode}-${i + 1}`);
            const resultPath = path.join(modeDir, `${i + 1}-${safeName}.json`);
            const start = Date.now();

            const {requestSpec, error: buildError} = buildRequestSpec(mode, entry, urls, authHeader);
            if (buildError) {
                await saveResult(resultPath, {
                    meta: buildError.meta,
                    error: buildError.message,
                    durationMs: Date.now() - start,
                });
                summary.push(createSummaryRecord(
                    mode,
                    entry.name,
                    mapRelativePath(outputRoot, resultPath),
                    null,
                    buildError.message
                ));
                console.error(`  ✖ ${entry.name} (failed to build request)`);
                continue;
            }

            const executeResult = await executeRequest(requestSpec);
            await saveResult(resultPath, {
                meta: {
                    mode,
                    label: modeInfo.label,
                    description: modeInfo.description,
                    name: entry.name,
                    requestUrl: requestSpec.url,
                    method: requestSpec.method,
                    startedAt: new Date(start).toISOString(),
                    durationMs: Date.now() - start,
                },
                request: {
                    headers: requestSpec.headers,
                    body: requestSpec.body,
                },
                response: executeResult.response,
                error: executeResult.error,
            });

            summary.push(createSummaryRecord(
                mode,
                entry.name,
                mapRelativePath(outputRoot, resultPath),
                executeResult.response?.status ?? null,
                executeResult.error,
            ));

            console.log(`  ${executeResult.error ? '✖' : '✔'} ${entry.name} → ${mapRelativePath(outputRoot, resultPath)}${executeResult.error ? ` (${executeResult.error})` : ''}`);
        }
    }

    if (summary.length) {
        const summaryPath = path.join(outputRoot, 'summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
        console.log(`\nSummary: ${summary.length} entries written to ${summaryPath}`);
    } else {
        console.log('\nNo requests were executed.');
    }
}

function parseArgs(rawArgs) {
    const options = {
        modes: [],
        outputDir: '',
        clientUrl: '',
        serverUrl: '',
        ollamaUrl: '',
        authValue: '',
        help: false,
        list: false,
        noPrompt: false,
    };
    const takeValue = (idx) => (rawArgs[idx + 1] && !rawArgs[idx + 1].startsWith('-') ? rawArgs[idx + 1] : null);
    for (let i = 0; i < rawArgs.length; i += 1) {
        const arg = rawArgs[i];
        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }
        if (arg === '--list') {
            options.list = true;
            continue;
        }
        if (arg === '--no-prompt') {
            options.noPrompt = true;
            continue;
        }
        if (arg.startsWith('--mode')) {
            const [, value] = arg.split('=');
            if (value) {
                options.modes.push(...value.split(',').map((v) => v.trim()).filter(Boolean));
            } else {
                const next = takeValue(i);
                if (next) {
                    options.modes.push(...next.split(',').map((v) => v.trim()).filter(Boolean));
                    i += 1;
                }
            }
            continue;
        }
        if (arg.startsWith('--output')) {
            const [, value] = arg.split('=');
            const val = value ?? takeValue(i);
            if (val) {
                options.outputDir = val;
                if (!value) i += 1;
            }
            continue;
        }
        if (arg.startsWith('--client-url')) {
            const [, value] = arg.split('=');
            const val = value ?? takeValue(i);
            if (val) {
                options.clientUrl = val;
                if (!value) i += 1;
            }
            continue;
        }
        if (arg.startsWith('--server-url')) {
            const [, value] = arg.split('=');
            const val = value ?? takeValue(i);
            if (val) {
                options.serverUrl = val;
                if (!value) i += 1;
            }
            continue;
        }
        if (arg.startsWith('--ollama-url')) {
            const [, value] = arg.split('=');
            const val = value ?? takeValue(i);
            if (val) {
                options.ollamaUrl = val;
                if (!value) i += 1;
            }
            continue;
        }
        if (arg.startsWith('--auth')) {
            const [, value] = arg.split('=');
            const val = value ?? takeValue(i);
            if (val) {
                options.authValue = val;
                if (!value) i += 1;
            }
            continue;
        }
        console.warn(`Unknown argument ignored: ${arg}`);
    }
    return options;
}

function printHelp() {
    console.log(`
Usage: node scripts/prod-test.js [options]

Options:
  --mode <client|server|ollama|all>   Run the named mode (repeat or pass comma-separated). Defaults to all.
  --output <dir>                     Directory to stash JSON results (default: tmp/prod-test-results/<timestamp>)
  --client-url <url>                 Override client proxy base URL (default: http://localhost:3001)
  --server-url <url>                 Override server base URL (default: http://localhost:3000)
  --ollama-url <url>                 Override Ollama base URL (default: http://localhost:11434)
  --auth <value>                     Authorization header value for client/server calls (defaults to A2A_SERVER_PASSWORD env as Bearer token)
  --list                             Print available modes and exit
  --no-prompt                        Skip interactive mode selection when no --mode supplied
  --help, -h                         Show this help text
`);
}

function printModeList() {
    console.log('Available prod-test modes:');
    for (const [key, info] of Object.entries(MODE_INFO)) {
        console.log(`  ${key.padEnd(8)} — ${info.label} (${info.file})`);
        console.log(`       ${info.description}`);
    }
}

function expandModes(modes) {
    const normalized = new Set();
    modes.forEach((value) => {
        const parts = value.split(',');
        parts.forEach((segment) => {
            const cleaned = segment.trim().toLowerCase();
            if (!cleaned) return;
            if (cleaned === 'all') {
                DEFAULT_MODES.forEach((mode) => normalized.add(mode));
                return;
            }
            if (DEFAULT_MODES.includes(cleaned)) {
                normalized.add(cleaned);
            } else {
                console.warn(`Unknown mode "${cleaned}" ignored.`);
            }
        });
    });
    return Array.from(normalized);
}

async function promptModeSelection() {
    const menu = [
        {key: '1', modes: ['client'], label: 'Client → Server'},
        {key: '2', modes: ['server'], label: 'Server only'},
        {key: '3', modes: ['ollama'], label: 'Ollama only'},
        {key: '4', modes: DEFAULT_MODES, label: 'All of the above'},
    ];

    console.log('\nSelect prod-test modes (comma-separated keys). Default: 4 (all):');
    menu.forEach((item) => {
        console.log(`  ${item.key}) ${item.label}`);
    });

    const answer = await askQuestion('Choice: ');
    const tokens = (answer || '4').split(/[\s,]+/).map((token) => token.trim()).filter(Boolean);
    const selected = new Set();
    tokens.forEach((token) => {
        const item = menu.find((entry) => entry.key === token);
        if (item) {
            item.modes.forEach((mode) => selected.add(mode));
        }
    });
    if (!selected.size) {
        DEFAULT_MODES.forEach((mode) => selected.add(mode));
    }
    return Array.from(selected);
}

async function askQuestion(query) {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function sanitizeFileName(value) {
    return String(value)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'request';
}

function buildAuthHeader(value) {
    if (value) return value;
    const envPassword = process.env['A2A_SERVER_PASSWORD'];
    if (envPassword) {
        return `Bearer ${envPassword}`;
    }
    return '';
}

function buildRequestSpec(mode, entry, urls, authHeader) {
    try {
        switch (mode) {
            case 'client': {
                const url = joinUrl(urls.client, '/api/v1/invoke');
                const body = buildContextPayload(entry);
                return {
                    requestSpec: {
                        method: 'POST',
                        url,
                        headers: buildHeaders(authHeader),
                        body,
                    },
                };
            }
            case 'server': {
                const url = joinUrl(urls.server, '/invoke');
                const body = buildContextPayload(entry);
                return {
                    requestSpec: {
                        method: 'POST',
                        url,
                        headers: buildHeaders(authHeader),
                        body,
                    },
                };
            }
            case 'ollama': {
                const url = joinUrl(urls.ollama, '/api/generate');
                const payload = entry.payload ?? {};
                return {
                    requestSpec: {
                        method: 'POST',
                        url,
                        headers: {'Content-Type': 'application/json'},
                        body: payload,
                    },
                };
            }
            default:
                return {requestSpec: null, error: {message: `Unsupported mode ${mode}`, meta: {mode}}};
        }
    } catch (error) {
        return {requestSpec: null, error: {message: error?.message ?? 'Unknown error', meta: {mode}}};
    }
}

function buildHeaders(authHeader) {
    const headers = {'Content-Type': 'application/json'};
    if (authHeader) {
        headers.Authorization = authHeader;
    }
    return headers;
}

function buildContextPayload(entry) {
    const payload = {};
    if (entry.message) payload.message = entry.message;
    if (entry.context) payload.context = entry.context;
    const task = entry.context?.task;
    if (typeof task === 'string' && task.trim()) {
        payload.task = task;
    }
    return removeUndefined(payload);
}

function removeUndefined(obj) {
    const copy = {};
    Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined) {
            copy[key] = obj[key];
        }
    });
    return copy;
}

function joinUrl(base, suffix) {
    const trimmed = String(base).trim().replace(/\/+$/, '');
    const cleanSuffix = String(suffix).replace(/^\/+/, '');
    return `${trimmed}/${cleanSuffix}`;
}

async function executeRequest({method, url, headers, body}) {
    let response = null;
    let responseBody = null;
    let parsedBody = null;
    let error = '';
    try {
        const payload = body && Object.keys(body).length ? JSON.stringify(body) : '{}';
        response = await fetch(url, {method, headers, body: payload});
        const text = await response.text();
        responseBody = text;
        try {
            parsedBody = JSON.parse(text);
        } catch {
            parsedBody = null;
        }
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    }

    const responseHeaders = {};
    if (response) {
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });
    }

    return {
        response: response
            ? {
                  status: response.status,
                  statusText: response.statusText,
                  headers: responseHeaders,
                  body: parsedBody ?? responseBody,
                  rawBody: responseBody,
              }
            : null,
        error: error || (response && response.ok ? '' : response ? `HTTP ${response.status}` : 'Unknown error'),
    };
}

async function loadRequests(fileName) {
    const filePath = path.join(TEST_REQUESTS_DIR, fileName);
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        console.warn(`Request file ${fileName} did not export an array.`);
        return [];
    } catch (error) {
        console.error(`Failed to load ${fileName}: ${error.message}`);
        return [];
    }
}

async function saveResult(filePath, content) {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
}

function createSummaryRecord(mode, name, relativePath, statusCode, error) {
    return {
        mode,
        name,
        resultPath: relativePath,
        statusCode,
        ok: !error && (statusCode == null || (statusCode >= 200 && statusCode < 300)),
        error: error || '',
    };
}

function mapRelativePath(root, target) {
    return path.relative(root, target).replace(/\\/g, '/');
}

main().catch((error) => {
    console.error('prod-test failed:', error);
    process.exit(1);
});
