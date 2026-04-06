/**
 * Proba-servera: structure check vs expected.json — in-process invoke (no HTTP).
 * Loads a2a-server config + action registry; same path as POST /api/v1/invoke body.
 *
 * Matching: **subset** of keys — every key in expected must exist in actual; extra keys
 * (e.g. session_id, workbench) are ignored. Arrays: each element must match the template
 * object derived from expected[0].
 *
 * Optional: PROBA_SERVERA_USE_HTTP=1 → fetch http://localhost:3000/api/v1/invoke (legacy).
 * Stack gate (default): probes ai-integration + Ollama (+ a2a-server if HTTP mode).
 *   Skip: PROBA_SERVERA_SKIP_STACK_CHECK=1. Timeout: PROBA_STACK_PROBE_MS (ms).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const STACK_PROBE_MS = Number(process.env.PROBA_STACK_PROBE_MS || '4000') || 4000;

async function probeUrl(url: string, ms = STACK_PROBE_MS): Promise<boolean> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Proba-servera hits the real LLM chain (ai-integration → Ollama). If those are down,
 * results are meaningless noise — exit before running cases.
 * Opt out: PROBA_SERVERA_SKIP_STACK_CHECK=1
 */
async function assertProbaStackOrExit(): Promise<void> {
  if (
    process.env.PROBA_SERVERA_SKIP_STACK_CHECK === '1' ||
    process.env.PROBA_SERVERA_SKIP_STACK_CHECK === 'true'
  ) {
    return;
  }

  const aiHub = (process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
  const integrationHealth = `${aiHub}/health`;
  const ollamaTags = 'http://localhost:11435/api/tags';
  const a2aHealth = 'http://localhost:3000/health';
  const httpMode =
    process.env.PROBA_SERVERA_USE_HTTP === '1' || process.env.PROBA_SERVERA_USE_HTTP === 'true';

  const intOk = await probeUrl(integrationHealth);
  const ollamaOk = await probeUrl(ollamaTags);
  const serverOk = httpMode ? await probeUrl(a2aHealth) : true;

  if (intOk && ollamaOk && serverOk) {
    return;
  }

  const logServer = path.join(REPO_ROOT, 'a2a-server', 'logs', 'server.log');
  const logWeb = path.join(REPO_ROOT, 'a2a-client', 'logs', 'web-ui.log');
  const logClientApi = path.join(REPO_ROOT, 'a2a-client', 'logs', 'client-api.log');

  const lines = [
    '',
    'Proba-servera aborted: required services are not reachable.',
    `  ai-integration  ${integrationHealth}  →  ${intOk ? 'OK' : 'FAIL'}`,
    `  Ollama          ${ollamaTags}  →  ${ollamaOk ? 'OK' : 'FAIL'}`,
  ];
  if (httpMode) {
    lines.push(`  a2a-server      ${a2aHealth}  →  ${serverOk ? 'OK' : 'FAIL'}`);
  }
  lines.push(
    '',
    'Start the stack from repo root (cmd.exe):',
    '    start-all.bat',
    '',
    'If start-all.bat reported problems, inspect logs:',
    `    ${logServer}`,
    `    ${logWeb}`,
    `    ${logClientApi}`,
    '    ai-integration: separate console window titled "ai-integration" (uvicorn stdout)',
    '',
    'Skip this gate (CI / offline):  set PROBA_SERVERA_SKIP_STACK_CHECK=1',
    ''
  );
  console.error(lines.join('\n'));
  process.exit(2);
}

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
  outcome?: string;
  error?: string;
  message?: string;
  promiseId?: string;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    context: invokeResult.context ?? {},
  };
  // Include execute only if present (don't add empty execute for failed outcomes)
  if (invokeResult.execute && Object.keys(invokeResult.execute).length > 0) {
    result.execute = invokeResult.execute;
  }
  // Include outcome and error for failed/completed results
  if (invokeResult.outcome) {
    result.outcome = invokeResult.outcome;
  }
  if (invokeResult.error) {
    result.error = invokeResult.error;
  }
  return result;
}

async function pollHttpResult(promiseId: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 120_000;
  const url = `http://localhost:3000/api/v1/requests/${encodeURIComponent(promiseId)}/result`;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`HTTP poll timeout for ${promiseId}`);
    const res = await fetch(url);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 40));
      continue;
    }
    const wrapped = (await res.json()) as {
      success?: boolean;
      data?: Record<string, unknown>;
    };
    const data = wrapped.data;
    const st = data?.status;
    if (st === 'completed' || st === 'failed' || st === 'cancelled') {
      if (st === 'failed') {
        return normalizeInvokeResult({
          context: data?.context as Record<string, unknown>,
          outcome: 'failed',
          error: data?.error,
        });
      }
      return normalizeInvokeResult({
        context: data?.context as Record<string, unknown>,
        execute: data?.execute as Record<string, unknown>,
      });
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

async function callViaHttp(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('http://localhost:3000/api/v1/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const wrapped = (await res.json()) as {
    success?: boolean;
    data?: { promiseId?: string };
  };
  const pid = wrapped.data?.promiseId;
  if (!pid) throw new Error('No promiseId from HTTP invoke');
  return pollHttpResult(pid);
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

async function waitTerminalInProcess(promiseId: string): Promise<{
  status: string;
  result?: Record<string, unknown>;
  error?: unknown;
}> {
  const { requestService } = await import('../../a2a-server/src/services/core/request/request.service.js');
  const { processRequestByPromiseId } = await import(
    '../../a2a-server/src/services/core/request-processor/request-processor.service.js'
  );
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`In-process poll timeout for ${promiseId}`);
    const row = await requestService.getResult(promiseId);
    if (!row) {
      await new Promise((r) => setTimeout(r, 30));
      continue;
    }
    if (row.status === 'completed' || row.status === 'failed') {
      return { status: row.status, result: row.result as Record<string, unknown>, error: row.error };
    }
    if (row.status === 'pending') {
      await processRequestByPromiseId(promiseId);
    } else {
      await new Promise((r) => setTimeout(r, 30));
    }
  }
}

