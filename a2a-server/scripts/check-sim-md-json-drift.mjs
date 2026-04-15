#!/usr/bin/env node
/**
 * Compare first ```json fenced block in request.md / response.md to sibling request.json / response.json.
 * Default: exit 0 (report only). Pass `--fail` to exit 1 when any mismatch (CI opt-in).
 * Scans repo-root `simulations/` and `tests/integration/simulations/` (cwd = a2a-server).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const repoRoot = join(serverRoot, '..');
const SIM_ROOTS = [
  join(repoRoot, 'simulations'),
  join(repoRoot, 'tests', 'integration', 'simulations'),
].filter((p) => existsSync(p));

function firstJsonFence(md) {
  const m = md.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

function checkPair(stepDir, mdName, jsonName) {
  const mdPath = join(stepDir, mdName);
  const jsonPath = join(stepDir, jsonName);
  if (!existsSync(mdPath) || !existsSync(jsonPath)) return null;
  const md = readFileSync(mdPath, 'utf8');
  const fromMd = firstJsonFence(md);
  if (fromMd === null) return null;
  const fromJson = JSON.parse(readFileSync(jsonPath, 'utf8'));
  if (!isDeepStrictEqual(fromMd, fromJson)) {
    return { stepDir, mdName, jsonName };
  }
  return null;
}

function scanDir(SIM_ROOT, mismatches) {
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (/^\d+$/.test(name) || /^\d+-sub-\d+$/.test(name)) {
          for (const pair of [
            ['request.md', 'request.json'],
            ['response.md', 'response.json'],
          ]) {
            const bad = checkPair(p, pair[0], pair[1]);
            if (bad) mismatches.push(bad);
          }
        }
        walk(p);
      }
    }
  }
  walk(SIM_ROOT);
}

function main() {
  const fail = process.argv.includes('--fail');
  if (SIM_ROOTS.length === 0) {
    console.error('No simulations directories under repo root:', repoRoot);
    process.exit(2);
  }
  const mismatches = [];
  for (const root of SIM_ROOTS) {
    scanDir(root, mismatches);
  }

  if (mismatches.length === 0) {
    console.log('check-sim-md-json-drift: no mismatches (or no comparable fenced JSON).');
    process.exit(0);
  }
  console.warn(`check-sim-md-json-drift: ${mismatches.length} mismatch(es) (fix MD or JSON, or ignore if intentional):`);
  for (const m of mismatches) {
    console.warn(`  ${m.stepDir}: ${m.mdName} vs ${m.jsonName}`);
  }
  process.exit(fail ? 1 : 0);
}

main();
