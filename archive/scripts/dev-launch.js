/**
 * Unified launcher: kill ports, verify they're free, then start dev stack.
 *
 * Usage:
 *   npm run dev
 *   node scripts/dev-launch.js --with-ai
 */

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';

function toCmdLine(cmd, args) {
    const parts = [cmd, ...(args || [])];
    // Args here are controlled by this script (ports / fixed subcommands),
    // so minimal quoting is fine for Windows cmd.exe.
    return parts.map((p) => (/\s/.test(String(p)) ? `"${String(p)}"` : String(p))).join(' ');
}

function parseArgs(argv) {
    const opts = {
        withAi: true,
        timeoutMs: 20000,
        retryKill: true,
        checkOnly: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--with-ai') opts.withAi = true;
        if (a === '--no-ai') opts.withAi = false;
        if (a === '--timeout-ms') opts.timeoutMs = Number(argv[++i] ?? opts.timeoutMs);
        if (a === '--no-retry-kill') opts.retryKill = false;
        if (a === '--check-only') opts.checkOnly = true;
    }
    return opts;
}

function run(cmd, args, options = {}) {
    const r = isWin
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', toCmdLine(cmd, args)], {stdio: 'inherit', ...options})
        : spawnSync(cmd, args, {stdio: 'inherit', ...options});
    if (r.status != null && r.status !== 0) process.exit(r.status);
    if (r.error) {
        process.stderr.write(String(r.error?.message || r.error) + '\n');
        process.exit(1);
    }
}

function runIgnoreFail(cmd, args, options = {}) {
    const r = isWin
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', toCmdLine(cmd, args)], {stdio: 'inherit', ...options})
        : spawnSync(cmd, args, {stdio: 'inherit', ...options});
    void r;
}

function readDotEnvValue(dotEnvPath, key) {
    try {
        if (!fs.existsSync(dotEnvPath)) return undefined;
        const text = fs.readFileSync(dotEnvPath, 'utf8');
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq <= 0) continue;
            const k = trimmed.slice(0, eq).trim();
            if (k !== key) continue;
            let v = trimmed.slice(eq + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            return v;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

function maybeAddPort(ports, portValue) {
    const p = Number(portValue);
    if (!Number.isFinite(p) || p <= 0) return;
    if (!ports.includes(p)) ports.push(p);
}

function main() {
    const opts = parseArgs(process.argv.slice(2));

    const ports = [5173, 5174, 3000, 3001];

    // Keep launcher aligned with repo-local .env config (prevents "EADDRINUSE" when PORT is overridden).
    const serverDotEnv = path.join(__dirname, '..', 'a2a-server', '.env');
    maybeAddPort(ports, readDotEnvValue(serverDotEnv, 'PORT'));

    if (opts.withAi) ports.push(11434);

    // Kill
    runIgnoreFail('npx', ['--yes', 'kill-port', ...ports.map(String)]);

    // Verify free (retry kill once if needed)
    const waitArgs = ['scripts/wait-for-ports-free.js', ...ports.map(String), '--timeout-ms', String(opts.timeoutMs)];
    const wait = spawnSync('node', waitArgs, {stdio: 'inherit'});
    if (wait.status !== 0 && opts.retryKill) {
        runIgnoreFail('npx', ['--yes', 'kill-port', ...ports.map(String)]);
        run('node', waitArgs);
    } else if (wait.status !== 0) {
        process.exit(wait.status ?? 1);
    }

    if (opts.checkOnly) return;

    // Start stack
    const stackScript = opts.withAi ? 'dev:stack:ai' : 'dev:stack';
    run('npm', ['run', stackScript]);
}

main();
