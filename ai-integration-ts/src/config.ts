import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

export const config = {
  port: Number(process.env.PROXY_PORT || '11434'),
  host: process.env.PROXY_HOST || '0.0.0.0',
  upstreamUrl: process.env.LOCAL_LLM_UPSTREAM_URL || 'http://localhost:11435',
  storageRoot:
    process.env.AI_INTEGRATION_STORAGE_ROOT ||
    path.resolve(repoRoot, 'ai-integration', 'proxy_logs', 'promises'),
  errorShortLen: 400,
};
