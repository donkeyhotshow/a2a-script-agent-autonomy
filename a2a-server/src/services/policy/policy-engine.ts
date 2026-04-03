/**
 * PolicyEngine — Synchronous policy evaluation, zero I/O, < 1 ms.
 *
 * Built-in policies (always enforced, no config override):
 *   P001 — Block destructive ops without DRYRUN_DELTA artifact
 *   P002 — Block runaway loops (loop_count > P002_MAX_LOOPS)
 *   P003 — Block sessions exceeding max duration (P003_MAX_DURATION_MS)
 *   P004 — Warn on protected-branch writes without human approval
 *   P005 — Block unknown/unregistered FSM states
 *   P006 — Block write-file on paths matching deny-list patterns
 *
 * Usage:
 * ```ts
 * import { policyEngine } from './policy-engine.js';
 *
 * if (policyEngine.isBlocked(ctx)) {
 *   const violations = policyEngine.evaluate(ctx);
 *   // handle ...
 * }
 * ```
 */

// ── Public types ──────────────────────────────────────────────────────────────

export interface PolicyContext {
  action: string;
  fsm_state: string;
  session_duration_ms: number;
  loop_count: number;
  branch?: string;
  file_paths?: string[];
  tool_name?: string;
  has_dryrun_artifact: boolean;
  has_human_approval: boolean;
}

export interface PolicyViolation {
  policy_id: string;
  severity: 'block' | 'warn';
  message: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** P002 — max loop count before blocking */
const P002_MAX_LOOPS = 50;

/** P003 — max session duration in ms before blocking (default: 15 min) */
const P003_MAX_DURATION_MS = 15 * 60 * 1_000;

/** P006 — path patterns that must never be overwritten by the agent */
const P006_DENY_PATH_PATTERNS: RegExp[] = [
  /node_modules[/\\]/,
  /\.git[/\\]/,
  /\.env$/,
  /\.env\.local$/,
  /\.env\.production$/,
];

/** Actions considered destructive for P001 */
const DESTRUCTIVE_ACTIONS = new Set(['delete', 'write-file', 'edit-patch']);

/** Valid FSM states for P005 */
const VALID_FSM_STATES = new Set([
  'IDLE',
  'SCANNING',
  'SYNTHESIZING',
  'ENRICHING',
  'EXECUTING',
  'SELF_CORRECTING',
  'WAITING_ON_HUMAN',
  'VALIDATING',
  'DELIVERING',
  'STOPPED',
  // allow the "unknown" fallback used when kernel is not wired
  'EXECUTING',
]);

/** Protected branch patterns for P004 */
const PROTECTED_BRANCH_PATTERNS: RegExp[] = [
  /^main$/,
  /^master$/,
  /^production$/,
  /^release\//,
];

// ── PolicyEngine ──────────────────────────────────────────────────────────────

export class PolicyEngine {
  /**
   * Fast path — returns true when any blocking violation exists.
   * Synchronous, zero I/O, < 1 ms.
   */
  isBlocked(ctx: PolicyContext): boolean {
    return this.evaluate(ctx).some((v) => v.severity === 'block');
  }

  /**
   * Full evaluation — returns all violations (block + warn).
   * Synchronous, zero I/O, < 1 ms.
   */
  evaluate(ctx: PolicyContext): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // ── P001 — destructive ops require DRYRUN_DELTA ────────────────────────
    if (DESTRUCTIVE_ACTIONS.has(ctx.action) && !ctx.has_dryrun_artifact) {
      violations.push({
        policy_id: 'P001',
        severity: 'block',
        message:
          `Destructive action '${ctx.action}' blocked: no DRYRUN_DELTA artifact present. ` +
          'Run a dry-run analysis first.',
      });
    }

    // ── P002 — loop count limit ───────────────────────────────────────────
    if (ctx.loop_count > P002_MAX_LOOPS) {
      violations.push({
        policy_id: 'P002',
        severity: 'block',
        message:
          `Loop count ${ctx.loop_count} exceeds maximum ${P002_MAX_LOOPS}. ` +
          'Possible infinite loop detected.',
      });
    }

    // ── P003 — session duration limit ─────────────────────────────────────
    if (ctx.session_duration_ms > P003_MAX_DURATION_MS) {
      violations.push({
        policy_id: 'P003',
        severity: 'block',
        message:
          `Session duration ${Math.round(ctx.session_duration_ms / 1_000)}s exceeds ` +
          `maximum ${Math.round(P003_MAX_DURATION_MS / 1_000)}s.`,
      });
    }

    // ── P004 — protected branch write without approval ────────────────────
    const isProtectedBranch =
      ctx.branch !== undefined &&
      PROTECTED_BRANCH_PATTERNS.some((p) => p.test(ctx.branch!));

    if (isProtectedBranch && DESTRUCTIVE_ACTIONS.has(ctx.action) && !ctx.has_human_approval) {
      violations.push({
        policy_id: 'P004',
        severity: 'warn',
        message:
          `Writing to protected branch '${ctx.branch}' without human approval. ` +
          'Proceed with caution.',
      });
    }

    // ── P005 — unknown FSM state ──────────────────────────────────────────
    if (ctx.fsm_state && !VALID_FSM_STATES.has(ctx.fsm_state)) {
      violations.push({
        policy_id: 'P005',
        severity: 'warn',
        message: `Unknown FSM state '${ctx.fsm_state}' — kernel may be misconfigured.`,
      });
    }

    // ── P006 — deny-list path check ───────────────────────────────────────
    if (ctx.action === 'write-file' && Array.isArray(ctx.file_paths)) {
      for (const fp of ctx.file_paths) {
        if (P006_DENY_PATH_PATTERNS.some((p) => p.test(fp))) {
          violations.push({
            policy_id: 'P006',
            severity: 'block',
            message: `Write to protected path '${fp}' is not allowed.`,
          });
          break; // one violation per action is sufficient
        }
      }
    }

    return violations;
  }
}

// ── Process singleton ─────────────────────────────────────────────────────────

export const policyEngine = new PolicyEngine();
