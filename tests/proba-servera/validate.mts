/**
 * Proba-servera: structure check vs expected.json — in-process invoke (no HTTP).
 * Loads a2a-server config + action registry; same path as POST /api/v1/invoke body.
 *
 * Matching: **subset** of keys — every key in expected must exist in actual; extra keys
 * (e.g. session_id, workbench) are ignored. Arrays: each element must match the template
 * object derived from expected[0].
 *
 * Optional top-level **`$proba`** in expected.json: `{ "ignorePaths": ["context.task", ...] }`
 * removes those paths from both clones before compare. If input has non-empty `context.history`,
 * expected must include `context.history` (unless `$proba.skipHistoryTemplate: true`).
 * `context.history` array length in expected must match actual (unless `$proba.skipHistoryLengthCheck`).
 * **`$proba.acceptExecuteFormFallback`** — if actual has `execute.form`, copy actual’s `execute` onto expected before compare (next-tool goldens vs Gray Room fallback UI).
 * **`$proba.ignoreExecuteWhenOutcomeFailed`** — if `outcome === 'failed'`, remove `execute` from both sides (hub error / no tool execute).
 * **`$proba.inputAbsentPaths`** — list of dot/bracket paths that must **not** exist in `input.json` (e.g. `["context.history"]`).
 *
 * **Directive objects** (leaf or nested): only `$`-prefixed keys, e.g. `{ "$regex": "^prefix", "$flags": "i" }`,
 * `{ "$type": "string" }`, `{ "$enum": ["a","b"] }`, `{ "$minLength": 1 }`. Normalized to placeholders for the
 * key-structure pass; checked precisely in `collectDirectiveErrors`.
 *
 * Optional: PROBA_SERVERA_USE_HTTP=1 → fetch http://localhost:3000/api/v1/invoke (legacy).
 * Stack gate (default): probes ai-integration + Ollama (+ a2a-server if HTTP mode).
 *   Skip: PROBA_SERVERA_SKIP_STACK_CHECK=1. Probe timeout: PROBA_STACK_PROBE_MS (ms) — not applied to promiseId poll loops.
 *   Single case: PROBA_SERVERA_ONLY=<folder-name> (e.g. script-select).
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

const PROBA_META_KEY = '$proba';

type ProbaMeta = {
  /** Dot/bracket paths removed from both clones before structure compare (e.g. `context.task`, `context.history[0].message`). */
  ignorePaths?: string[];
  /** When input has history but you intentionally omit `context.history` from expected (rare). */
  skipHistoryTemplate?: boolean;
  /** When true, do not require `actual.context.history.length === expected.context.history.length`. */
  skipHistoryLengthCheck?: boolean;
  /** Paths that must be absent from `input.json` (request body before invoke). */
  inputAbsentPaths?: string[];
  /** When actual `execute` is `{ form: ... }` (fallback), set expected `execute` to match actual before compare. */
  acceptExecuteFormFallback?: boolean;
  /** When `outcome === 'failed'`, strip `execute` from both clones before compare. */
  ignoreExecuteWhenOutcomeFailed?: boolean;
};

/** Object whose keys are all `$…` — treated as a precise-check directive, not a plain subtree. */
function isDirectiveObject(o: unknown): o is Record<string, unknown> {
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return false;
  const keys = Object.keys(o as Record<string, unknown>);
  return keys.length > 0 && keys.every((k) => k.startsWith('$'));
}

/**
 * Replace directive leaves with JSON placeholders so `getKeyStructure` matches actual shapes.
 */
function normalizeDirectivesForStructure(expected: unknown): unknown {
  if (expected === null || expected === undefined) return expected;
  if (isDirectiveObject(expected)) {
    return directiveToStructurePlaceholder(expected);
  }
  if (Array.isArray(expected)) {
    return expected.map((x) => normalizeDirectivesForStructure(x));
  }
  if (typeof expected === 'object') {
    const o = expected as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = normalizeDirectivesForStructure(o[k]);
    }
    return out;
  }
  return expected;
}

