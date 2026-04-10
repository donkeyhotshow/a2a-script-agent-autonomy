/**
 * Service fixtures for smoke tests
 */

export const SERVICES = {
    server: { port: 3000, health: 'http://localhost:3000/health' },
    clientApi: { port: 5173, health: 'http://localhost:5173' },
    webUi: { port: 5173, health: 'http://localhost:5173' },
    aiHub: { port: 11434, health: 'http://localhost:11434/health' },
    compat_llm: { port: 11435, health: 'http://localhost:11435/api/tags' }
} as const;

