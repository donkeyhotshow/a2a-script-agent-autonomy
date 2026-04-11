/**
 * GoalPlanner — ADR-0061: Autonomous goal decomposition and replanning.
 *
 * Decomposes a high-level goal into 3–7 measurable sub-goals, identifies
 * the critical path, estimates turns, flags risk factors, and provides a
 * fallback strategy. When a sub-goal fails the planner re-routes around it
 * while preserving already-completed work.
 *
 * Writers:
 *   'goal-planner' for EXECUTION_PLAN artifacts.
 *   'goal-planner' for REPLAN_DECISION artifacts.
 *
 * Wiring: OrchestratorKernel calls replan() when SELF_CORRECTING is entered
 * after a sub-goal failure (see orchestrator-kernel.ts for event wiring).
 */

import { randomUUID } from 'node:crypto';
import { ArtifactStore, createArtifactWriteInput } from './artifact-store';
import { TicketSync } from './ticket-sync';

// ── Public types ──────────────────────────────────────────────────────────────

export type GoalStatus = 'pending' | 'active' | 'blocked' | 'done' | 'failed';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  description: string;
  success_criteria: string[];   // measurable, binary
  priority: GoalPriority;
  dependencies: string[];       // other goal IDs
  estimated_complexity: number; // 1–10
  status: GoalStatus;
}

export interface ExecutionPlan {
  session_id: string;
  root_goal: string;
  sub_goals: Goal[];
  critical_path: string[];      // ordered goal IDs
  estimated_turns: number;
  risk_factors: string[];
  fallback_strategy: string;
}

export interface ProgressReport {
  completion_pct: number;
  completed_goals: string[];
  blocked_goals: string[];
  estimated_turns_remaining: number;
}

// ── Context passed into decompose() ──────────────────────────────────────────

export interface PlanningContext {
  session_id?: string;
  turn_id?: string;
  /** Optional hint about domain or constraints */
  domain?: string;
  [key: string]: unknown;
}

// ── GoalPlanner ───────────────────────────────────────────────────────────────

const COMPONENT_ID = 'goal-planner';

export class GoalPlanner {
  constructor(
    private readonly artifactStore: ArtifactStore,
    private readonly ticketSync?: TicketSync,
  ) {
    artifactStore.registerWriter('EXECUTION_PLAN', COMPONENT_ID);
    artifactStore.registerWriter('REPLAN_DECISION', COMPONENT_ID);
  }

  // ── decompose() ────────────────────────────────────────────────────────────

  /**
   * Decompose a root goal into 3–7 sub-goals, identify the critical path,
   * estimate turns, and produce a fallback strategy.
   * Emits an EXECUTION_PLAN artifact.
   */
  async decompose(goal: string, context: PlanningContext): Promise<ExecutionPlan> {
    const sessionId = context.session_id ?? 'unknown';
    const turnId = context.turn_id ?? randomUUID();
    const domain = context.domain ?? 'general';

    const subGoals = this._generateSubGoals(goal, domain);
    const criticalPath = this._computeCriticalPath(subGoals);
    const estimatedTurns = subGoals.reduce(
      (sum, g) => sum + g.estimated_complexity,
      0,
    );
    const riskFactors = this._identifyRisks(subGoals);
    const fallbackStrategy = this._buildFallbackStrategy(goal, criticalPath, subGoals);

    const plan: ExecutionPlan = {
      session_id: sessionId,
      root_goal: goal,
      sub_goals: subGoals,
      critical_path: criticalPath,
      estimated_turns: estimatedTurns,
      risk_factors: riskFactors,
      fallback_strategy: fallbackStrategy,
    };

    const artifactId = `exec-plan-${randomUUID()}`;
    await this.artifactStore.write(
      createArtifactWriteInput({
        artifact_id: artifactId,
        artifact_type: 'EXECUTION_PLAN',
        session_id: sessionId,
        turn_id: turnId,
        schema_version: '1.0',
        summary: `Execution plan for: ${goal.slice(0, 80)} (${subGoals.length} sub-goals, ${criticalPath.length} critical)`,
        data: plan as unknown as Record<string, unknown>,
      }),
      COMPONENT_ID,
    );

    this.ticketSync?.writePlan(plan);
    return plan;
  }

  // ── replan() ───────────────────────────────────────────────────────────────

