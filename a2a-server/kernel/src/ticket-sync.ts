/**
 * TicketSync — ADR-0062: Tickets-as-Code (Strict Synchronization)
 *
 * Mirrors GoalPlanner state to the filesystem using a fire-and-forget
 * non-blocking write strategy.  Callers never await individual writes;
 * only `resumeActivePlan` requires an await (boot-time read).
 *
 * Directory layout (all relative to `baseDir`, default: `<repo-root>/tasks`):
 *
 *   tasks/
 *     pending/   — plans not yet started (written on decompose)
 *     active/    — live snapshots; CURRENT_TICKET.md always reflects latest state
 *     done/      — completed plans moved here when the root goal finishes
 *
 * Environment variable:
 *   TASKS_DIR — absolute path to the tasks directory
 *               (default: <process.cwd()>/tasks)
 */

import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../utils/logger.js';
import type { ExecutionPlan, Goal, GoalStatus } from './goal-planner.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface TicketSyncOptions {
  /** Absolute path to the tasks root directory. */
  baseDir?: string;
}

// ── Status emoji map ──────────────────────────────────────────────────────────

const STATUS_EMOJI: Record<GoalStatus, string> = {
  pending:  '⏳',
  active:   '🔄',
  blocked:  '🚫',
  done:     '✅',
  failed:   '❌',
};

// ── Default base directory ────────────────────────────────────────────────────

function defaultBaseDir(): string {
  return process.env['TASKS_DIR'] ?? path.join(process.cwd(), 'tasks');
}

// ── TicketSync ────────────────────────────────────────────────────────────────

export class TicketSync {
  private readonly baseDir: string;
  private readonly pendingDir: string;
  private readonly activeDir: string;
  private readonly doneDir: string;
  private readonly currentTicketPath: string;

  constructor(options: TicketSyncOptions = {}) {
    this.baseDir        = options.baseDir ?? defaultBaseDir();
    this.pendingDir     = path.join(this.baseDir, 'pending');
    this.activeDir      = path.join(this.baseDir, 'active');
    this.doneDir        = path.join(this.baseDir, 'done');
    this.currentTicketPath = path.join(this.activeDir, 'CURRENT_TICKET.md');
    this._ensureDirs();
  }

  // ── writePlan() ────────────────────────────────────────────────────────────

  /**
   * Write/overwrite the plan Markdown to both `tasks/pending/{sessionId}.md`
   * and `tasks/active/CURRENT_TICKET.md`.
   * Fire-and-forget: errors are logged and never thrown.
   */
  writePlan(plan: ExecutionPlan): void {
    const md = this._renderTicket(plan);
    const pendingFile = path.join(this.pendingDir, `${this._slug(plan.session_id)}.md`);
    this._writeAsync(pendingFile, md);
    this._writeAsync(this.currentTicketPath, md);
  }

  // ── activateGoal() ─────────────────────────────────────────────────────────

  /**
   * Update `CURRENT_TICKET.md` to reflect that `goalId` is now `active`.
   * Returns a new plan with the goal status mutated — the original is not
   * mutated so callers can chain freely.
   */
  activateGoal(plan: ExecutionPlan, goalId: string): ExecutionPlan {
    const updated = this._mutatePlan(plan, goalId, 'active');
    this._writeAsync(this.currentTicketPath, this._renderTicket(updated));
    return updated;
  }

  // ── completeGoal() ─────────────────────────────────────────────────────────

  /**
   * Update `CURRENT_TICKET.md` to reflect that `goalId` is now `done`.
   * Returns a new plan with the goal status mutated.
   */
  completeGoal(plan: ExecutionPlan, goalId: string): ExecutionPlan {
    const updated = this._mutatePlan(plan, goalId, 'done');
    this._writeAsync(this.currentTicketPath, this._renderTicket(updated));
    return updated;
  }

  // ── completePlan() ─────────────────────────────────────────────────────────

  /**
   * Mark the plan as fully complete:
   *  - Writes a final snapshot to `tasks/done/{sessionId}.md`
   *  - Overwrites `tasks/active/CURRENT_TICKET.md` with the done state
   *  - Removes `tasks/pending/{sessionId}.md` if it exists
   *
   * Fire-and-forget.
   */
  completePlan(plan: ExecutionPlan): void {
    const allDone: ExecutionPlan = {
      ...plan,
      sub_goals: plan.sub_goals.map((g) => ({
        ...g,
        status: g.status === 'failed' ? g.status : ('done' as GoalStatus),
      })),
    };
    const md = this._renderTicket(allDone, /* archived */ true);
    const doneFile = path.join(this.doneDir, `${this._slug(plan.session_id)}.md`);
    this._writeAsync(doneFile, md);
    this._writeAsync(this.currentTicketPath, md);
    // clean up pending stub
    const pendingFile = path.join(this.pendingDir, `${this._slug(plan.session_id)}.md`);
    this._unlinkAsync(pendingFile);
  }

  // ── resumeActivePlan() ─────────────────────────────────────────────────────