function directiveToStructurePlaceholder(d: Record<string, unknown>): unknown {
  const t = d['$type'];
  if (typeof t === 'string') {
    if (t === 'null') return null;
    if (t === 'array') return [];
    if (t === 'object') return {};
    if (t === 'number') return 0;
    if (t === 'boolean') return false;
    return 'string';
  }
  if ('$enum' in d && Array.isArray(d['$enum']) && d['$enum'].length > 0) {
    const first = d['$enum'][0];
    return typeof first === 'string' ? 'string' : typeof first === 'number' ? 0 : typeof first === 'boolean' ? false : first;
  }
  if ('$regex' in d || '$minLength' in d || '$maxLength' in d) {
    return 'string';
  }
  return 'string';
}

function typeofLabel(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function applyDirectiveChecks(actual: unknown, d: Record<string, unknown>, path: string): string[] {
  const errs: string[] = [];

  if ('$type' in d) {
    const t = d['$type'];
    if (typeof t === 'string') {
      if (t === 'null') {
        if (actual !== null) errs.push(`${path}: $type null expected, got ${typeofLabel(actual)}`);
      } else if (t === 'array') {
        if (!Array.isArray(actual)) errs.push(`${path}: $type array expected, got ${typeofLabel(actual)}`);
      } else if (t === 'object') {
        if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
          errs.push(`${path}: $type object expected, got ${typeofLabel(actual)}`);
        }
      } else if (typeof actual !== t) {
        errs.push(`${path}: $type ${t} expected, got ${typeofLabel(actual)}`);
      }
    }
  }

  if ('$enum' in d && Array.isArray(d['$enum'])) {
    const list = d['$enum'] as unknown[];
    if (!list.includes(actual)) {
      errs.push(`${path}: value ${JSON.stringify(actual)} not in $enum`);
    }
  }

  if ('$regex' in d && typeof d['$regex'] === 'string') {
    if (typeof actual !== 'string') {
      errs.push(`${path}: $regex requires string, got ${typeofLabel(actual)}`);
    } else {
      const flags = typeof d['$flags'] === 'string' ? d['$flags'] : '';
      try {
        if (!new RegExp(d['$regex'], flags).test(actual)) {
          errs.push(`${path}: string does not match /${d['$regex']}/${flags}`);
        }
      } catch {
        errs.push(`${path}: invalid $regex pattern`);
      }
    }
  }

  if (typeof actual === 'string') {
    if (typeof d['$minLength'] === 'number' && actual.length < d['$minLength']) {
      errs.push(`${path}: length ${actual.length} < $minLength ${d['$minLength']}`);
    }
    if (typeof d['$maxLength'] === 'number' && actual.length > d['$maxLength']) {
      errs.push(`${path}: length ${actual.length} > $maxLength ${d['$maxLength']}`);
    }
  }

  return errs;
}

/**
 * Walk `actual` vs raw `expected` and apply `$regex`, `$type`, `$enum`, length bounds.
 * Array length must match `expected` unless `$proba.skipHistoryLengthCheck` and path is `*.history`.
 */
function collectDirectiveErrors(
  actual: unknown,
  expected: unknown,
  basePath = '',
  meta?: ProbaMeta
): string[] {
  const errs: string[] = [];

  if (expected === null || expected === undefined) return errs;

  if (isDirectiveObject(expected)) {
    return applyDirectiveChecks(actual, expected, basePath || '(root)');
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      errs.push(`${basePath || '(root)'}: expected array, got ${typeofLabel(actual)}`);
      return errs;
    }
    const skipLen =
      meta?.skipHistoryLengthCheck &&
      (basePath === 'context.history' || basePath.endsWith('.history'));
    if (!skipLen && actual.length !== expected.length) {
      errs.push(
        `${basePath || '(root)'}: array length ${actual.length}, expected ${expected.length}`
      );
      return errs;
    }
    const len = skipLen ? Math.min(actual.length, expected.length) : expected.length;
    for (let i = 0; i < len; i++) {
      const p = basePath ? `${basePath}[${i}]` : `[${i}]`;
      errs.push(...collectDirectiveErrors(actual[i], expected[i], p, meta));
    }
    return errs;
  }

  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
      errs.push(`${basePath || '(root)'}: expected object, got ${typeofLabel(actual)}`);
      return errs;
    }
    const ex = expected as Record<string, unknown>;
    const ac = actual as Record<string, unknown>;
    for (const k of Object.keys(ex)) {
      const p = basePath ? `${basePath}.${k}` : k;
      errs.push(...collectDirectiveErrors(ac[k], ex[k], p, meta));
    }
    return errs;
  }

  return errs;
}

