// Minimal logger shim — avoids cross-package tsc rootDir violations.
function makeLevel(level: string) {
    return (msg: string, meta?: Record<string, unknown>) => {
        const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
        if (level === 'error') console.error(`[${level.toUpperCase()}] ${line}`);
        else if (level === 'warn') console.warn(`[${level.toUpperCase()}] ${line}`);
        else console.log(`[${level.toUpperCase()}] ${line}`);
    };
}

export const logger = {
    info: makeLevel('info'),
    warn: makeLevel('warn'),
    error: makeLevel('error'),
    debug: makeLevel('debug'),
};
