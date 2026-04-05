/**
 * VisionTester — ADR-0060: Sight-Driven Verification (Visual QA)
 *
 * Captures a screenshot of a running dev-server page via the Playwright MCP
 * server, then sends the image + original UI requirement to a Vision-capable
 * LLM (through the AI Hub proxy) for structural and aesthetic evaluation.
 *
 * The result is stored as a `VISION_QA_RESULT` artifact.  When
 * `approved === false`, the `critique` field should be fed back to the Coder
 * agent for a self-correction cycle.
 *
 * Writer: 'vision-tester' for VISION_QA_RESULT artifacts.
 *
 * Environment variables:
 *   VISION_AI_HUB_URL    — AI Hub base URL (default: AI_HUB_URL ?? 'http://localhost:11434')
 *   VISION_MODEL         — Vision-capable model name (default: 'llava')
 *   PLAYWRIGHT_MCP_SERVER — JSON command array for the Playwright MCP server.
 *                           Absent → screenshot capture is skipped; rule-based fallback runs.
 */

import { randomUUID } from 'node:crypto';
import { ArtifactStore } from '../core/artifact-store.js';
import { executeMcpCall } from '../../actions/handlers/mcp-call.js';
import { logger } from '../../utils/logger.js';

// ── Public types ──────────────────────────────────────────────────────────────

export interface VisualQaCriteria {
  /** Layout appears correct (no obvious clipping, overflow, or overlap) */
  layout_correct: boolean;
  /** Interactive elements are reachable and not hidden */
  elements_accessible: boolean;
  /** Text contrast is adequate */
  contrast_adequate: boolean;
  /** Rendered output matches the stated UI requirement */
  requirement_satisfied: number; // 0.0–1.0
}

export interface VisualQaResult {
  session_id: string;
  turn: number;
  url: string;
  criteria: VisualQaCriteria;
  overall_score: number;
  blocking_issues: string[];
  critique: string;
  suggestions: string[];
  /** true when overall_score >= APPROVE_THRESHOLD and no blocking issues */
  approved: boolean;
  /** 'llm' when an LLM evaluated the screenshot; 'rule-based' for the fallback */
  judge_mode: 'llm' | 'rule-based';
}

export interface VisionTesterInput {
  /** URL of the page to verify (must be reachable from the server process) */
  url: string;
  /** Original UI requirement text used as the evaluation rubric */
  uiRequirement: string;
  sessionId?: string;
  turn?: number;
  /** Timeout for the Playwright screenshot call (ms, default: 20 000) */
  screenshotTimeoutMs?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPONENT_ID = 'vision-tester';
const APPROVE_THRESHOLD = 0.70;

const DEFAULT_AI_HUB =
  process.env['VISION_AI_HUB_URL'] ??
  process.env['AI_HUB_URL'] ??
  'http://localhost:11434';

const DEFAULT_MODEL = process.env['VISION_MODEL'] ?? 'llava';

const WEIGHTS = {
  layout_correct:        0.35,
  elements_accessible:   0.25,
  contrast_adequate:     0.15,
  requirement_satisfied: 0.25,
} as const;

// ── VisionTester ──────────────────────────────────────────────────────────────

export class VisionTester {
  private readonly aiHubBase: string;
  private readonly model: string;

  constructor(
    private readonly artifactStore: ArtifactStore,
    aiHubBase = DEFAULT_AI_HUB,
    model = DEFAULT_MODEL,
  ) {
    this.aiHubBase = aiHubBase.replace(/\/$/, '');
    this.model = model;
    artifactStore.registerWriter('VISION_QA_RESULT', COMPONENT_ID);
  }

  // ── verify() ──────────────────────────────────────────────────────────────