function cloneJson<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** `context.history[0].message` → segments */
function parsePathSegments(pathStr: string): Array<string | number> {
  const normalized = pathStr.replace(/\[(\d+)\]/g, '.$1');
  return normalized
    .split('.')
    .filter(Boolean)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

function deletePath(root: unknown, pathStr: string): void {
  const segs = parsePathSegments(pathStr);
  if (segs.length === 0) return;
  let cur: unknown = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i];
    if (cur === null || typeof cur !== 'object') return;
    cur = Array.isArray(cur) ? cur[s as number] : (cur as Record<string, unknown>)[s as string];
  }
  const last = segs[segs.length - 1];
  if (cur === null || typeof cur !== 'object') return;
  if (Array.isArray(cur)) {
    if (typeof last === 'number') cur.splice(last, 1);
  } else {
    delete (cur as Record<string, unknown>)[last as string];
  }
}

/** True if `pathStr` resolves to a defined value on `root` (empty array counts as present). */
function pathExists(root: unknown, pathStr: string): boolean {
  const segs = parsePathSegments(pathStr);
  if (segs.length === 0) return false;
  let cur: unknown = root;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (cur === null || typeof cur !== 'object') return false;
    if (Array.isArray(cur)) {
      const idx = typeof s === 'number' ? s : Number.NaN;
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
      cur = cur[idx];
    } else {
      const key = String(s);
      if (!(key in (cur as Record<string, unknown>))) return false;
      cur = (cur as Record<string, unknown>)[key];
    }
  }
  return true;
}

function assertInputAbsentPaths(
  input: Record<string, unknown>,
  paths: string[] | undefined
): string | null {
  if (!paths || paths.length === 0) return null;
  const found: string[] = [];
  for (const p of paths) {
    if (pathExists(input, p)) found.push(p);
  }
  if (found.length === 0) return null;
  return (
    `input.json must not contain path(s): ${found.map((x) => JSON.stringify(x)).join(', ')} ` +
    '(set in expected.json `$proba.inputAbsentPaths`).'
  );
}

function splitExpectedPayload(raw: unknown): {
  meta: ProbaMeta;
  body: Record<string, unknown>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { meta: {}, body: raw as Record<string, unknown> };
  }
  const o = raw as Record<string, unknown>;
  const body = { ...o };
  delete body[PROBA_META_KEY];
  let meta: ProbaMeta = {};
  const proba = o[PROBA_META_KEY];
  if (proba && typeof proba === 'object' && !Array.isArray(proba)) {
    const p = proba as Record<string, unknown>;
    if (Array.isArray(p.ignorePaths)) {
      meta.ignorePaths = (p.ignorePaths as unknown[]).filter((x) => typeof x === 'string') as string[];
    }
    if (p.skipHistoryTemplate === true) meta.skipHistoryTemplate = true;
    if (p.skipHistoryLengthCheck === true) meta.skipHistoryLengthCheck = true;
    if (Array.isArray(p.inputAbsentPaths)) {
      meta.inputAbsentPaths = (p.inputAbsentPaths as unknown[]).filter((x) => typeof x === 'string') as string[];
    }
    if (p.acceptExecuteFormFallback === true) meta.acceptExecuteFormFallback = true;
    if (p.ignoreExecuteWhenOutcomeFailed === true) meta.ignoreExecuteWhenOutcomeFailed = true;
  }
  return { meta, body };
}

function applyProbaExecuteRelaxations(
  actualFull: Record<string, unknown>,
  actualForCompare: Record<string, unknown>,
  expectedForCompare: Record<string, unknown>,
  meta: ProbaMeta
): void {
  if (meta.ignoreExecuteWhenOutcomeFailed && actualFull.outcome === 'failed') {
    deletePath(actualForCompare, 'execute');
    deletePath(expectedForCompare, 'execute');
    return;
  }
  if (
    meta.acceptExecuteFormFallback &&
    actualForCompare.execute &&
    typeof actualForCompare.execute === 'object' &&
    actualForCompare.execute !== null &&
    'form' in (actualForCompare.execute as object)
  ) {
    (expectedForCompare as Record<string, unknown>).execute = cloneJson(
      (actualForCompare as Record<string, unknown>).execute
    );
  }
}

/**
 * If the invoke payload already carries conversation state, expected.json must assert
 * `context.history` shape (unless `$proba.skipHistoryTemplate`).
 */
