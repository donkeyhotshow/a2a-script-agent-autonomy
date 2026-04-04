/**
 * Proba-servera: structure check vs expected.json — in-process invoke (no HTTP).
 * Loads a2a-server config + action registry; same path as POST /api/v1/invoke body.
 *
 * Matching: **subset** of keys — every key in expected must exist in actual; extra keys
 * (e.g. session_id, workbench) are ignored. Arrays: each element must match the template
 * object derived from expected[0].
 *
 * Optional: PROBA_SERVERA_USE_HTTP=1 → fetch http://localhost:3000/api/v1/invoke (legacy).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function getKeyStructure(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return { type: obj === null ? 'null' : typeof obj, keys: null };
  }
  if (Array.isArray(obj)) {
    const itemTypes = obj.length > 0 ? [getKeyStructure(obj[0])] : [];
    return { type: 'array', itemTypes, keys: null };
  }
  const structure: Record<string, unknown> = { type: 'object', keys: {} };
  const keys = structure.keys as Record<string, Record<string, unknown>>;
  for (const key in obj as Record<string, unknown>) {
    keys[key] = getKeyStructure((obj as Record<string, unknown>)[key]);
  }
  return structure;
}

/**
 * Subset structure match: every key in `expected` must exist in `actual` with compatible shape.
 * Extra keys in `actual` are ignored (session_id, workbench, router internals).
 */
function compareWithDiff(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  basePath = ''
): Array<{ path: string; issue: string; expected: unknown; actual: unknown }> {
  const diffs: Array<{ path: string; issue: string; expected: unknown; actual: unknown }> = [];

  if (expected === null || expected === undefined) return diffs;

  if (expected.type !== (actual as { type?: string })?.type) {
    diffs.push({
      path: basePath,
      issue: 'type-mismatch',
      expected: expected.type,
      actual: (actual as { type?: string })?.type ?? 'missing',
    });
    return diffs;
  }

  if (expected.type === 'array' && actual.type === 'array') {
    const ei = (expected.itemTypes as Record<string, unknown>[])?.[0];
    const actualItems = (actual.itemTypes as Record<string, unknown>[]) || [];
    if (!ei) return diffs;
    if (actualItems.length === 0) {
      diffs.push({
        path: basePath,
        issue: 'missing-key',
        expected: { template: ei },
        actual: null,
      });
      return diffs;
    }
    for (let i = 0; i < actualItems.length; i++) {
      diffs.push(
        ...compareWithDiff(actualItems[i] as Record<string, unknown>, ei, `${basePath}[${i}]`)
      );
    }
    return diffs;
  }

  if (expected.type === 'object' && actual.type === 'object') {
    const ek = Object.keys((expected.keys as Record<string, unknown>) || {});
    const ak = Object.keys((actual.keys as Record<string, unknown>) || {});

    for (const key of ek) {
      if (!ak.includes(key)) {
        diffs.push({
          path: basePath ? `${basePath}.${key}` : key,
          issue: 'missing-key',
          expected: (expected.keys as Record<string, unknown>)[key],
          actual: null,
        });
      } else {
        const nested = compareWithDiff(
          (actual.keys as Record<string, unknown>)[key] as Record<string, unknown>,
          (expected.keys as Record<string, unknown>)[key] as Record<string, unknown>,
          basePath ? `${basePath}.${key}` : key
        );
        diffs.push(...nested);
      }
    }
  }

  return diffs;
}

function generateErrorReport(
  caseName: string,
  input: unknown,
  expected: unknown,
  actual: unknown,
  diffs: ReturnType<typeof compareWithDiff>
): string {
  const timestamp = new Date().toISOString();
  let report = `# Test Failure Report: ${caseName}\n\n`;
  report += `**Timestamp:** ${timestamp}\n\n`;
  report += `## Summary\n\n- **Status:** FAIL\n- **Differences Found:** ${diffs.length}\n\n`;
  report += `## Differences\n\n| Path | Issue | Expected | Actual |\n|------|-------|----------|--------|\n`;
  for (const d of diffs) {
    const es = d.expected === null ? '—' : JSON.stringify(d.expected).slice(0, 40);
    const as = d.actual === null ? '—' : JSON.stringify(d.actual).slice(0, 40);
    report += `| \`${d.path}\` | ${d.issue} | ${es} | ${as} |\n`;
  }
  report += `\n## Input (Request)\n\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n`;
  report += `## Expected Structure\n\n\`\`\`json\n${JSON.stringify(getKeyStructure(expected), null, 2)}\n\`\`\`\n\n`;
  report += `## Actual Structure\n\n\`\`\`json\n${JSON.stringify(getKeyStructure(actual), null, 2)}\n\`\`\`\n\n`;
  report += `## Full Expected\n\n\`\`\`json\n${JSON.stringify(expected, null, 2)}\n\`\`\`\n\n`;
  report += `## Full Actual\n\n\`\`\`json\n${JSON.stringify(actual, null, 2)}\n\`\`\`\n`;
  return report;
}

function inputToInvokePayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    context: body.context,
    sync: true,
  };
  if (typeof body.task === 'string') out.task = body.task;
  if (typeof body.message === 'string') out.message = body.message;
  if (body.result && typeof body.result === 'object') out.result = body.result;
  if (typeof body.action === 'string') out.action = body.action;
  if (body.selectedAction && typeof body.selectedAction === 'object') out.selectedAction = body.selectedAction;
  if (typeof body.stepId === 'string') out.stepId = body.stepId;
  if (body.stepResult !== undefined) out.stepResult = body.stepResult;
  if (body.code_blocks !== undefined) out.code_blocks = body.code_blocks;
  return out;
}

