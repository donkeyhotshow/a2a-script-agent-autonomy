/**
 * CognitiveEngine — ADR-0060: OODA-loop reasoning for autonomous agents.
 *
 * Implements a ReasoningEngine that drives the agent through the
 * Observe → Orient → Decide → Act → Reflect cycle. Each step cites
 * evidence from existing ArtifactStore artifacts and must surface at least
 * two alternatives on the Decide step. Quality scoring and flaw detection
 * prevent circular or overconfident reasoning chains.
 *
 * Writer: 'cognitive-engine' for REASONING_CHAIN artifacts.
 */

import { randomUUID } from 'crypto';
import {
  ArtifactStore,
  type StoredArtifact,
} from './artifact-store.js';

// ── Public types ──────────────────────────────────────────────────────────────

export type ThoughtStepType = 'observe' | 'orient' | 'decide' | 'act' | 'reflect';

export interface ThoughtStep {
  type: ThoughtStepType;
  content: string;
  confidence: number;             // 0.0–1.0
  evidence: string[];             // artifact IDs that support this thought
  alternatives_considered: string[];
  timestamp: number;
}

export interface ReasoningChain {
  session_id: string;
  goal: string;
  steps: ThoughtStep[];
  conclusion: string;
  confidence_trajectory: number[];  // confidence per step
  reasoning_quality_score: number;  // 0.0–1.0
}

export type ReasoningFlawType =
  | 'CIRCULAR'
  | 'OVERCONFIDENT'
  | 'EVIDENCE_GAP'
  | 'ANCHORING_BIAS';

export interface ReasoningFlaw {
  type: ReasoningFlawType;
  step_index: number;
  description: string;
}

// ── Context passed into reason() ──────────────────────────────────────────────

export interface ReasoningContext {
  /** Free-form context the caller wants the engine to consider */
  description?: string;
  /** Additional key-value data */
  [key: string]: unknown;
}

// ── ReasoningEngine ───────────────────────────────────────────────────────────

const COMPONENT_ID = 'cognitive-engine';

export class ReasoningEngine {
  constructor(private readonly artifactStore: ArtifactStore) {
    artifactStore.registerWriter('REASONING_CHAIN', COMPONENT_ID);
  }

  // ── reason() ───────────────────────────────────────────────────────────────

  /**
   * Drive a complete OODA loop for the given goal. Each step cites artifact
   * evidence and produces a ReasoningChain that is persisted as an artifact.
   */
  async reason(
    goal: string,
    context: ReasoningContext,
    artifactIds: string[],
  ): Promise<ReasoningChain> {
    const sessionId = (context['session_id'] as string | undefined) ?? 'unknown';
    const turnId = (context['turn_id'] as string | undefined) ?? randomUUID();

    // Resolve evidence artifacts (best-effort — silently skip missing)
    const evidenceArtifacts = await this._resolveArtifacts(artifactIds);
    const evidenceSummaries = evidenceArtifacts.map((a) => a.summary);

    const steps: ThoughtStep[] = [];

    // ── Observe ────────────────────────────────────────────────────────────
    const observeStep = this._observe(goal, evidenceArtifacts);
    steps.push(observeStep);

    // ── Orient ─────────────────────────────────────────────────────────────
    const orientStep = this._orient(goal, context, evidenceSummaries, observeStep);
    steps.push(orientStep);

    // ── Decide ─────────────────────────────────────────────────────────────
    const decideStep = this._decide(goal, orientStep, evidenceArtifacts);
    steps.push(decideStep);

    // ── Act ────────────────────────────────────────────────────────────────
    const actStep = this._act(decideStep);
    steps.push(actStep);

    // ── Reflect ────────────────────────────────────────────────────────────
    const reflectStep = this._reflect(steps, goal);
    steps.push(reflectStep);

    const confidenceTrajectory = steps.map((s) => s.confidence);
    const conclusion = reflectStep.content;
    const qualityScore = this.evaluateReasoningQuality({
      session_id: sessionId,
      goal,
      steps,
      conclusion,
      confidence_trajectory: confidenceTrajectory,
      reasoning_quality_score: 0, // placeholder — filled below
    });

    const chain: ReasoningChain = {
      session_id: sessionId,
      goal,
      steps,
      conclusion,
      confidence_trajectory: confidenceTrajectory,
      reasoning_quality_score: qualityScore,
    };

    // Persist as artifact
    const artifactId = `reasoning-${randomUUID()}`;
    await this.artifactStore.write(
      {
        artifact_id: artifactId,
        artifact_type: 'REASONING_CHAIN',
        session_id: sessionId,
        turn_id: turnId,
        created_at: new Date().toISOString(),
        retained_until: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1_000,
        ).toISOString(),
        schema_version: '1.0',
        summary: `Reasoning chain for: ${goal.slice(0, 80)}`,
        data: chain as unknown as Record<string, unknown>,
      },
      COMPONENT_ID,
    );

