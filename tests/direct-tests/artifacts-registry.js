#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryPath = path.resolve(__dirname, 'artifacts-registry.json');

function getEmptyRegistry() {
  return {
    clientSessions: [],
    serverPromiseIds: [],
    aiIntegration: {
      requestIds: [],
      promiseIds: [],
      cacheKeys: [],
    },
  };
}

async function loadRegistry() {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return getEmptyRegistry();
    return {
      ...getEmptyRegistry(),
      ...parsed,
      aiIntegration: {
        ...getEmptyRegistry().aiIntegration,
        ...(parsed.aiIntegration || {}),
      },
    };
  } catch {
    return getEmptyRegistry();
  }
}

async function saveRegistry(registry) {
  const data = JSON.stringify(registry, null, 2);
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.writeFile(registryPath, data, 'utf8');
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
  }
  console.warn('[artifacts-registry] write failed (non-fatal):', lastErr?.message || lastErr);
}

export async function recordClientSession(sessionId) {
  if (!sessionId) return;
  const registry = await loadRegistry();
  if (!registry.clientSessions.includes(sessionId)) {
    registry.clientSessions.push(sessionId);
    await saveRegistry(registry);
  }
}

export async function recordServerPromise(promiseId) {
  if (!promiseId) return;
  const registry = await loadRegistry();
  if (!registry.serverPromiseIds.includes(promiseId)) {
    registry.serverPromiseIds.push(promiseId);
    await saveRegistry(registry);
  }
}

export async function recordAiIntegrationArtifact(kind, value) {
  if (!kind || !value) return;
  const registry = await loadRegistry();
  const bucket = registry.aiIntegration;
  if (!Array.isArray(bucket[kind])) {
    bucket[kind] = [];
  }
  if (!bucket[kind].includes(value)) {
    bucket[kind].push(value);
    await saveRegistry(registry);
  }
}

export async function readRegistry() {
  return loadRegistry();
}

export async function clearRegistry() {
  await saveRegistry(getEmptyRegistry());
}