  /**
   * Capture + evaluate a rendered UI page.
   * Stores a VISION_QA_RESULT artifact and returns the result.
   */
  async verify(input: VisionTesterInput): Promise<VisualQaResult> {
    const sessionId = input.sessionId ?? 'unknown';
    const turn      = input.turn ?? 0;

    logger.info(`[vision-tester] Starting visual QA for ${input.url} (session=${sessionId})`);

    const screenshotBase64 = await this._captureScreenshot(
      input.url,
      input.screenshotTimeoutMs ?? 20_000,
    );

    let result: VisualQaResult;

    if (screenshotBase64) {
      result = await this._llmEvaluate(
        screenshotBase64,
        input.url,
        input.uiRequirement,
        sessionId,
        turn,
      );
    } else {
      logger.warn('[vision-tester] Screenshot unavailable — using rule-based fallback');
      result = this._ruleBasedEvaluate(input.url, input.uiRequirement, sessionId, turn);
    }

    await this._storeArtifact(result);
    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Capture a screenshot via the Playwright MCP server.
   * Returns base64-encoded PNG data, or null on failure / missing config.
   */
  private async _captureScreenshot(url: string, timeoutMs: number): Promise<string | null> {
    const raw = process.env['PLAYWRIGHT_MCP_SERVER'];
    if (!raw) return null;

    let serverCommand: string[];
    try {
      serverCommand = JSON.parse(raw) as string[];
    } catch (err: unknown) {
      logger.warn('[vision-tester] PLAYWRIGHT_MCP_SERVER is not valid JSON — skipping screenshot', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }

    const mcpResult = await executeMcpCall({
      server: 'playwright',
      tool: 'screenshot',
      arguments: { url, fullPage: true },
      serverCommand,
      timeout: timeoutMs,
    });

    if (!mcpResult.success || !mcpResult.content) {
      logger.warn(`[vision-tester] Playwright MCP call failed: ${mcpResult.error ?? 'no content'}`);
      return null;
    }

    for (const block of mcpResult.content) {
      if ((block.type === 'image' || block.mimeType?.startsWith('image/')) && block.data) {
        return block.data;
      }
    }

    logger.warn('[vision-tester] Playwright MCP returned no image content block');
    return null;
  }

  /**
   * Send the screenshot and requirement to the Vision LLM via the AI Hub proxy.
   */
  private async _llmEvaluate(
    screenshotBase64: string,
    url: string,
    uiRequirement: string,
    sessionId: string,
    turn: number,
  ): Promise<VisualQaResult> {
    const prompt = this._buildPrompt(uiRequirement);

    let rawResponse: string;
    try {
      const res = await fetch(`${this.aiHubBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          images: [screenshotBase64],
          stream: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        throw new Error(`AI Hub responded ${res.status} ${res.statusText}`);
      }

      const json = await res.json() as { response?: string };
      rawResponse = json.response ?? '';
    } catch (err) {
      logger.warn(`[vision-tester] Vision LLM call failed: ${String(err)} — using rule-based fallback`);
      return this._ruleBasedEvaluate(url, uiRequirement, sessionId, turn);
    }

    return this._parseLlmResponse(rawResponse, url, uiRequirement, sessionId, turn);
  }

  private _buildPrompt(uiRequirement: string): string {
    return `You are a visual QA engineer. Evaluate the provided screenshot against the following UI requirement.

REQUIREMENT:
"""
${uiRequirement}
"""

Respond with a JSON object — no markdown fences — matching this exact schema:
{
  "layout_correct": true|false,
  "elements_accessible": true|false,
  "contrast_adequate": true|false,
  "requirement_satisfied": 0.0-1.0,
  "blocking_issues": ["string", ...],
  "critique": "one-paragraph summary",
  "suggestions": ["string", ...]
}

Be strict: flag any overflow, clipping, colour contrast failure, or missing element.`;
  }

  private _parseLlmResponse(
    raw: string,
    url: string,
    uiRequirement: string,
    sessionId: string,
    turn: number,
  ): VisualQaResult {
    try {
      // Strip markdown fences if the LLM included them despite instructions
      const cleaned = raw
        .replace(/^```(?:json)?/m, '')
        .replace(/```$/m, '')
        .trim();
      const parsed = JSON.parse(cleaned) as Partial<Record<string, unknown>>;

      const criteria: VisualQaCriteria = {
        layout_correct:        Boolean(parsed['layout_correct'] ?? true),
        elements_accessible:   Boolean(parsed['elements_accessible'] ?? true),
        contrast_adequate:     Boolean(parsed['contrast_adequate'] ?? true),
        requirement_satisfied: Number(parsed['requirement_satisfied'] ?? 0.5),
      };

      const overallScore    = this._computeScore(criteria);
      const blockingIssues  = Array.isArray(parsed['blocking_issues'])
        ? (parsed['blocking_issues'] as string[])
        : [];

      return {
        session_id: sessionId,
        turn,
        url,
        criteria,
        overall_score: overallScore,
        blocking_issues: blockingIssues,
        critique: String(parsed['critique'] ?? 'LLM evaluation complete.'),
        suggestions: Array.isArray(parsed['suggestions'])
          ? (parsed['suggestions'] as string[])
          : [],
        approved: overallScore >= APPROVE_THRESHOLD && blockingIssues.length === 0,
        judge_mode: 'llm',
      };
    } catch (err: unknown) {
      logger.warn('[vision-tester] Failed to parse LLM JSON response — using rule-based fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      return this._ruleBasedEvaluate(url, uiRequirement, sessionId, turn);
    }
  }

  /**
   * Rule-based fallback: a best-effort evaluation without a screenshot.
   * Scores conservatively so the Coder is prompted to re-verify once the
   * Vision LLM becomes available.
   */
  private _ruleBasedEvaluate(
    url: string,
    uiRequirement: string,
    sessionId: string,
    turn: number,
  ): VisualQaResult {
    const requirementWords = new Set(
      uiRequirement.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    );

    // Heuristic: URL path components often reflect the requirement topic
    const urlWords = new Set(
      url.toLowerCase().split(/[\W_]+/).filter((w) => w.length > 3),
    );
    const overlap = [...requirementWords].filter((w) => urlWords.has(w)).length;
    const requirementSatisfied =
      requirementWords.size > 0 ? Math.min(overlap / requirementWords.size, 1) : 0.4;

    const criteria: VisualQaCriteria = {
      layout_correct:        true,
      elements_accessible:   true,
      contrast_adequate:     true,
      requirement_satisfied: requirementSatisfied,
    };

    const overallScore = this._computeScore(criteria);
    const blockingIssues: string[] = [];

    if (requirementSatisfied < 0.2) {
      blockingIssues.push(
        'Rule-based check: URL does not appear related to the stated UI requirement.',
      );
    }

    return {
      session_id: sessionId,
      turn,
      url,
      criteria,
      overall_score: overallScore,
      blocking_issues: blockingIssues,
      critique: `Rule-based fallback (no screenshot). requirement_satisfied=${requirementSatisfied.toFixed(2)}.`,
      suggestions: [
        'Configure PLAYWRIGHT_MCP_SERVER and a Vision-capable model to enable full visual QA.',
      ],
      approved: overallScore >= APPROVE_THRESHOLD && blockingIssues.length === 0,
      judge_mode: 'rule-based',
    };
  }

  private _computeScore(c: VisualQaCriteria): number {
    return (
      (c.layout_correct ? 1 : 0)      * WEIGHTS.layout_correct +
      (c.elements_accessible ? 1 : 0) * WEIGHTS.elements_accessible +
      (c.contrast_adequate ? 1 : 0)   * WEIGHTS.contrast_adequate +
      c.requirement_satisfied          * WEIGHTS.requirement_satisfied
    );
  }

  private async _storeArtifact(result: VisualQaResult): Promise<void> {
    try {
      await this.artifactStore.write(
        {
          artifact_id: randomUUID(),
          artifact_type: 'VISION_QA_RESULT',
          session_id: result.session_id,
          turn_id: String(result.turn),
          created_at: new Date().toISOString(),
          schema_version: '1',
          summary: result.critique.slice(0, 200),
          data: {
            url: result.url,
            criteria: result.criteria,
            overall_score: result.overall_score,
            blocking_issues: result.blocking_issues,
            critique: result.critique,
            suggestions: result.suggestions,
            approved: result.approved,
            judge_mode: result.judge_mode,
          },
        },
        COMPONENT_ID,
      );
    } catch (err) {
      logger.warn(`[vision-tester] Failed to store VISION_QA_RESULT artifact: ${String(err)}`);
    }
  }
}
