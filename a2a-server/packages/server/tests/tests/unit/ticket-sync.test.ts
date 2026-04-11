/**
 * TicketSync unit tests — ADR-0062: Tickets-as-Code (Strict Synchronization)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { TicketSync } from '../../src/services/core/ticket-sync';
import type { ExecutionPlan, Goal } from '../../src/services/core/goal-planner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-sync-test-'));
}

function makeSync(baseDir: string): TicketSync {
  return new TicketSync({ baseDir });
}

function makeGoal(id: string, status: Goal['status'] = 'pending'): Goal {
  return {
    id,
    description: `Goal ${id}`,
    success_criteria: ['criteria'],
    priority: 'high',
    dependencies: [],
    estimated_complexity: 3,
    status,
  };
}

function makePlan(sessionId = 'sess_test_001'): ExecutionPlan {
  const goals = [
    makeGoal('g1', 'pending'),
    makeGoal('g2', 'pending'),
    makeGoal('g3', 'pending'),
  ];
  return {
    session_id:        sessionId,
    root_goal:         'Build a premium UI component',
    sub_goals:         goals,
    critical_path:     ['g1', 'g2'],
    estimated_turns:   9,
    risk_factors:      ['High complexity in g2'],
    fallback_strategy: 'Escalate to WAITING_ON_HUMAN.',
  };
}

// Wait a tick so fire-and-forget writes can flush
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TicketSync', () => {
  let base: string;
  let sync: TicketSync;

  beforeEach(() => {
    base = tmpDir();
    sync = makeSync(base);
  });

  afterEach(async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await fs.promises.rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
        break;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOTEMPTY' && code !== 'EBUSY' && code !== 'EPERM') throw err;
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
      }
    }
    vi.clearAllMocks();
  });

  // ── Directory creation ─────────────────────────────────────────────────────

  describe('directory creation', () => {
    it('creates pending/, active/, and done/ on construction', () => {
      expect(fs.existsSync(path.join(base, 'pending'))).toBe(true);
      expect(fs.existsSync(path.join(base, 'active'))).toBe(true);
      expect(fs.existsSync(path.join(base, 'done'))).toBe(true);
    });
  });

  // ── writePlan() ────────────────────────────────────────────────────────────

  describe('writePlan()', () => {
    it('writes pending/{sessionId}.md', async () => {
      const plan = makePlan('sess_abc');
      sync.writePlan(plan);
      await tick();
      const file = path.join(base, 'pending', 'sess_abc.md');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('writes active/CURRENT_TICKET.md', async () => {
      sync.writePlan(makePlan());
      await tick();
      expect(fs.existsSync(path.join(base, 'active', 'CURRENT_TICKET.md'))).toBe(true);
    });

    it('CURRENT_TICKET.md contains the root goal', async () => {
      sync.writePlan(makePlan());
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('Build a premium UI component');
    });

    it('CURRENT_TICKET.md contains all sub-goal IDs', async () => {
      sync.writePlan(makePlan());
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('g1');
      expect(content).toContain('g2');
      expect(content).toContain('g3');
    });

    it('CURRENT_TICKET.md contains the critical path', async () => {
      sync.writePlan(makePlan());
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('g1 → g2');
    });

    it('replaces special characters in sessionId for filename', async () => {
      const plan = makePlan('sess:special/path');
      sync.writePlan(plan);
      await tick();
      const file = path.join(base, 'pending', 'sess_special_path.md');
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  // ── activateGoal() ─────────────────────────────────────────────────────────

  describe('activateGoal()', () => {
    it('returns a new plan with the goal status set to active', () => {
      const plan = makePlan();
      const updated = sync.activateGoal(plan, 'g2');
      const g = updated.sub_goals.find((x) => x.id === 'g2');
      expect(g?.status).toBe('active');
    });

    it('does not mutate the original plan', () => {
      const plan = makePlan();
      sync.activateGoal(plan, 'g1');
      expect(plan.sub_goals[0]?.status).toBe('pending');
    });

    it('updates CURRENT_TICKET.md with active emoji', async () => {
      const plan = makePlan();
      sync.activateGoal(plan, 'g1');
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('🔄 active');
    });
  });

  // ── completeGoal() ─────────────────────────────────────────────────────────

  describe('completeGoal()', () => {
    it('returns a new plan with the goal status set to done', () => {
      const plan = makePlan();
      const updated = sync.completeGoal(plan, 'g1');
      const g = updated.sub_goals.find((x) => x.id === 'g1');
      expect(g?.status).toBe('done');
    });

    it('does not mutate the original plan', () => {
      const plan = makePlan();
      sync.completeGoal(plan, 'g1');
      expect(plan.sub_goals[0]?.status).toBe('pending');
    });

    it('updates CURRENT_TICKET.md with done emoji', async () => {
      const plan = makePlan();
      sync.completeGoal(plan, 'g1');
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('✅ done');
    });
  });

  // ── completePlan() ─────────────────────────────────────────────────────────

  describe('completePlan()', () => {
    it('writes done/{sessionId}.md', async () => {
      const plan = makePlan('sess_finish');
      sync.writePlan(plan);
      sync.completePlan(plan);
      await tick();
      expect(fs.existsSync(path.join(base, 'done', 'sess_finish.md'))).toBe(true);
    });

    it('done file contains COMPLETED TICKET header', async () => {
      const plan = makePlan('sess_complete');
      sync.completePlan(plan);
      await tick();
      const content = fs.readFileSync(path.join(base, 'done', 'sess_complete.md'), 'utf8');
      expect(content).toContain('COMPLETED TICKET');
    });

    it('removes pending stub after completion', async () => {
      const plan = makePlan('sess_cleanup');
      sync.writePlan(plan);
      await tick();
      sync.completePlan(plan);
      await tick();
      expect(fs.existsSync(path.join(base, 'pending', 'sess_cleanup.md'))).toBe(false);
    });

    it('does not throw if pending stub does not exist', async () => {
      const plan = makePlan('sess_no_pending');
      expect(() => sync.completePlan(plan)).not.toThrow();
      await tick();
    });

    it('marks all non-failed sub-goals as done in the archived file', async () => {
      const plan = makePlan('sess_archive');
      sync.completePlan(plan);
      await tick();
      const content = fs.readFileSync(path.join(base, 'done', 'sess_archive.md'), 'utf8');
      // All three goals should be shown as done
      const doneCount = (content.match(/✅ done/g) ?? []).length;
      expect(doneCount).toBe(3);
    });
  });

  // ── resumeActivePlan() ────────────────────────────────────────────────────

  describe('resumeActivePlan()', () => {
    it('returns null when no CURRENT_TICKET.md exists', async () => {
      const result = await sync.resumeActivePlan();
      expect(result).toBeNull();
    });

    it('reconstructs session_id and root_goal from a written plan', async () => {
      const plan = makePlan('sess_resume');
      sync.writePlan(plan);
      await tick();
      const resumed = await sync.resumeActivePlan();
      expect(resumed).not.toBeNull();
      expect(resumed?.session_id).toBe('sess_resume');
      expect(resumed?.root_goal).toBe('Build a premium UI component');
    });

    it('reconstructs sub-goal IDs from a written plan', async () => {
      const plan = makePlan('sess_resume2');
      sync.writePlan(plan);
      await tick();
      const resumed = await sync.resumeActivePlan();
      const ids = resumed?.sub_goals.map((g) => g.id) ?? [];
      expect(ids).toContain('g1');
      expect(ids).toContain('g2');
      expect(ids).toContain('g3');
    });

    it('preserves goal statuses across a write → resume cycle', async () => {
      const plan = makePlan('sess_statuses');
      const p1 = sync.activateGoal(plan, 'g1');
      const p2 = sync.completeGoal(p1, 'g1');
      sync.writePlan(p2);
      await tick();
      const resumed = await sync.resumeActivePlan();
      const g1 = resumed?.sub_goals.find((g) => g.id === 'g1');
      expect(g1?.status).toBe('done');
    });

    it('returns null when CURRENT_TICKET.md is corrupted', async () => {
      fs.writeFileSync(
        path.join(base, 'active', 'CURRENT_TICKET.md'),
        'this is not a valid ticket format at all',
        'utf8',
      );
      const result = await sync.resumeActivePlan();
      expect(result).toBeNull();
    });

    it('reconstructs critical_path from the written plan', async () => {
      const plan = makePlan('sess_cp');
      sync.writePlan(plan);
      await tick();
      const resumed = await sync.resumeActivePlan();
      expect(resumed?.critical_path).toEqual(['g1', 'g2']);
    });

    it('reconstructs estimated_turns', async () => {
      const plan = makePlan('sess_turns');
      sync.writePlan(plan);
      await tick();
      const resumed = await sync.resumeActivePlan();
      expect(resumed?.estimated_turns).toBe(9);
    });
  });

  // ── GoalPlanner integration ────────────────────────────────────────────────

  describe('GoalPlanner integration', () => {
    it('writePlan is called by GoalPlanner.decompose() when ticketSync is provided', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store, sync);

      await planner.decompose('Build checkout page', { session_id: 'sess_gp_001' });
      await tick();

      expect(fs.existsSync(path.join(base, 'active', 'CURRENT_TICKET.md'))).toBe(true);
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('Build checkout page');
    });

    it('markGoalActive updates plan and writes active status', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store, sync);

      const plan    = makePlan('sess_gp_002');
      const updated = planner.markGoalActive(plan, 'g1');
      expect(updated.sub_goals.find((g) => g.id === 'g1')?.status).toBe('active');
      await tick();
      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('🔄 active');
    });

    it('markGoalDone updates plan and writes done status', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store, sync);

      const plan    = makePlan('sess_gp_003');
      const updated = planner.markGoalDone(plan, 'g2');
      expect(updated.sub_goals.find((g) => g.id === 'g2')?.status).toBe('done');
    });

    it('finalizePlan writes a done archive file', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store, sync);

      const plan = makePlan('sess_gp_fin');
      planner.finalizePlan(plan);
      await tick();
      expect(fs.existsSync(path.join(base, 'done', 'sess_gp_fin.md'))).toBe(true);
    });

    it('writePlan is called by GoalPlanner.replan() when ticketSync is provided', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store, sync);

      const plan    = await planner.decompose('Refactor auth module', { session_id: 'sess_gp_replan' });
      await tick();
      const failId  = plan.sub_goals[0]?.id ?? 'noop';
      await planner.replan(plan, failId, 'timed out');
      await tick();

      const content = fs.readFileSync(path.join(base, 'active', 'CURRENT_TICKET.md'), 'utf8');
      expect(content).toContain('Refactor auth module');
    });

    it('GoalPlanner methods work correctly without ticketSync (backward-compat)', async () => {
      const { ArtifactStore } = await import('../../src/services/core/artifact-store');
      const { GoalPlanner } = await import('../../src/services/core/goal-planner');

      const store   = new ArtifactStore();
      const planner = new GoalPlanner(store); // no ticketSync

      const plan    = makePlan('sess_no_sync');
      const updated = planner.markGoalActive(plan, 'g1');
      expect(updated.sub_goals.find((g) => g.id === 'g1')?.status).toBe('active');

      const done = planner.markGoalDone(updated, 'g1');
      expect(done.sub_goals.find((g) => g.id === 'g1')?.status).toBe('done');

      expect(() => planner.finalizePlan(plan)).not.toThrow();
    });
  });
});
