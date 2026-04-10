import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import type { PromiseRecord, RequestSnapshot } from './types.js';

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function promiseDir(promiseId: string): string {
  return path.join(config.storageRoot, promiseId);
}

function recordPath(promiseId: string): string {
  return path.join(promiseDir(promiseId), 'record.json');
}

export function createPromise(snapshot: RequestSnapshot): PromiseRecord {
  ensureDir(config.storageRoot);
  const promiseId = crypto.randomUUID().replace(/-/g, '');
  const dir = promiseDir(promiseId);
  ensureDir(dir);
  const now = Date.now();
  const rec: PromiseRecord = {
    promiseId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    method: snapshot.method,
    path: snapshot.path,
    targetUrl: snapshot.targetUrl,
    logFolder: dir,
  };
  writeJson(recordPath(promiseId), rec);
  writeJson(path.join(dir, 'request.json'), snapshot);
  fs.writeFileSync(path.join(dir, 'body.md'), typeof snapshot.body === 'string' ? snapshot.body : JSON.stringify(snapshot.body, null, 2), 'utf8');
  return rec;
}

export function getPromise(promiseId: string): PromiseRecord | null {
  return readJson<PromiseRecord>(recordPath(promiseId));
}

export function listPromises(): PromiseRecord[] {
  ensureDir(config.storageRoot);
  const dirs = fs.readdirSync(config.storageRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  const rows: PromiseRecord[] = [];
  for (const d of dirs) {
    const rec = getPromise(d.name);
    if (rec) rows.push(rec);
  }
  return rows;
}

export function listByStatus(status: PromiseRecord['status']): PromiseRecord[] {
  return listPromises()
    .filter((r) => r.status === status)
    .sort((a, b) => (status === 'pending' ? a.createdAt - b.createdAt : a.updatedAt - b.updatedAt));
}

export function updatePromise(promiseId: string, patch: Partial<PromiseRecord>): PromiseRecord | null {
  const rec = getPromise(promiseId);
  if (!rec) return null;
  const next = { ...rec, ...patch, updatedAt: Date.now() };
  writeJson(recordPath(promiseId), next);
  return next;
}

export function deletePromise(promiseId: string): boolean {
  const dir = promiseDir(promiseId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function getRequestSnapshot(promiseId: string): RequestSnapshot | null {
  return readJson<RequestSnapshot>(path.join(promiseDir(promiseId), 'request.json'));
}

export function setPromiseDone(
  promiseId: string,
  statusCode: number,
  contentType: string,
  body: Buffer | string,
  bodyRaw?: unknown
): PromiseRecord | null {
  const dir = promiseDir(promiseId);
  ensureDir(dir);
  const bodyPath = path.join(dir, 'result-body.bin');
  fs.writeFileSync(bodyPath, body);
  if (bodyRaw !== undefined) {
    writeJson(path.join(dir, 'body_raw.json'), bodyRaw);
  }
  return updatePromise(promiseId, {
    status: 'done',
    resultStatusCode: statusCode,
    resultContentType: contentType,
    error: undefined,
  });
}

export function setPromiseError(promiseId: string, error: string): PromiseRecord | null {
  return updatePromise(promiseId, { status: 'error', error });
}

export function getResultBody(promiseId: string): Buffer | null {
  const p = path.join(promiseDir(promiseId), 'result-body.bin');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function getBodyRaw(promiseId: string): unknown | null {
  return readJson(path.join(promiseDir(promiseId), 'body_raw.json'));
}
