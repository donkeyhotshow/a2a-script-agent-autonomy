#!/usr/bin/env node
/**
 * Remove Task Monitor state files only (no Client API session trees).
 * Paths follow TASK_MONITOR_STATE_FILE / TASK_MONITOR_COMPLETED_SESSIONS_FILE (same as task-monitor-core).
 */
import fs from 'fs';
import path from 'path';

const stateFile = path.resolve(
  process.env.TASK_MONITOR_STATE_FILE || path.join(process.cwd(), 'task-monitor-state.json')
);
const ledgerEnv = process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE;
const ledgerFile =
  ledgerEnv && ledgerEnv !== '0'
    ? path.resolve(ledgerEnv)
    : path.join(path.dirname(stateFile), 'task-monitor-completed-sessions.json');

for (const f of [stateFile, ledgerFile]) {
  try {
    fs.unlinkSync(f);
    console.log(`[monitor:reset] removed ${f}`);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      console.log(`[monitor:reset] skip (missing) ${f}`);
    } else {
      console.warn(`[monitor:reset] skip ${f}: ${e.message}`);
    }
  }
}