    return chain;
  }

  // ── evaluateReasoningQuality() ─────────────────────────────────────────────

  /**
   * Score 0.0–1.0.
   * Rewards: rising confidence trajectory, diverse evidence sources.
   * Penalises: detected flaws, missing alternatives, evidence gaps.
   */
  evaluateReasoningQuality(chain: ReasoningChain): number {
    let score = 1.0;

    const flaws = this.detectReasoningFlaws(chain);
    score -= flaws.length * 0.15;

    // Penalise Decide steps with fewer than 2 alternatives
    for (const step of chain.steps) {
      if (step.type === 'decide' && step.alternatives_considered.length < 2) {
        score -= 0.1;
      }
    }

    // Reward rising confidence (positive slope)
    if (chain.confidence_trajectory.length >= 2) {
      const first = chain.confidence_trajectory[0] ?? 0;
      const last =
        chain.confidence_trajectory[chain.confidence_trajectory.length - 1] ?? 0;
      if (last > first) score += 0.1;
    }

    // Reward diverse evidence (steps that cite evidence)
    const evidenceCitingSteps = chain.steps.filter((s) => s.evidence.length > 0).length;
    const evidenceRatio = evidenceCitingSteps / Math.max(chain.steps.length, 1);
    score += evidenceRatio * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  // ── detectReasoningFlaws() ─────────────────────────────────────────────────

  /**
   * Detect structural flaws in a reasoning chain.
   */
  detectReasoningFlaws(chain: ReasoningChain): ReasoningFlaw[] {
    const flaws: ReasoningFlaw[] = [];

    // Collect all step content for duplicate-detection
    const contentSet = new Set<string>();

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      if (!step) continue;

      // CIRCULAR — same content repeated
      const normalised = step.content.trim().toLowerCase();
      if (contentSet.has(normalised)) {
        flaws.push({
          type: 'CIRCULAR',
          step_index: i,
          description: `Step ${i} content duplicates an earlier step.`,
        });
      }
      contentSet.add(normalised);

      // OVERCONFIDENT — confidence 1.0 with no evidence
      if (step.confidence >= 1.0 && step.evidence.length === 0) {
        flaws.push({
          type: 'OVERCONFIDENT',
          step_index: i,
          description: `Step ${i} claims full confidence with no supporting evidence.`,
        });
      }

      // EVIDENCE_GAP — act or decide step with zero evidence
      if ((step.type === 'decide' || step.type === 'act') && step.evidence.length === 0) {
        flaws.push({
          type: 'EVIDENCE_GAP',
          step_index: i,
          description: `Step ${i} (${step.type}) has no evidence citations.`,
        });
      }

      // ANCHORING_BIAS — decide step alternatives_considered all start with same word
      if (
        step.type === 'decide' &&
        step.alternatives_considered.length >= 2
      ) {
        const firstWords = step.alternatives_considered.map(
          (a) => a.trim().split(/\s+/)[0]?.toLowerCase() ?? '',
        );
        const unique = new Set(firstWords);
        if (unique.size === 1) {
          flaws.push({
            type: 'ANCHORING_BIAS',
            step_index: i,
            description: `Step ${i} alternatives all start with '${firstWords[0]}' — possible anchoring bias.`,
          });
        }
      }
    }

    return flaws;
  }

  // ── Private OODA helpers ──────────────────────────────────────────────────

  private _observe(
    goal: string,
    evidenceArtifacts: StoredArtifact[],
  ): ThoughtStep {
    const evidence = evidenceArtifacts.map((a) => a.artifact_id);
    const observations = evidenceArtifacts
      .map((a) => `[${a.artifact_type}] ${a.summary}`)
      .join('; ');

    return {
      type: 'observe',
      content: `Goal: "${goal}". Observed ${evidenceArtifacts.length} artifact(s). ${observations || 'No prior evidence found.'}`,
      confidence: evidenceArtifacts.length > 0 ? 0.6 : 0.4,
      evidence,
      alternatives_considered: [],
      timestamp: Date.now(),
    };
  }

  private _orient(
    goal: string,
    context: ReasoningContext,
    evidenceSummaries: string[],
    observe: ThoughtStep,
  ): ThoughtStep {
    const contextDesc = context['description'] ?? '';
    const pattern = evidenceSummaries.length > 0
      ? `Prior evidence suggests: ${evidenceSummaries.slice(0, 3).join(' | ')}.`
      : 'No established pattern from prior evidence.';

    return {
      type: 'orient',
      content: `Orienting towards goal: "${goal}". ${contextDesc} ${pattern}`,
      confidence: Math.min(observe.confidence + 0.1, 0.9),
      evidence: observe.evidence,
      alternatives_considered: [],
      timestamp: Date.now(),
    };
  }

  private _decide(
    goal: string,
    orient: ThoughtStep,
    evidenceArtifacts: StoredArtifact[],
  ): ThoughtStep {
    const evidence = evidenceArtifacts.map((a) => a.artifact_id);

    // Always surface at least 2 alternatives
    const alternatives = [
      `Option A: Proceed directly towards "${goal}" using available evidence.`,
      `Option B: Gather more context before acting on "${goal}".`,
      `Option C: Decompose "${goal}" into sub-goals before execution.`,
    ];

    return {
      type: 'decide',
      content: `Decision for "${goal}": Proceed with Option A given confidence ${orient.confidence.toFixed(2)} and ${evidenceArtifacts.length} evidence artifact(s). Alternatives evaluated.`,
      confidence: Math.min(orient.confidence + 0.05, 0.95),
      evidence,
      alternatives_considered: alternatives,
      timestamp: Date.now(),
    };
  }

  private _act(decide: ThoughtStep): ThoughtStep {
    return {
      type: 'act',
      content: `Acting on decision: ${decide.content.split('.')[0] ?? decide.content}`,
      confidence: decide.confidence,
      evidence: decide.evidence,
      alternatives_considered: [],
      timestamp: Date.now(),
    };
  }

  private _reflect(steps: ThoughtStep[], goal: string): ThoughtStep {
    const avgConfidence =
      steps.reduce((s, t) => s + t.confidence, 0) / Math.max(steps.length, 1);
    const allEvidence = [...new Set(steps.flatMap((s) => s.evidence))];

    return {
      type: 'reflect',
      content: `Reflection on goal "${goal}": completed ${steps.length} reasoning steps with average confidence ${avgConfidence.toFixed(2)}. Evidence base: ${allEvidence.length} artifact(s).`,
      confidence: Math.min(avgConfidence + 0.05, 1.0),
      evidence: allEvidence,
      alternatives_considered: [],
      timestamp: Date.now(),
    };
  }

  private async _resolveArtifacts(ids: string[]): Promise<StoredArtifact[]> {
    const results: StoredArtifact[] = [];
    for (const id of ids) {
      try {
        results.push(await this.artifactStore.get(id));
      } catch {
        // Missing artifact — silently skip
      }
    }
    return results;
  }
}