  /**
   * Boot-time read: parse `tasks/active/CURRENT_TICKET.md` and reconstruct
   * an `ExecutionPlan` for crash-resumption.
   *
   * Returns `null` if no active ticket exists or parsing fails.
   */
  async resumeActivePlan(): Promise<ExecutionPlan | null> {
    try {
      const raw = await fs.promises.readFile(this.currentTicketPath, 'utf8');
      return this._parseTicket(raw);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== 'ENOENT') {
        logger.warn('[ticket-sync] resumeActivePlan read failed', {
          path: this.currentTicketPath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return null;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _ensureDirs(): void {
    for (const dir of [this.pendingDir, this.activeDir, this.doneDir]) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        logger.warn(`[ticket-sync] Could not create directory ${dir}: ${String(err)}`);
      }
    }
  }

  private _slug(sessionId: string): string {
    // Replace characters unsafe for filenames
    return sessionId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  private _mutatePlan(plan: ExecutionPlan, goalId: string, status: GoalStatus): ExecutionPlan {
    return {
      ...plan,
      sub_goals: plan.sub_goals.map((g) =>
        g.id === goalId ? { ...g, status } : g,
      ),
    };
  }

  private _renderTicket(plan: ExecutionPlan, archived = false): string {
    const now = new Date().toISOString();
    const header = archived
      ? `# COMPLETED TICKET — ${plan.session_id}`
      : `# CURRENT TICKET — ${plan.session_id}`;

    const tableRows = plan.sub_goals
      .map(
        (g) =>
          `| \`${g.id}\` | ${STATUS_EMOJI[g.status]} ${g.status} | ${g.priority} | ${g.description.replace(/\|/g, '\\|')} |`,
      )
      .join('\n');

    const criticalPath = plan.critical_path.join(' → ');
    const risks = plan.risk_factors.length > 0
      ? plan.risk_factors.map((r) => `- ${r}`).join('\n')
      : '- None identified';

    return [
      header,
      '',
      `> Last updated: ${now}`,
      '',
      '## Goal',
      plan.root_goal,
      '',
      '## Sub-goals',
      '| ID | Status | Priority | Description |',
      '|----|--------|----------|-------------|',
      tableRows,
      '',
      '## Critical Path',
      criticalPath || '(none)',
      '',
      '## Risk Factors',
      risks,
      '',
      '## Fallback Strategy',
      plan.fallback_strategy,
      '',
      `## Estimated Turns`,
      String(plan.estimated_turns),
      '',
    ].join('\n');
  }

  private _parseTicket(md: string): ExecutionPlan | null {
    try {
      // Extract session_id from header line
      const headerMatch = md.match(/^#\s+(?:CURRENT|COMPLETED) TICKET\s+[—–-]\s+(.+)$/m);
      if (!headerMatch) return null;
      const session_id = headerMatch[1]?.trim() ?? 'unknown';

      // Extract root goal (line after "## Goal")
      const goalMatch = md.match(/^## Goal\s*\n([^\n#][^\n]*)/m);
      const root_goal = goalMatch?.[1]?.trim() ?? '';

      // Extract sub-goals from table rows
      const sub_goals: Goal[] = [];
      const rowRe = /^\|\s*`([^`]+)`\s*\|\s*[^\|]+\s(\w+)\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|$/gm;
      let match: RegExpExecArray | null;
      while ((match = rowRe.exec(md)) !== null) {
        sub_goals.push({
          id:                  match[1]?.trim() ?? '',
          status:              (match[2]?.trim() ?? 'pending') as GoalStatus,
          priority:            (match[3]?.trim() ?? 'medium') as Goal['priority'],
          description:         match[4]?.trim().replace(/\\\|/g, '|') ?? '',
          success_criteria:    [],
          dependencies:        [],
          estimated_complexity: 1,
        });
      }

      // Critical path
      const cpMatch = md.match(/^## Critical Path\s*\n([^\n#][^\n]*)/m);
      const critical_path = cpMatch?.[1]?.trim()
        ? cpMatch[1].split('→').map((s) => s.trim()).filter(Boolean)
        : [];

      // Estimated turns
      const turnsMatch = md.match(/^## Estimated Turns\s*\n(\d+)/m);
      const estimated_turns = turnsMatch ? parseInt(turnsMatch[1] ?? '0', 10) : 0;

      // Fallback strategy (everything between header and next ## or EOF)
      const fbMatch = md.match(/^## Fallback Strategy\s*\n([\s\S]*?)(?:^##|\z)/m);
      const fallback_strategy = fbMatch?.[1]?.trim() ?? '';

      return {
        session_id,
        root_goal,
        sub_goals,
        critical_path,
        estimated_turns,
        risk_factors: [],
        fallback_strategy,
      };
    } catch (err: unknown) {
      logger.warn('[ticket-sync] Failed to parse CURRENT_TICKET.md', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private _writeAsync(filePath: string, content: string): void {
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
        logger.warn(`[ticket-sync] Failed to write ${filePath}: ${String(err)}`);
      }
    });
  }

  private _unlinkAsync(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`[ticket-sync] Failed to remove ${filePath}: ${String(err)}`);
      }
    });
  }
}
