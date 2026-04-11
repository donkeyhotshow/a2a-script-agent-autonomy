#!/usr/bin/env node

import path from 'path';
import fs from 'fs/promises';
import {readRegistry, clearRegistry} from './artifacts-registry.js';

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';

async function deleteClientSession(sessionId) {
  const url = `${CLIENT_API_URL}/api/a2a/sessions/${encodeURIComponent(sessionId)}`;
  try {
    const res = await fetch(url, {method: 'DELETE'});
    if (!res.ok && res.status !== 404 && res.status !== 409) {
      console.warn(`[cleanup] Failed to delete client session ${sessionId}: ${res.status}`);
    } else {
      console.log(`[cleanup] Deleted client session ${sessionId} (status ${res.status})`);
    }
  } catch (e) {
    console.warn(`[cleanup] Error deleting client session ${sessionId}:`, e.message || e);
  }
}

async function deleteServerRequestFiles(promiseId) {
  if (!promiseId) return;
  const repoRoot = process.cwd();
  const requestFile = path.resolve(
    repoRoot,
    'a2a-server',
    'storage',
    'requests',
    `${promiseId}.json`,
  );
  try {
    await fs.unlink(requestFile);
    console.log(`[cleanup] Deleted server request file for ${promiseId}`);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      return;
    }
    console.warn(
      `[cleanup] Error deleting server request file for ${promiseId}:`,
      e.message || e,
    );
  }
}

async function runAiIntegrationCleanup() {
  const repoRoot = process.cwd();
  const psScript = path.resolve(
    repoRoot,
    'tests',
    'direct-tests',
    'a2a-ai-hub',
    'run-test-cleanup.ps1',
  );
  try {
    const {spawn} = await import('child_process');
    await new Promise((resolve, reject) => {
      const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psScript], {
        stdio: 'inherit',
      });
      child.on('exit', (code) => {
        if (code === 0) resolve(null);
        else reject(new Error(`run-test-cleanup.ps1 exited with code ${code}`));
      });
    });
  } catch (e) {
    console.warn('[cleanup] a2a-ai-hub cleanup failed:', e.message || e);
  }
}

async function main() {
  console.log('=== Direct tests artifact cleanup ===');
  const registry = await readRegistry();

  if (registry.clientSessions.length === 0 &&
      registry.serverPromiseIds.length === 0 &&
      (!registry.aiIntegration ||
        (!registry.aiIntegration.requestIds?.length &&
          !registry.aiIntegration.promiseIds?.length &&
          !registry.aiIntegration.cacheKeys?.length))) {
    console.log('[cleanup] Registry is empty – nothing to delete.');
    return;
  }

  for (const id of registry.clientSessions) {
    await deleteClientSession(id);
  }

  for (const pid of registry.serverPromiseIds) {
    await deleteServerRequestFiles(pid);
  }

  await runAiIntegrationCleanup();

  await clearRegistry();
  console.log('[cleanup] Done. Registry cleared.');
}

main().catch((err) => {
  console.error('[cleanup] Fatal error:', err);
  process.exit(1);
});

