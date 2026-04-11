/**
 * PolicyEngine — Synchronous policy evaluation, zero I/O, < 1 ms.
 *
 * Built-in policies (always enforced, no config override):
 *   P001 — Block destructive ops without DRYRUN_DELTA artifact
 *   P002 — Block execution on protected branch (main/master/production/prod)
 *   P003 — Block when loop count exceeds 15
 *   P004 — Block external_api_call without human approval
 *   P005 — Warn when session exceeds 30 minutes
 *
 * Configurable (warn-level only) policies are loaded once at module init
 * from `a2a-server/config/policies.json` (defaults to [] if missing).
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

import { readFileSync } from 'node:fs';
import { logger } from "@a2a/server-utils/logger.js"';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  createArtifactWriteInput,
  globalArtifactStore,
} from '../core/artifact-store.js';

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

/** Shape of an entry in config/policies.json */
interface ConfigurablePolicy {
  policy_id: string;
  /** Only 'warn' is allowed for user-defined policies */
  severity: 'warn';
  message: string;
  description?: string;
  /** Actions this policy applies to (empty/absent = all actions) */
  actions?: string[];
  /** Emit when loop_count exceeds this value */
  max_loop_count?: number;
  /** Emit when session_duration_ms exceeds this value (ms) */
  max_session_ms?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** P001 — actions considered destructive */
const DESTRUCTIVE_ACTIONS = new Set(['delete', 'write-file', 'edit-patch']);

/** P002 — protected branch names (exact match) */
const PROTECTED_BRANCHES = new Set(['main', 'master', 'production', 'prod']);

/** P003 — maximum autonomous loop count */
const P003_MAX_LOOPS = 15;

/** P004 — action gated on human approval */
const P004_GATED_ACTION = 'external_api_call';

/** P005 — session duration warning threshold (30 minutes) */
const P005_WARN_SESSION_MS = 30 * 60 * 1_000;

// ── Load configurable policies ────────────────────────────────────────────────

function loadConfigurablePolicies(): ConfigurablePolicy[] {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    // Walk up: services/policy → services → src → a2a-server → config/
    const configPath = join(__dirname, '..', '..', '..', 'config', 'policies.json');
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is ConfigurablePolicy =>
        typeof p === 'object' &&
        p !== null &&
        'policy_id' in (p as object) &&
        'message' in (p as object),
    );
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') {
      logger.warn('[PolicyEngine] Failed to load config/policies.json', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return [];
  }
}

/** Configurable policies loaded once at module init (no hot-reload). */
const CONFIGURABLE_POLICIES: ConfigurablePolicy[] = loadConfigurablePolicies();

// ── PolicyEngine ──────────────────────────────────────────────────────────────

export class PolicyEngine {
  /**
   * Fast path — returns true when any blocking violation exists.
   * Synchronous, zero I/O, < 1 ms.
   */
  isBlocked(ctx: PolicyContext, sessionId?: string): boolean {
    const violations = this.evaluate(ctx);
    const blocked = violations.find((v) => v.severity === 'block');
    
    if (blocked && sessionId) {
      void globalArtifactStore.write(
        createArtifactWriteInput({
          artifact_id: `policy-violation-${blocked.policy_id}-${Date.now()}`,
          artifact_type: 'POLICY_VIOLATION',
          session_id: sessionId,
          turn_id: 'policy-check',
          schema_version: '1.0',
          severity: 'critical',
          summary: `Policy ${blocked.policy_id} blocked action: ${blocked.message}`,
          data: {
            policy_id: blocked.policy_id,
            message: blocked.message,
            context: ctx as unknown as Record<string, unknown>,
          },
        }),
        'PolicyEngine',
      );
    }
    
    return !!blocked;
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
        message: 'Destructive action requires prior dry-run artifact',
      });
    }

    // ── P002 — block execution on protected branch ─────────────────────────
    if (ctx.branch !== undefined && PROTECTED_BRANCHES.has(ctx.branch)) {
      violations.push({
        policy_id: 'P002',
        severity: 'block',
        message: 'Direct execution on protected branch is forbidden',
      });
    }

    // ── P003 — loop count exceeded ────────────────────────────────────────
    if (ctx.loop_count > P003_MAX_LOOPS) {
      violations.push({
        policy_id: 'P003',
        severity: 'block',
        message: 'Maximum autonomous loop count (15) exceeded',
      });
    }

    // ── P004 — external API without human approval ─────────────────────────
    if (ctx.action === P004_GATED_ACTION && !ctx.has_human_approval) {
      violations.push({
        policy_id: 'P004',
        severity: 'block',
        message: 'External API calls require human approval',
      });
    }

    // ── P005 — warn: long-running session ─────────────────────────────────
    if (ctx.session_duration_ms > P005_WARN_SESSION_MS) {
      violations.push({
        policy_id: 'P005',
        severity: 'warn',
        message: 'Session running over 30 minutes',
      });
    }

    // ── Configurable (warn-only) policies ─────────────────────────────────
    for (const policy of CONFIGURABLE_POLICIES) {
      let triggered = false;

      if (
        policy.max_loop_count !== undefined &&
        ctx.loop_count > policy.max_loop_count
      ) {
        triggered = true;
      } else if (
        policy.max_session_ms !== undefined &&
        ctx.session_duration_ms > policy.max_session_ms
      ) {
        triggered = true;
      } else if (
        Array.isArray(policy.actions) &&
        policy.actions.length > 0 &&
        policy.actions.includes(ctx.action)
      ) {
        triggered = true;
      }

      if (triggered) {
        violations.push({
          policy_id: policy.policy_id,
          severity: 'warn',
          message: policy.message,
        });
      }
    }

    return violations;
  }
}

// ── Process singleton ─────────────────────────────────────────────────────────

export const policyEngine = new PolicyEngine();