function assertExpectedHistoryWhenInputHasHistory(
  input: Record<string, unknown>,
  body: Record<string, unknown>,
  meta: ProbaMeta
): string | null {
  if (meta.skipHistoryTemplate) return null;
  const inCtx = input.context;
  if (!inCtx || typeof inCtx !== 'object' || Array.isArray(inCtx)) return null;
  const ih = (inCtx as Record<string, unknown>).history;
  if (!Array.isArray(ih) || ih.length === 0) return null;
  const exCtx = body.context;
  if (!exCtx || typeof exCtx !== 'object' || Array.isArray(exCtx)) {
    return (
      'expected.json must include context.history when input.json has non-empty context.history ' +
      '(or set $proba.skipHistoryTemplate: true).'
    );
  }
  const eh = (exCtx as Record<string, unknown>).history;
  if (!Array.isArray(eh) || eh.length === 0) {
    return (
      'expected.json must include non-empty context.history when input.json has non-empty context.history ' +
      '(or set $proba.skipHistoryTemplate: true).'
    );
  }
  return null;
}

/**
 * When the server echoes `context.task` and builds `context.history`, at least one
 * `role: user` entry must be present — otherwise the client sees assistant-only turns
 * with no record of the user message (regression: Gray Room / dialog pipeline).
 */
function assertHistoryHasUserWhenTaskPresent(actual: Record<string, unknown>): string | null {
  if (actual.outcome === 'failed') return null;
  const ctx = actual.context as Record<string, unknown> | undefined;
  if (!ctx) return null;
  const task = ctx.task;
  if (typeof task !== 'string' || !task.trim()) return null;
  const history = ctx.history;
  if (!Array.isArray(history) || history.length === 0) return null;
  const hasUser = history.some(
    (h) =>
      h &&
      typeof h === 'object' &&
      String((h as { role?: unknown }).role).toLowerCase() === 'user'
  );
  if (!hasUser) {
    return (
      'context.history is non-empty but has no role:user while context.task is set; ' +
      'user turns must appear in history.'
    );
  }
  return null;
}

function generateErrorReport(
  caseName: string,
  input: unknown,
  expectedCompared: unknown,
  actualCompared: unknown,
  actualFull: unknown,
  diffs: ReturnType<typeof compareWithDiff>,
  expectedRaw?: unknown
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
  report += `## Expected Structure (after $proba.ignorePaths)\n\n\`\`\`json\n${JSON.stringify(getKeyStructure(expectedCompared), null, 2)}\n\`\`\`\n\n`;
  report += `## Actual Structure (after $proba.ignorePaths)\n\n\`\`\`json\n${JSON.stringify(getKeyStructure(actualCompared), null, 2)}\n\`\`\`\n\n`;
  const fullExp = expectedRaw !== undefined ? expectedRaw : expectedCompared;
  report += `## Full Expected\n\n\`\`\`json\n${JSON.stringify(fullExp, null, 2)}\n\`\`\`\n\n`;
  report += `## Full Actual\n\n\`\`\`json\n${JSON.stringify(actualFull, null, 2)}\n\`\`\`\n`;
  return report;
}

/**
 * If `context.execution.step` is `tool_*`, the invoke must include a non-empty `result`
 * with one action-key outcome (golden `request.json` after the client ran the tool).
 * Common mistake: pasting `execute.*` / pending-tool shapes into `result`, or omitting `result`.
 */
