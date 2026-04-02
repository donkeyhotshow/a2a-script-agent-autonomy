/**
 * LLMJudge — ADR-0065: LLM-as-Judge self-evaluation layer.
 *
 * Evaluates agent outputs against the goal before the DELIVERING transition.
 * Calls the existing AI proxy (ai-integration on :11434) with a structured
 * evaluation prompt. Falls back to a rule-based judge when the proxy is
 * unavailable.
 *
 * Writer: 'llm-judge' for JUDGMENT_RESULT artifacts.
 * Wire: VALIDATING state → block DELIVERING unless judgment.approved === true.
 */

import { randomUUID } from 'crypto';
import { ArtifactStore, type StoredArtifact } from '../core/artifact-store.js';
import type { ReasoningChain } from '../core/cognitive-engine.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface JudgmentCriteria {
  correctness: boolean;
  completeness: number;     // 0.0–1.0
  safety: boolean;
  efficiency: number;       // 0.0–1.0
  consistency: boolean;
  evidence_quality: number; // 0.0–1.0
}

export interface JudgmentResult {
  session_id: string;
  turn: number;
  criteria: JudgmentCriteria;
  overall_score: number;
  blocking_issues: string[];
  suggestions: string[];
  approved: boolean;
  judge_reasoning: string;
}

export interface ReasoningQualityReport {
  chain_id: string;
  circular_steps: number[];
  evidence_gap_steps: number[];
  overconfident_steps: number[];
  quality_score: number;        // 0.0–1.0
  summary: string;
}

// ── LLMJudge ─────────────────────────────────────────────────────────────────

const COMPONENT_ID = 'llm-judge';
const DEFAULT_AI_HUB = process.env['AI_HUB_URL'] ?? 'http://localhost:11434';
const APPROVE_THRESHOLD = 0.75;

// Weights for overall_score
const WEIGHTS = {
  correctness:      0.35,
  completeness:     0.25,
  safety:           0.20,
  efficiency:       0.10,
  consistency:      0.05,
  evidence_quality: 0.05,
} as const;

export class LLMJudge {
  private readonly aiHubBase: string;

  constructor(
    private readonly artifactStore: ArtifactStore,
    aiHubBase = DEFAULT_AI_HUB,
  ) {
    this.aiHubBase = aiHubBase.replace(/\/$/, '');
    artifactStore.registerWriter('JUDGMENT_RESULT', COMPONENT_ID);
  }

  // ── judge() ───────────────────────────────────────────────────────────────

  /**
   * Judge an agent output against the goal.
   * Calls the AI proxy; falls back to rule-based evaluation on error.
   */
  async judge(
    output: string,
    goal: string,
    artifactIds: string[],
    reasoningChain?: ReasoningChain,
    sessionId = 'unknown',
    turn = 0,
  ): Promise<JudgmentResult> {
    const turnId = randomUUID();

    // Resolve top-3 artifacts for context
    const evidenceArtifacts = await this._resolveArtifacts(artifactIds, 3);
    const prompt = this.buildJudgePrompt(output, goal, evidenceArtifacts);

    let result: JudgmentResult;
    try {
      result = await this._callLLMJudge(prompt, sessionId, turn);
    } catch {
      result = this._ruleBasedJudge(output, goal, evidenceArtifacts, sessionId, turn);
    }

    // Persist as artifact
    const artifactId = `judgment-${randomUUID()}`;
    await this.artifactStore.write(
      {
        artifact_id: artifactId,
        artifact_type: 'JUDGMENT_RESULT',
        session_id: sessionId,
        turn_id: turnId,
        created_at: new Date().toISOString(),
        retained_until: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1_000,
        ).toISOString(),
        schema_version: '1.0',
        severity: result.approved ? 'info' : 'warning',
        summary: `Judgment: ${result.approved ? 'APPROVED' : 'BLOCKED'} (score=${result.overall_score.toFixed(2)})`,
        data: result as unknown as Record<string, unknown>,
      },
      COMPONENT_ID,
    );

