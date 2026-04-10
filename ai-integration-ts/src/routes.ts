import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config.js';
import {
  createPromise,
  deletePromise,
  getBodyRaw,
  getPromise,
  getRequestSnapshot,
  getResultBody,
  listByStatus,
  setPromiseDone,
  setPromiseError,
  updatePromise,
} from './promise-store.js';

function wantsDetail(req: FastifyRequest): boolean {
  const value = String((req.query as Record<string, unknown> | undefined)?.detail ?? '').toLowerCase();
  return ['1', 'true', 'yes', 'full'].includes(value);
}

function shortError(error: string | undefined, detail: boolean): { text: string | undefined; truncated: boolean } {
  if (!error) return { text: undefined, truncated: false };
  if (detail || error.length <= config.errorShortLen) return { text: error, truncated: false };
  return { text: `${error.slice(0, config.errorShortLen)}...`, truncated: true };
}

async function executePromiseById(promiseId: string): Promise<void> {
  const rec = getPromise(promiseId);
  if (!rec || rec.status !== 'pending') return;
  const snapshot = getRequestSnapshot(promiseId);
  if (!snapshot) {
    setPromiseError(promiseId, 'request_not_found');
    return;
  }
  try {
    const upstreamResp = await fetch(snapshot.targetUrl, {
      method: snapshot.method,
      headers: snapshot.headers,
      body: snapshot.method === 'GET' ? undefined : JSON.stringify(snapshot.body),
    });
    const bytes = Buffer.from(await upstreamResp.arrayBuffer());
    let bodyRaw: unknown | undefined;
    const ctype = upstreamResp.headers.get('content-type') || 'application/octet-stream';
    if (ctype.includes('application/json')) {
      try {
        bodyRaw = JSON.parse(bytes.toString('utf8'));
      } catch {
        bodyRaw = undefined;
      }
    }
    setPromiseDone(promiseId, upstreamResp.status, ctype, bytes, bodyRaw);
  } catch (error) {
    setPromiseError(promiseId, String(error));
  }
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({ status: 'running', proxy_port: config.port, local_llm_upstream_host: config.upstreamUrl }));
  app.get('/health', async () => ({ status: 'running', proxy_port: config.port, local_llm_upstream_host: config.upstreamUrl, local_llm_upstream_available: true }));
  app.get('/health/ready', async () => ({ status: 'ready', local_llm_upstream_available: true, cache_status: 'active' }));
  app.get('/health/compat_llm', async () => ({ status: 'healthy', local_llm_upstream_available: true, local_llm_upstream_url: config.upstreamUrl }));
  app.get('/health/local-llm-upstream', async () => ({ status: 'healthy', local_llm_upstream_url: config.upstreamUrl }));

  app.get('/promises/pending', async () =>
    listByStatus('pending').map((r) => ({
      promiseId: r.promiseId,
      status: r.status,
      created_at: new Date(r.createdAt).toISOString(),
      created_at_unix: Math.floor(r.createdAt / 1000),
      method: r.method,
      path: r.path,
      target_url: r.targetUrl,
      log_folder: r.logFolder,
    }))
  );
  app.get('/promises/ready', async () =>
    listByStatus('done').map((r) => ({
      promiseId: r.promiseId,
      status: r.status,
      serverPromiseId: r.serverPromiseId,
      updated_at: new Date(r.updatedAt).toISOString(),
      updated_at_unix: Math.floor(r.updatedAt / 1000),
    }))
  );
  app.get('/promises/status', async () => ({ ready: await app.inject({ method: 'GET', url: '/promises/ready' }).then((x) => JSON.parse(x.body)) }));
  app.get('/promises/errors', async (req) => {
    const detail = wantsDetail(req);
    return listByStatus('error').map((r) => {
      const s = shortError(r.error, detail);
      return {
        promiseId: r.promiseId,
        status: 'error',
        error: s.text,
        ...(s.truncated ? { error_truncated: true } : {}),
        method: r.method,
        path: r.path,
        target_url: r.targetUrl,
        updated_at: new Date(r.updatedAt).toISOString(),
        updated_at_unix: Math.floor(r.updatedAt / 1000),
      };
    });
  });

  app.get('/promise/by-server-request/:serverPromiseId', async (req, reply) => {
    const serverPromiseId = (req.params as { serverPromiseId: string }).serverPromiseId;
    const rec = [...listByStatus('pending'), ...listByStatus('done'), ...listByStatus('error')].find((r) => r.serverPromiseId === serverPromiseId);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', serverPromiseId });
    return { promiseId: rec.promiseId, status: rec.status, serverPromiseId };
  });
  app.get('/promise/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = getPromise(id);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    if (rec.status === 'pending') return reply.code(202).send({ promiseId: id, status: 'pending' });
    if (rec.status === 'error') {
      const s = shortError(rec.error, wantsDetail(req));
      return reply.code(500).send({ promiseId: id, status: 'error', error: s.text, ...(s.truncated ? { error_truncated: true } : {}) });
    }
    return { promiseId: id, status: 'done', result_status_code: rec.resultStatusCode, result_content_type: rec.resultContentType };
  });
  app.delete('/promise/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = deletePromise(id);
    if (!ok) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    return { promiseId: id, deleted: true };
  });
  app.get('/promise/:id/request', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = getPromise(id);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    const snap = getRequestSnapshot(id);
    if (!snap) return reply.code(404).send({ error: 'request_not_found', promiseId: id });
    return { promiseId: id, method: snap.method, path: snap.path, headers: snap.headers, body: snap.body };
  });
  app.get('/promise/:id/response', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = getPromise(id);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    if (rec.status === 'pending') return reply.code(202).send({ promiseId: id, status: 'pending' });
    if (rec.status === 'error') {
      const s = shortError(rec.error, wantsDetail(req));
      return reply.code(500).send({ promiseId: id, status: 'error', error: s.text, ...(s.truncated ? { error_truncated: true } : {}) });
    }
    const body = getResultBody(id);
    if (!body) return reply.code(500).send({ promiseId: id, status: 'error', error: 'missing_body' });
    reply.header('Content-Type', rec.resultContentType || 'application/octet-stream');
    reply.header('X-Promise-Id', id);
    reply.header('X-Promise-Status', 'done');
    return reply.code(rec.resultStatusCode || 200).send(body);
  });
  app.get('/promise/:id/body_raw', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = getPromise(id);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    if (rec.status === 'pending') return reply.code(202).send({ promiseId: id, status: 'pending' });
    if (rec.status === 'error') {
      const s = shortError(rec.error, wantsDetail(req));
      return reply.code(500).send({ promiseId: id, status: 'error', error: s.text, ...(s.truncated ? { error_truncated: true } : {}) });
    }
    const raw = getBodyRaw(id);
    if (!raw) return reply.code(404).send({ error: 'body_raw_not_found', promiseId: id });
    return raw;
  });
  app.post('/promise/:id/answer', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const body = (req.body || {}) as { status_code?: number; headers?: Record<string, string>; body?: unknown };
    const payload = typeof body.body === 'string' ? body.body : JSON.stringify(body.body ?? {});
    const rec = setPromiseDone(id, body.status_code ?? 200, body.headers?.['Content-Type'] || 'application/json', payload, body.body);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    return { promiseId: id, status: rec.status };
  });
  app.post('/promise/:id/retry', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = updatePromise(id, { status: 'pending', error: undefined });
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    return { promiseId: id, status: rec.status };
  });
  app.post('/promise/:id/execute', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const rec = getPromise(id);
    if (!rec) return reply.code(404).send({ error: 'promise_not_found', promiseId: id });
    if (rec.status !== 'pending') return reply.code(409).send({ error: 'promise_not_pending', promiseId: id, status: rec.status });
    void executePromiseById(id);
    return reply.code(202).send({ promiseId: id, status: 'pending' });
  });

  async function enqueueAsync(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const routePath = (req.raw.url || '').split('?')[0];
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const rec = createPromise({
      method: req.method,
      path: routePath,
      headers,
      body: req.body ?? {},
      targetUrl: `${config.upstreamUrl}${routePath}`,
    });
    void executePromiseById(rec.promiseId);
    reply.code(202).send({ promiseId: rec.promiseId, status: 'pending' });
  }
  app.post('/api/chat', enqueueAsync);
  app.post('/api/generate', enqueueAsync);
  app.post('/api/embeddings', enqueueAsync);
  app.post('/v1/chat/completions', enqueueAsync);
  app.get('/api/tags', async () => ({ models: [] }));

  app.get('/daemon/status', async () => ({ running: true, promises_processed: 0 }));
  app.post('/daemon/start', async () => ({ ok: true }));
  app.post('/daemon/stop', async () => ({ ok: true }));
  app.get('/cleanup/stats', async () => ({ ok: true, deleted: 0 }));
  app.post('/cleanup/run', async () => ({ ok: true, deleted: 0 }));
  app.get('/local-llm-upstream/status', async () => ({ running: true, upstream: config.upstreamUrl }));
  app.get('/local-llm-upstream/start', async () => ({ ok: true }));
  app.post('/local-llm-upstream/stop', async () => ({ ok: true }));
  app.post('/local-llm-upstream/restart', async () => ({ ok: true }));

  app.get('/ui/promises/next', async () => listByStatus('pending')[0] ?? null);
  app.post('/ui/promises/:id/execute', async (req) => app.inject({ method: 'POST', url: `/promise/${(req.params as { id: string }).id}/execute` }).then((x) => JSON.parse(x.body || '{}')));
  app.post('/ui/promises/:id/respond', async (req) => app.inject({ method: 'POST', url: `/promise/${(req.params as { id: string }).id}/answer`, payload: req.body }).then((x) => JSON.parse(x.body || '{}')));
  app.get('/ui/promises/view', async () => ({ pending: listByStatus('pending').length, errors: listByStatus('error').length }));
}