function assertToolStepHasResult(input: Record<string, unknown>, caseDirName: string): string | null {
  const ctx = input.context;
  if (!ctx || typeof ctx !== 'object') return null;
  const exec = (ctx as Record<string, unknown>).execution;
  if (!exec || typeof exec !== 'object') return null;
  const step = (exec as Record<string, unknown>).step;
  if (typeof step !== 'string' || !step.startsWith('tool_')) return null;

  const r = input.result;
  if (!r || typeof r !== 'object' || Object.keys(r as object).length === 0) {
    return `${caseDirName}: context.execution.step is "${step}" but input.json has no non-empty top-level result (mirror golden simulations/sync/.../request.json for that step).`;
  }
  return null;
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
  const url = `http://localhost:3000/api/v1/requests/${encodeURIComponent(promiseId)}/result`;
  for (;;) {
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
  for (;;) {
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
  const expectedRaw = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const { meta: probaMeta, body: expectedBody } = splitExpectedPayload(expectedRaw);

  const toolStepErr = assertToolStepHasResult(input, path.basename(caseDir));
  if (toolStepErr) {
    console.log(`❌ FAIL: ${path.basename(caseDir)} (${toolStepErr})`);
    fs.writeFileSync(
      reportPath,
      `# Test Failure Report: ${path.basename(caseDir)}\n\n## Error\n\n${toolStepErr}\n`
    );
    return false;
  }

  const inputAbsentErr = assertInputAbsentPaths(input, probaMeta.inputAbsentPaths);
  if (inputAbsentErr) {
    console.log(`❌ FAIL: ${path.basename(caseDir)} (${inputAbsentErr})`);
    fs.writeFileSync(
      reportPath,
      `# Test Failure Report: ${path.basename(caseDir)}\n\n## Error\n\n${inputAbsentErr}\n`
    );
    return false;
  }

  const historyTemplateErr = assertExpectedHistoryWhenInputHasHistory(input, expectedBody, probaMeta);
  if (historyTemplateErr) {
    console.log(`❌ FAIL: ${path.basename(caseDir)} (${historyTemplateErr})`);
    fs.writeFileSync(
      reportPath,
      `# Test Failure Report: ${path.basename(caseDir)}\n\n## Error\n\n${historyTemplateErr}\n`
    );
    return false;
  }

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

  const actualForCompare = cloneJson(actual);
  const expectedForCompare = cloneJson(expectedBody);
  for (const p of probaMeta.ignorePaths ?? []) {
    deletePath(actualForCompare, p);
    deletePath(expectedForCompare, p);
  }

  applyProbaExecuteRelaxations(actual, actualForCompare, expectedForCompare, probaMeta);

  const directiveErrs = collectDirectiveErrors(actualForCompare, expectedForCompare, '', probaMeta);
  const expectedNormalized = normalizeDirectivesForStructure(cloneJson(expectedForCompare)) as Record<string, unknown>;

  const diffs = compareWithDiff(
    getKeyStructure(actualForCompare) as Record<string, unknown>,
    getKeyStructure(expectedNormalized) as Record<string, unknown>
  );

  /** Run even when structure mismatches — key-only compare does not catch assistant-only history. */
  const semanticErr = assertHistoryHasUserWhenTaskPresent(actual);

  const ok =
    diffs.length === 0 && directiveErrs.length === 0 && !semanticErr;

  if (ok) {
    console.log(`✅ PASS: ${path.basename(caseDir)}`);
    return true;
  }

  console.log(`❌ FAIL: ${path.basename(caseDir)}`);
  if (directiveErrs.length > 0) {
    console.log(`   - ${directiveErrs.length} directive check(s)`);
    for (const e of directiveErrs.slice(0, 8)) console.log(`   - ${e}`);
    if (directiveErrs.length > 8) console.log(`   ... and ${directiveErrs.length - 8} more`);
  }
  if (diffs.length > 0) {
    console.log(`   - ${diffs.length} structure difference(s)`);
    for (const d of diffs.slice(0, 5)) console.log(`   - ${d.path}: ${d.issue}`);
    if (diffs.length > 5) console.log(`   ... and ${diffs.length - 5} more`);
  }
  if (semanticErr) console.log(`   - semantic: ${semanticErr}`);
  console.log(`   📄 Full report: ${reportPath}`);
  let report = generateErrorReport(
    path.basename(caseDir),
    input,
    expectedNormalized,
    actualForCompare,
    actual,
    diffs,
    expectedRaw
  );
  if (directiveErrs.length > 0) {
    report += `\n## Directive checks\n\n${directiveErrs.map((e) => `- ${e}`).join('\n')}\n`;
  }
  if (semanticErr) {
    report += `\n## Semantic check\n\n${semanticErr}\n`;
  }
  fs.writeFileSync(reportPath, report);
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

  const testDir = path.join(__dirname);
  const only = (process.env.PROBA_SERVERA_ONLY || '').trim();
  let cases = fs
    .readdirSync(testDir)
    .filter((f) => fs.statSync(path.join(testDir, f)).isDirectory() && !f.startsWith('.'));
  if (only) {
    if (!cases.includes(only)) {
      console.error(`PROBA_SERVERA_ONLY=${JSON.stringify(only)} — no such case folder under ${testDir}`);
      process.exit(1);
    }
    cases = [only];
    console.log(`Running single case: ${only}\n`);
  }

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