  /**
   * Called when a sub-goal fails. Preserves completed goals, marks the failed
   * one, and generates a new path that avoids the failure mode.
   * Emits a REPLAN_DECISION artifact.
   * Intended to be triggered from OrchestratorKernel's SELF_CORRECTING state.
   */
  async replan(
    plan: ExecutionPlan,
    failedGoalId: string,
    reason: string,
  ): Promise<ExecutionPlan> {
    const sessionId = plan.session_id;
    const turnId = randomUUID();

    // Mark the failed goal
    const updatedSubGoals: Goal[] = plan.sub_goals.map((g) => {
      if (g.id === failedGoalId) {
        return { ...g, status: 'failed' as GoalStatus };
      }
      return g;
    });

    // Unblock goals that were only blocked because of the now-failed goal
    // and create alternative paths around the failure
    const repairedGoals = this._repairAfterFailure(
      updatedSubGoals,
      failedGoalId,
      reason,
    );

    const newCriticalPath = this._computeCriticalPath(
      repairedGoals.filter((g) => g.status !== 'failed'),
    );

    const estimatedTurns = repairedGoals
      .filter((g) => g.status === 'pending' || g.status === 'active')
      .reduce((sum, g) => sum + g.estimated_complexity, 0);

    const newPlan: ExecutionPlan = {
      session_id: sessionId,
      root_goal: plan.root_goal,
      sub_goals: repairedGoals,
      critical_path: newCriticalPath,
      estimated_turns: estimatedTurns,
      risk_factors: [
        ...plan.risk_factors,
        `Sub-goal '${failedGoalId}' failed: ${reason}`,
      ],
      fallback_strategy: this._buildFallbackStrategy(
        plan.root_goal,
        newCriticalPath,
        repairedGoals,
      ),
    };

    const artifactId = `replan-${randomUUID()}`;
    await this.artifactStore.write(
      createArtifactWriteInput({
        artifact_id: artifactId,
        artifact_type: 'REPLAN_DECISION',
        session_id: sessionId,
        turn_id: turnId,
        schema_version: '1.0',
        summary: `Replan after failure of '${failedGoalId}': ${reason.slice(0, 60)}`,
        data: {
          previous_plan_root: plan.root_goal,
          failed_goal_id: failedGoalId,
          failure_reason: reason,
          new_plan: newPlan as unknown as Record<string, unknown>,
        },
      }),
      COMPONENT_ID,
    );

    this.ticketSync?.writePlan(newPlan);
    return newPlan;
  }

  // ── markGoalActive() ───────────────────────────────────────────────────────

  /**
   * Signal that a specific sub-goal has started executing.
   * Updates `tasks/active/CURRENT_TICKET.md` via TicketSync (fire-and-forget).
   * Returns a new plan with the goal status updated to 'active'.
   */
  markGoalActive(plan: ExecutionPlan, goalId: string): ExecutionPlan {
    if (this.ticketSync) {
      return this.ticketSync.activateGoal(plan, goalId);
    }
    return {
      ...plan,
      sub_goals: plan.sub_goals.map((g) =>
        g.id === goalId ? { ...g, status: 'active' as GoalStatus } : g,
      ),
    };
  }

  // ── markGoalDone() ─────────────────────────────────────────────────────────

  /**
   * Signal that a specific sub-goal has completed successfully.
   * Updates `tasks/active/CURRENT_TICKET.md` via TicketSync (fire-and-forget).
   * Returns a new plan with the goal status updated to 'done'.
   */
  markGoalDone(plan: ExecutionPlan, goalId: string): ExecutionPlan {
    if (this.ticketSync) {
      return this.ticketSync.completeGoal(plan, goalId);
    }
    return {
      ...plan,
      sub_goals: plan.sub_goals.map((g) =>
        g.id === goalId ? { ...g, status: 'done' as GoalStatus } : g,
      ),
    };
  }

  // ── finalizePlan() ─────────────────────────────────────────────────────────

  /**
   * Mark the entire plan as complete: moves the active ticket to `tasks/done/`
   * and archives `CURRENT_TICKET.md`. Fire-and-forget.
   */
  finalizePlan(plan: ExecutionPlan): void {
    this.ticketSync?.completePlan(plan);
  }

  // ── assessProgress() ───────────────────────────────────────────────────────

