/**
 * Wait until all ports are free (not in use).
 *
 * Usage:
 *   node scripts/wait-for-ports-free.js 3000 3001 5173 --timeout-ms 15000 --interval-ms 250
 */

const net = require('net');

function parseArgs(argv) {
    const ports = [];
    const options = {
        host: '127.0.0.1',
        timeoutMs: 15000,
        intervalMs: 250,
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--timeout-ms') {
            options.timeoutMs = Number(argv[++i] ?? options.timeoutMs);
            continue;
        }
        if (a === '--interval-ms') {
            options.intervalMs = Number(argv[++i] ?? options.intervalMs);
            continue;
        }
        if (a === '--host') {
            options.host = String(argv[++i] ?? options.host);
            continue;
        }
        if (a.startsWith('-')) continue;
        const p = Number(a);
        if (Number.isFinite(p) && p > 0) ports.push(p);
    }

    return {ports, options};
}

function isPortFree(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.once('error', (err) => {
            if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) return resolve(false);
            resolve(false);
        });
        server.listen(port, host, () => {
            server.close(() => resolve(true));
        });
    });
}

async function getBusyPorts(ports, host) {
    const checks = await Promise.all(ports.map(async (p) => ({port: p, free: await isPortFree(p, host)})));
    return checks.filter((x) => !x.free).map((x) => x.port);
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    const {ports, options} = parseArgs(process.argv.slice(2));
    if (!ports.length) {
        console.error('No ports provided.');
        process.exit(2);
    }

    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const busy = await getBusyPorts(ports, options.host);
        if (busy.length === 0) {
            process.stdout.write(`[ports] free: ${ports.join(', ')}\n`);
            return;
        }

        const elapsed = Date.now() - start;
        if (elapsed >= options.timeoutMs) {
            console.error(`[ports] still busy after ${elapsed}ms: ${busy.join(', ')}`);
            process.exit(1);
        }

        process.stdout.write(`[ports] waiting (${elapsed}ms): busy ${busy.join(', ')}\n`);
        await sleep(options.intervalMs);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});