async function callInProcess(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  await initInProcessInvoke();
  const payload = inputToInvokePayload(input);
  const r = await invokeFn!('proba-servera', payload as Parameters<NonNullable<typeof invokeFn>>[1]);
  const pid = r.promiseId;
  if (!pid) throw new Error('invoke() returned no promiseId');
  const terminal = await waitTerminalInProcess(pid);
  const res = terminal.result ?? {};
  if (terminal.status === 'failed') {
    return normalizeInvokeResult({
      context: res.context as Record<string, unknown>,
      outcome: 'failed',
      error: terminal.error ?? res.error,
    });
  }
  return normalizeInvokeResult({
    context: res.context as Record<string, unknown>,
    execute: res.execute as Record<string, unknown>,
  });
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

function generateRegressionDoc(
  results: { case: string; passed: boolean }[],
  testDir: string
): string {
  const timestamp = new Date().toISOString();
  const failed = results.filter((r) => !r.passed);

  let doc = `# Proba-Servera Regression Report\n\n`;
  doc += `**Generated:** ${timestamp}\n\n`;
  doc += `## Summary\n\n`;
  doc += `- **Total Cases:** ${results.length}\n`;
  doc += `- **Passed:** ${results.filter((r) => r.passed).length}\n`;
  doc += `- **Failed:** ${failed.length}\n\n`;

  if (failed.length === 0) {
    doc += `✅ All cases passed. No regressions detected.\n\n`;
  } else {
    doc += `## Regressions Detected\n\n`;
    for (const r of failed) {
      const reportPath = path.join(testDir, r.case, 'error-report.md');
      doc += `### ${r.case}\n\n`;
      doc += `- **Status:** FAIL\n`;
      doc += `- **Report:** [${r.case}/error-report.md](${r.case}/error-report.md)\n\n`;
      if (fs.existsSync(reportPath)) {
        const content = fs.readFileSync(reportPath, 'utf8');
        const diffMatch = content.match(/## Differences[\s\S]*?(?=## Input|$)/);
        if (diffMatch) {
          doc += `**Differences:**\n\n${diffMatch[0].slice(0, 500)}${diffMatch[0].length > 500 ? '...' : ''}\n\n`;
        }
      }
    }

    doc += `## Schema Impact Analysis\n\n`;
    doc += `### Common Patterns\n\n`;
    doc += `When tests fail with 'missing-key' in \\\`execute\\\`:\n`;
    doc += `1. Server stopped returning expected action key (form, message, etc.)\n`;
    doc += `2. Server now returns empty \\\`execute: {}\\\` — usually means async processing failed\n`;
    doc += `3. Client should detect this and handle via promise polling, not \\\`execute.wait\\\`\n\n`;

    doc += `### Action Items\n\n`;
    doc += `- Check server transforms for the failing action\n`;
    doc += `- Verify LLM pipeline availability (Gray Room fallbacks)\n`;
    doc += `- Update expected.json if server behavior changed intentionally\n`;
    doc += `- If server now returns \\\`promiseId\\\` instead of sync response — test is async, needs different fixture\n\n`;
  }

  doc += `## Test Case Index\n\n`;
  doc += `| Case | Status | Description |\n`;
  doc += `|------|--------|-------------|\n`;
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const desc = getCaseDescription(r.case);
    doc += `| ${r.case} | ${status} | ${desc} |\n`;
  }

  return doc;
}

function getCaseDescription(caseName: string): string {
  const descriptions: Record<string, string> = {
    'router-new-task': 'Initial task → router with choices',
    'script-select': 'Router choice → scripted action pipeline',
    'dialog-select': 'Router choice → dialog mode init',
    'dialog-message': 'Dialog mode → user message',
    'agent-select': 'Router choice → agent mode init',
    'agent-tool-call': 'Agent mode → tool execution request',
  };
  return descriptions[caseName] || 'Server request/response validation';
}

async function main() {
  await assertProbaStackOrExit();

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

  // Generate regression document
  const regressionDoc = generateRegressionDoc(results, testDir);
  const regressionPath = path.join(testDir, 'REGRESSIONS.md');
  fs.writeFileSync(regressionPath, regressionDoc);

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
    console.log(`\n📊 Regression report: ${regressionPath}`);
  }
  console.log('='.repeat(50));
  process.exit(allPass ? 0 : 1);
}

main();