  /**
   * Compute completion percentage, list blocked goals, and estimate remaining turns.
   */
  assessProgress(plan: ExecutionPlan, completedGoalIds: string[]): ProgressReport {
    const total = plan.sub_goals.length;
    if (total === 0) {
      return {
        completion_pct: 100,
        completed_goals: [],
        blocked_goals: [],
        estimated_turns_remaining: 0,
      };
    }

    // Mark completed
    const completedSet = new Set(completedGoalIds);
    const blockedGoals = plan.sub_goals
      .filter((g) => {
        if (g.status === 'done' || completedSet.has(g.id)) return false;
        return g.dependencies.some((d) => {
          const dep = plan.sub_goals.find((s) => s.id === d);
          return dep && dep.status === 'failed';
        });
      })
      .map((g) => g.id);

    const completedCount = plan.sub_goals.filter(
      (g) => g.status === 'done' || completedSet.has(g.id),
    ).length;

    const remainingComplexity = plan.sub_goals
      .filter((g) => g.status !== 'done' && g.status !== 'failed' && !completedSet.has(g.id))
      .reduce((sum, g) => sum + g.estimated_complexity, 0);

    return {
      completion_pct: Math.round((completedCount / total) * 100),
      completed_goals: completedGoalIds,
      blocked_goals: blockedGoals,
      estimated_turns_remaining: remainingComplexity,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _generateSubGoals(goal: string, domain: string): Goal[] {
    // Produce 5 sub-goals by decomposing the goal into SMART phases.
    // In production the LLM fills this; here we produce a structured scaffold
    // that the LLM can override via the prompt layer.
    const phases: Array<{
      suffix: string;
      criteria: string[];
      priority: GoalPriority;
      complexity: number;
    }> = [
      {
        suffix: 'Clarify requirements and acceptance criteria',
        criteria: [
          'All ambiguous terms are defined in writing.',
          'Success criteria reviewed and approved.',
        ],
        priority: 'critical',
        complexity: 2,
      },
      {
        suffix: 'Gather evidence and analyse current state',
        criteria: [
          'At least one REASONING_CHAIN artifact emitted.',
          'Evidence artifacts cited in reasoning steps.',
        ],
        priority: 'high',
        complexity: 3,
      },
      {
        suffix: 'Design solution approach',
        criteria: [
          'At least two alternatives documented.',
          'Chosen approach justified by evidence.',
        ],
        priority: 'high',
        complexity: 3,
      },
      {
        suffix: `Implement solution for: ${goal.slice(0, 50)}`,
        criteria: [
          'Implementation matches accepted design.',
          'No regression in existing behaviour.',
        ],
        priority: 'critical',
        complexity: 5,
      },
      {
        suffix: 'Validate and close',
        criteria: [
          'All success criteria from sub-goal 1 pass.',
          'EXECUTION_PLAN artifact updated to done.',
        ],
        priority: 'high',
        complexity: 2,
      },
    ];

    const ids = phases.map(() => `goal-${randomUUID().slice(0, 8)}`);

    return phases.map((p, i) => ({
      id: ids[i] ?? `goal-${i}`,
      description: `[${domain}] ${p.suffix}`,
      success_criteria: p.criteria,
      priority: p.priority,
      dependencies: i === 0 ? [] : [ids[i - 1] ?? ''],
      estimated_complexity: p.complexity,
      status: 'pending',
    }));
  }

  private _computeCriticalPath(goals: Goal[]): string[] {
    // Linear chain: critical-priority goals in dependency order
    const criticalGoals = goals.filter((g) => g.priority === 'critical');
    const ordered: Goal[] = [];
    const visited = new Set<string>();

    const visit = (g: Goal) => {
      if (visited.has(g.id)) return;
      visited.add(g.id);
      for (const depId of g.dependencies) {
        const dep = goals.find((x) => x.id === depId);
        if (dep) visit(dep);
      }
      ordered.push(g);
    };

    for (const g of criticalGoals) visit(g);

    // If no critical goals, include all in order
    if (ordered.length === 0) {
      return goals.map((g) => g.id);
    }

    return ordered.map((g) => g.id);
  }

  private _identifyRisks(goals: Goal[]): string[] {
    const risks: string[] = [];

    const highComplexity = goals.filter((g) => g.estimated_complexity >= 7);
    if (highComplexity.length > 0) {
      risks.push(
        `High-complexity sub-goals (≥7): ${highComplexity.map((g) => g.id).join(', ')}`,
      );
    }

    const criticalCount = goals.filter((g) => g.priority === 'critical').length;
    if (criticalCount > 3) {
      risks.push(`Too many critical sub-goals (${criticalCount}) increases failure surface.`);
    }

    const longChain = goals.filter((g) => g.dependencies.length > 2);
    if (longChain.length > 0) {
      risks.push(
        `Deep dependency chains detected in: ${longChain.map((g) => g.id).join(', ')}`,
      );
    }

    return risks;
  }

  private _buildFallbackStrategy(
    rootGoal: string,
    criticalPath: string[],
    goals: Goal[],
  ): string {
    const nonCritical = goals
      .filter((g) => !criticalPath.includes(g.id))
      .map((g) => g.id);

    if (nonCritical.length > 0) {
      return (
        `If any critical-path goal (${criticalPath.join(' → ')}) fails, ` +
        `attempt partial delivery by completing non-critical goals (${nonCritical.join(', ')}) ` +
        `and escalate the blocker to WAITING_ON_HUMAN for root goal: "${rootGoal}".`
      );
    }

    return (
      `All sub-goals are on the critical path for "${rootGoal}". ` +
      `On failure, pause execution, emit REPLAN_DECISION, and escalate to WAITING_ON_HUMAN.`
    );
  }

  private _repairAfterFailure(
    goals: Goal[],
    failedGoalId: string,
    reason: string,
  ): Goal[] {
    return goals.map((g) => {
      // Already failed — keep
      if (g.id === failedGoalId) return g;

      // If directly depending on the failed goal, mark blocked and add a note
      if (g.dependencies.includes(failedGoalId) && g.status === 'pending') {
        return {
          ...g,
          status: 'blocked' as GoalStatus,
          description: `${g.description} [BLOCKED — dependency '${failedGoalId}' failed: ${reason.slice(0, 40)}]`,
        };
      }

      return g;
    });
  }
}
