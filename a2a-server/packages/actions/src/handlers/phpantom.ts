/**
 * Action Handler: phpantom — ADR-PHPantom-Integration §15
 *
 * Invokes the `phpantom_lsp` binary (Rust CLI) as a PHP static-analysis skill.
 *
 * Supported execute keys (Action-Key Shape):
 *   { "execute": { "phpantom-analyze": { "path": "...", "severity": "warning" } } }
 *   { "execute": { "phpantom-fix":     { "path": "...", "rules": ["unused_import"] } } }
 *
 * The binary is resolved from (in priority order):
 *   1. `PHPANTOM_BIN` environment variable
 *   2. `.agentLOGIC/phpantom_lsp-main/target/release/phpantom_lsp` (repo-local)
 *   3. `phpantom_lsp` on PATH
 *
 * Characteristics (per spec):
 *   - Analysis ≤ 1 s on a full project
 *   - ~60 MB RAM (Rust binary)
 *   - Requires PHP to be installed for full class-resolution parsing
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import { logger } from '../../../utils/logger';

const execAsync = promisify(exec);

// ── Binary resolution ─────────────────────────────────────────────────────────

const REPO_LOCAL_BIN =
  '.agentLOGIC/phpantom_lsp-main/target/release/phpantom_lsp';

function resolvePhpantomBin(): string {
  // 1. Env override
  const envBin = process.env['PHPANTOM_BIN'];
  if (envBin) return envBin;
  // 2. Repo-local build
  if (fs.existsSync(REPO_LOCAL_BIN)) return REPO_LOCAL_BIN;
  // 3. PATH fallback
  return 'phpantom_lsp';
}

// ── Input / Output types ──────────────────────────────────────────────────────

export interface PhpantomAnalyzeInput {
  /** File or directory to analyse */
  path: string;
  /** Minimum severity to report: 'error' | 'warning' | 'info' | 'all' */
  severity?: string;
  /** Timeout in milliseconds (default: 10 000) */
  timeout?: number;
}

export interface PhpantomAnalyzeOutput {
  status: 'success' | 'found_issues' | 'error';
  report: string;
  path: string;
  severity: string;
}

export interface PhpantomFixInput {
  /** File or directory to fix */
  path: string;
  /** Rule identifiers to apply (e.g. ["unused_import", "undefined_class"]) */
  rules?: string[];
  /** Dry-run only — report changes without writing to disk */
  dryRun?: boolean;
  /** Timeout in milliseconds (default: 30 000) */
  timeout?: number;
}

export interface PhpantomFixOutput {
  status: 'success' | 'partial' | 'error';
  report: string;
  path: string;
  rulesApplied: string[];
  dryRun: boolean;
}

/** Shape of errors thrown by Node.js child_process when the process exits non-zero */
interface ExecError {
  stdout?: string;
  stderr?: string;
  message?: string;
  code?: number;
}

function toExecError(err: unknown): ExecError {
  return err as ExecError;
}

/**
 * Run `phpantom_lsp analyze` on the given path.
 */
export async function handlePhpantomAnalyze(
  input: PhpantomAnalyzeInput,
): Promise<PhpantomAnalyzeOutput> {
  const { path: targetPath, severity = 'all', timeout = 10_000 } = input;
  const bin = resolvePhpantomBin();

  const cmd = `${bin} analyze ${targetPath} --severity ${severity} --no-colour`;
  logger.info('[phpantom-analyze] Running', { cmd, targetPath, severity });

  try {
    const { stdout } = await execAsync(cmd, { timeout });
    return {
      status: 'success',
      report: stdout,
      path: targetPath,
      severity,
    };
  } catch (err) {
    // phpantom exits non-zero when issues are found — that is not a tool error
    const e = toExecError(err);
    const report = e.stdout ?? e.message ?? String(err);
    logger.info('[phpantom-analyze] Issues found or binary error', {
      exitCode: e.code,
    });
    return {
      status: e.stdout !== undefined ? 'found_issues' : 'error',
      report,
      path: targetPath,
      severity,
    };
  }
}

/**
 * Run `phpantom_lsp fix` on the given path with the specified rules.
 */
export async function handlePhpantomFix(
  input: PhpantomFixInput,
): Promise<PhpantomFixOutput> {
  const {
    path: targetPath,
    rules = [],
    dryRun = false,
    timeout = 30_000,
  } = input;
  const bin = resolvePhpantomBin();

  const rulesFlag = rules.length > 0 ? `--rules ${rules.join(',')}` : '';
  const dryRunFlag = dryRun ? '--dry-run' : '';
  const cmd = `${bin} fix ${targetPath} ${rulesFlag} ${dryRunFlag} --no-colour`.trim();

  logger.info('[phpantom-fix] Running', { cmd, targetPath, rules, dryRun });

  try {
    const { stdout } = await execAsync(cmd, { timeout });
    return {
      status: 'success',
      report: stdout,
      path: targetPath,
      rulesApplied: rules,
      dryRun,
    };
  } catch (err) {
    const e = toExecError(err);
    const report = e.stdout ?? e.message ?? String(err);
    logger.warn('[phpantom-fix] Fix command failed', { error: report });
    return {
      status: e.stdout !== undefined ? 'partial' : 'error',
      report,
      path: targetPath,
      rulesApplied: rules,
      dryRun,
    };
  }
}
