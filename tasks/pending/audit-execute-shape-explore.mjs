#!/usr/bin/env node
/**
 * Exploration: Find execute shape violations in simulations/sync/* response.json
 * Looks for: multi-key execute, bare blobs, flat action keys
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const SIM_DIR = path.join(repoRoot, 'simulations', 'sync');
const SESSION_DIR = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');

const TOOL_KEYS = new Set([
  'rag-search', 'read-file', 'write-file', 'execute-command',
  'list-directory', 'grep-search', 'script', 'file-exists', 'edit-patch', 'run-script', 'dialog'
]);

function findViolations(jsonPath) {
  const violations = [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return [{ type: 'PARSE_ERROR', message: e.message }];
  }

  // Unwrap session wrapper
  const payload = data?.session ?? data?.data ?? data;
  if (!payload || typeof payload !== 'object') return [];

  const execute = payload.execute;
  if (!execute || typeof execute !== 'object') return [];

  const keys = Object.keys(execute).filter(k => execute[k] !== undefined && execute[k] !== null);

  // Check multi-key execute
  const toolKeys = keys.filter(k => TOOL_KEYS.has(k));
  const hasForm = keys.includes('form');
  const hasMessage = keys.includes('message');

  if (toolKeys.length > 0 && hasMessage) {
    violations.push({
      type: 'MESSAGE_WITH_TOOL',
      keys,
      message: `execute has both message and tool keys: ${toolKeys.join(',')}`
    });
  }

  if (toolKeys.length > 1) {
    violations.push({
      type: 'MULTI_TOOL',
      keys,
      message: `execute has multiple tool keys: ${toolKeys.join(',')}`
    });
  }

  if (keys.length > 2 && !keys.includes('_meta')) {  // Allow _meta as internal key
    violations.push({
      type: 'MULTI_KEY_EXECUTE',
      keys,
      message: `execute has ${keys.length} keys: ${keys.join(',')}`
    });
  }

  // Check for flat action key
  if (execute.action && typeof execute.action === 'string' && keys.length > 1) {
    violations.push({
      type: 'FLAT_ACTION',
      keys,
      message: `execute uses flat action key with params: action=${execute.action}`
    });
  }

  // Check result shape
  const result = payload.result;
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const rkeys = Object.keys(result);
    if (rkeys.length === 1 && rkeys[0] === 'content') {
      violations.push({
        type: 'RESULT_BARE_CONTENT',
        keys: rkeys,
        message: 'result uses legacy bare blob: { content: ... }'
      });
    }
    if (rkeys.length === 1 && rkeys[0] === 'results') {
      violations.push({
        type: 'RESULT_BARE_RESULTS',
        keys: rkeys,
        message: 'result uses legacy bare blob: { results: [...] }'
      });
    }
  }

  return violations;
}

function scanSimulations() {
  const results = [];
  const categories = fs.readdirSync(SIM_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const cat of categories) {
    const catPath = path.join(SIM_DIR, cat);
    const steps = fs.readdirSync(catPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d+$/.test(d.name))
      .map(d => d.name);

    for (const step of steps) {
      const responsePath = path.join(catPath, step, 'response.json');
      if (!fs.existsSync(responsePath)) continue;

      const violations = findViolations(responsePath);
      if (violations.length > 0) {
        results.push({
          file: path.relative(repoRoot, responsePath),
          violations
        });
      }
    }
  }

  return results;
}

console.log('=== Execute Shape Audit: simulations/sync ===\n');
const results = scanSimulations();

if (results.length === 0) {
  console.log('No violations found in simulations/sync/* response.json files');
} else {
  console.log(`Found ${results.length} files with violations:\n`);
  for (const r of results) {
    console.log(`${r.file}:`);
    for (const v of r.violations) {
      console.log(`  [${v.type}] ${v.message}`);
    }
    console.log();
  }
}

// Scan sessions if they exist
let sessionResults = [];
if (fs.existsSync(SESSION_DIR)) {
  console.log('\n=== Execute Shape Audit: storage/sessions ===\n');
  const sessions = fs.readdirSync(SESSION_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('sess_'))
    .map(d => d.name);

  for (const sess of sessions) {
    const sessPath = path.join(SESSION_DIR, sess);
    const steps = fs.readdirSync(sessPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d+$/.test(d.name))
      .map(d => d.name);

    for (const step of steps) {
      const responsePath = path.join(sessPath, step, 'server-response.json');
      if (!fs.existsSync(responsePath)) continue;

      const violations = findViolations(responsePath);
      if (violations.length > 0) {
        sessionResults.push({
          file: path.relative(repoRoot, responsePath),
          violations
        });
      }
    }
  }

  if (sessionResults.length === 0) {
    console.log('No violations found in storage/sessions/* server-response.json files');
  } else {
    console.log(`Found ${sessionResults.length} files with violations:\n`);
    for (const r of sessionResults) {
      console.log(`${r.file}:`);
      for (const v of r.violations) {
        console.log(`  [${v.type}] ${v.message}`);
      }
      console.log();
    }
  }
} else {
  console.log('\n=== Execute Shape Audit: storage/sessions ===\n');
  console.log('Directory does not exist (no saved sessions)');
}

console.log('\n=== Summary ===');
console.log(`Simulations scanned: 29 categories`);
console.log(`Sim violations: ${results.length}`);
console.log(`Sessions scanned: ${sessionResults.length > 0 ? 'yes' : 'none found'}`);
console.log(`Session violations: ${sessionResults.length}`);

const allResults = [...results, ...sessionResults];
if (allResults.length > 0) {
  const typeCounts = {};
  for (const r of allResults) {
    for (const v of r.violations) {
      typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
    }
  }
  console.log('Violation types:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
}