/** Same shape as expected.json / simulations response.json */
function normalizeInvokeResult(invokeResult: {
  context?: Record<string, unknown>;
  execute?: Record<string, unknown>;
  message?: string;
  sync?: boolean;
  promiseId?: string;
}): Record<string, unknown> {
  return {
    context: invokeResult.context ?? {},
    execute: invokeResult.execute ?? {},
  };
}

async function callViaHttp(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('http://localhost:3000/api/v1/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, sync: true }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const wrapped = (await res.json()) as {
    success?: boolean;
    data?: { context?: unknown; execute?: unknown };
  };
  const data = wrapped.data;
  if (data && typeof data === 'object') {
    return {
      context: (data.context as Record<string, unknown>) ?? {},
      execute: (data.execute as Record<string, unknown>) ?? {},
    };
  }
  return wrapped as Record<string, unknown>;
}

let invokeFn: (typeof import('../../a2a-server/src/services/utils/invoke.service.js'))['invoke'] | null =
  null;

async function initInProcessInvoke(): Promise<void> {
  if (invokeFn) return;
  await import('../../a2a-server/src/config/index.js');
  const { actionRegistry } = await import('../../a2a-server/src/actions/action-registry.js');
  try {
    await actionRegistry.loadFromDirectory(path.join(REPO_ROOT, 'a2a-server/src/actions/definitions'));
  } catch {
    /* static router tail still works */
  }
  const mod = await import('../../a2a-server/src/services/utils/invoke.service.js');
  invokeFn = mod.invoke;
}

async function callInProcess(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  await initInProcessInvoke();
  const payload = inputToInvokePayload(input);
  const r = await invokeFn!('proba-servera', payload as Parameters<NonNullable<typeof invokeFn>>[1]);
  if (!r.sync && r.promiseId && r.execute === undefined) {
    throw new Error(
      `Async invoke only (promiseId=${r.promiseId}). Use sync-friendly case or set DEFAULT_SYNC_MODE=1 in .env`
    );
  }
  return normalizeInvokeResult(r);
}

async function runCase(caseDir: string): Promise<boolean | null> {
  const inputPath = path.join(caseDir, 'input.json');
  const expectedPath = path.join(caseDir, 'expected.json');
  const outputPath = path.join(caseDir, 'output.json');
  const reportPath = path.join(caseDir, 'error-report.md');

  if (!fs.existsSync(inputPath) || !fs.existsSync(expectedPath)) {
    console.warn(`⏭️  SKIP: ${path.basename(caseDir)} (missing input.json or expected.json)`);
    return null;
  }

  if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as Record<string, unknown>;
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

  let actual: Record<string, unknown>;
  try {
    const http =
      process.env.PROBA_SERVERA_USE_HTTP === '1' || process.env.PROBA_SERVERA_USE_HTTP === 'true';
    actual = http ? await callViaHttp(input) : await callInProcess(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Error for ${caseDir}: ${msg}`);
    fs.writeFileSync(
      reportPath,
      `# Test Failure Report: ${path.basename(caseDir)}\n\n## Error\n\n\`\`\`\n${msg}\n\`\`\`\n`
    );
    return false;
  }

  fs.writeFileSync(outputPath, JSON.stringify(actual, null, 2));

  const diffs = compareWithDiff(
    getKeyStructure(actual) as Record<string, unknown>,
    getKeyStructure(expected) as Record<string, unknown>
  );

  if (diffs.length === 0) {
    console.log(`✅ PASS: ${path.basename(caseDir)}`);
    return true;
  }

  console.log(`❌ FAIL: ${path.basename(caseDir)} (${diffs.length} differences)`);
  for (const d of diffs.slice(0, 5)) console.log(`   - ${d.path}: ${d.issue}`);
  if (diffs.length > 5) console.log(`   ... and ${diffs.length - 5} more`);
  console.log(`   📄 Full report: ${reportPath}`);
  fs.writeFileSync(reportPath, generateErrorReport(path.basename(caseDir), input, expected, actual, diffs));
  return false;
}

async function main() {
  /** Request storage + action-registry defaults resolve from a2a-server cwd */
  process.chdir(path.join(REPO_ROOT, 'a2a-server'));
  if (!(process.env.PROBA_SERVERA_USE_HTTP === '1' || process.env.PROBA_SERVERA_USE_HTTP === 'true')) {
    await initInProcessInvoke();
  }

  const testDir = __dirname;
  const cases = fs
    .readdirSync(testDir)
    .filter((f) => fs.statSync(path.join(testDir, f)).isDirectory());

  const results: { case: string; passed: boolean }[] = [];
  let allPass = true;

  for (const c of cases) {
    const passed = await runCase(path.join(testDir, c));
    if (passed === null) continue;
    results.push({ case: c, passed });
    if (!passed) allPass = false;
  }

  console.log('\n' + '='.repeat(50));
  if (results.length === 0) {
    console.log('No runnable cases (each needs input.json + expected.json).');
  } else if (allPass) {
    console.log(`✅ All cases passed (${results.length}).`);
  } else {
    const p = results.filter((r) => r.passed).length;
    const f = results.filter((r) => !r.passed).length;
    console.log(`❌ Some cases failed: ${p} passed, ${f} failed`);
    console.log('\nFailed cases have error-report.md files with full details.');
  }
  console.log('='.repeat(50));
  process.exit(allPass ? 0 : 1);
}

main();