    return result;
  }

  // ── judgeReasoningChain() ─────────────────────────────────────────────────

  /**
   * Evaluate the reasoning chain itself (not the output).
   */
  judgeReasoningChain(chain: ReasoningChain): ReasoningQualityReport {
    const circularSteps: number[] = [];
    const evidenceGapSteps: number[] = [];
    const overconfidentSteps: number[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      if (!step) continue;

      const normalised = step.content.trim().toLowerCase();
      if (seen.has(normalised)) circularSteps.push(i);
      seen.add(normalised);

      if (step.evidence.length === 0 && (step.type === 'decide' || step.type === 'act')) {
        evidenceGapSteps.push(i);
      }

      if (step.confidence >= 1.0 && step.evidence.length === 0) {
        overconfidentSteps.push(i);
      }
    }

    const flawCount = circularSteps.length + evidenceGapSteps.length + overconfidentSteps.length;
    const qualityScore = Math.max(0, 1 - flawCount * 0.15);

    return {
      chain_id: `${chain.session_id}-${chain.goal.slice(0, 20)}`,
      circular_steps: circularSteps,
      evidence_gap_steps: evidenceGapSteps,
      overconfident_steps: overconfidentSteps,
      quality_score: qualityScore,
      summary:
        flawCount === 0
          ? 'No reasoning flaws detected.'
          : `${flawCount} flaw(s): circular=${circularSteps.length}, evidence_gap=${evidenceGapSteps.length}, overconfident=${overconfidentSteps.length}.`,
    };
  }

  // ── buildJudgePrompt() ────────────────────────────────────────────────────

  /**
   * Deterministic prompt builder. Same inputs → same prompt.
   */
  buildJudgePrompt(
    output: string,
    goal: string,
    artifacts: StoredArtifact[],
  ): string {
    const evidenceSection =
      artifacts.length > 0
        ? artifacts
            .map((a) => `[${a.artifact_type}] ${a.summary}`)
            .join('\n')
        : 'No evidence artifacts available.';

    return `You are a strict quality judge evaluating an autonomous agent's output.
Be conservative: approve only if the output clearly and sufficiently achieves the goal.

GOAL:
${goal}

AGENT OUTPUT:
${output.slice(0, 2000)}

EVIDENCE (top ${artifacts.length} artifacts):
${evidenceSection}

Evaluate the output on the following criteria and respond with valid JSON only:
{
  "correctness": true/false,
  "completeness": 0.0-1.0,
  "safety": true/false,
  "efficiency": 0.0-1.0,
  "consistency": true/false,
  "evidence_quality": 0.0-1.0,
  "blocking_issues": ["..."],
  "suggestions": ["..."],
  "judge_reasoning": "..."
}`;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _callLLMJudge(
    prompt: string,
    sessionId: string,
    turn: number,
  ): Promise<JudgmentResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let rawJson = '';
    try {
      const res = await fetch(`${this.aiHubBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env['JUDGE_MODEL'] ?? 'llama3',
          messages: [
            {
              role: 'system',
              content:
                'You are a strict quality judge. Respond only with valid JSON. No markdown.',
            },
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`LLM proxy responded ${res.status}`);

      const data = (await res.json()) as { message?: { content?: string } };
      rawJson = data?.message?.content ?? '';
    } finally {
      clearTimeout(timeout);
    }

    const parsed = this._parseJudgeResponse(rawJson);
    return this._buildResult(parsed, sessionId, turn);
  }

  private _parseJudgeResponse(raw: string): Partial<JudgmentCriteria & {
    blocking_issues: string[];
    suggestions: string[];
    judge_reasoning: string;
  }> {
    try {
      // Extract JSON from markdown code fences if present
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
      const jsonStr = jsonMatch[1] ?? raw;
      return JSON.parse(jsonStr) as ReturnType<typeof this._parseJudgeResponse>;
    } catch {
      return {};
    }
  }

  private _buildResult(
    parsed: Partial<JudgmentCriteria & {
      blocking_issues: string[];
      suggestions: string[];
      judge_reasoning: string;
    }>,
    sessionId: string,
    turn: number,
  ): JudgmentResult {
    const criteria: JudgmentCriteria = {
      correctness: parsed.correctness ?? false,
      completeness: Number(parsed.completeness ?? 0),
      safety: parsed.safety ?? true,
      efficiency: Number(parsed.efficiency ?? 0.5),
      consistency: parsed.consistency ?? true,
      evidence_quality: Number(parsed.evidence_quality ?? 0),
    };

    const overallScore = this._computeScore(criteria);
    const blockingIssues = parsed.blocking_issues ?? [];

    return {
      session_id: sessionId,
      turn,
      criteria,
      overall_score: overallScore,
      blocking_issues: blockingIssues,
      suggestions: parsed.suggestions ?? [],
      approved:
        overallScore > APPROVE_THRESHOLD &&
        blockingIssues.length === 0 &&
        criteria.safety,
      judge_reasoning: parsed.judge_reasoning ?? 'Parsed from LLM response.',
    };
  }

  /** Rule-based fallback judge (no LLM required) */
  private _ruleBasedJudge(
    output: string,
    goal: string,
    artifacts: StoredArtifact[],
    sessionId: string,
    turn: number,
  ): JudgmentResult {
    const goalWords = new Set(
      goal.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    );
    const outputWords = new Set(
      output.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    );

    const overlap = [...goalWords].filter((w) => outputWords.has(w)).length;
    const completeness = goalWords.size > 0 ? Math.min(overlap / goalWords.size, 1) : 0;

    const hasDangerousWords = /rm -rf|DROP TABLE|DELETE FROM|sudo|format c:/i.test(output);
    const criteria: JudgmentCriteria = {
      correctness: completeness > 0.4,
      completeness,
      safety: !hasDangerousWords,
      efficiency: 0.6,
      consistency: artifacts.length > 0,
      evidence_quality: artifacts.length > 0 ? 0.5 : 0.0,
    };

    const overallScore = this._computeScore(criteria);
    const blockingIssues: string[] = [];
    if (!criteria.safety) blockingIssues.push('Output contains potentially dangerous commands.');
    if (completeness < 0.2) blockingIssues.push('Output appears to not address the goal.');

    return {
      session_id: sessionId,
      turn,
      criteria,
      overall_score: overallScore,
      blocking_issues: blockingIssues,
      suggestions: [],
      approved:
        overallScore > APPROVE_THRESHOLD &&
        blockingIssues.length === 0 &&
        criteria.safety,
      judge_reasoning: `Rule-based fallback: completeness=${completeness.toFixed(2)}, safety=${criteria.safety}.`,
    };
  }

  private _computeScore(c: JudgmentCriteria): number {
    return (
      (c.correctness ? 1 : 0) * WEIGHTS.correctness +
      c.completeness * WEIGHTS.completeness +
      (c.safety ? 1 : 0) * WEIGHTS.safety +
      c.efficiency * WEIGHTS.efficiency +
      (c.consistency ? 1 : 0) * WEIGHTS.consistency +
      c.evidence_quality * WEIGHTS.evidence_quality
    );
  }

  private async _resolveArtifacts(
    ids: string[],
    limit: number,
  ): Promise<StoredArtifact[]> {
    const results: StoredArtifact[] = [];
    for (const id of ids.slice(0, limit * 3)) {
      if (results.length >= limit) break;
      try {
        results.push(await this.artifactStore.get(id));
      } catch {
        // skip missing
      }
    }
    return results;
  }
}
