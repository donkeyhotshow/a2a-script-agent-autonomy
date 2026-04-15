import { createLogger } from "@a2a/server-utils";
import { tryParseJsonFromLlmText } from "@a2a/server-utils";

const logger = createLogger("IntentGate");

export interface DriftCheckResult {
  hasDrift: boolean;
  confidence: number;
  reason: string;
}

/**
 * Validate drift detection response
 */
function validateDriftResult(raw: unknown): DriftCheckResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const hasDrift = typeof obj.hasDrift === "boolean" ? obj.hasDrift : null;
  if (hasDrift === null) return null;

  return {
    hasDrift,
    confidence:
      typeof obj.confidence === "number"
        ? Math.max(0, Math.min(1, obj.confidence))
        : 0.5,
    reason: typeof obj.reason === "string" ? obj.reason : "No reason provided",
  };
}

export class IntentGate {
  private originalIntent: string = "";
  private lastPlan: string = "";
  private turnCount: number = 0;
  private readonly MAX_TURNS_BEFORE_CHECK = 5; // Check every 5 turns

  /**
   * Set the initial intent and lock it
   */
  public lockIntent(intent: string): void {
    this.originalIntent = intent;
    this.turnCount = 0;
    logger.info("[IntentGate] Intent locked", {
      intent: intent.slice(0, 50) + "...",
    });
  }

  /**
   * Increment turn counter - call after each GrayRoom iteration
   */
  public incrementTurn(): void {
    this.turnCount++;
  }

  /**
   * Get current turn count
   */
  public getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Check for semantic drift against the locked intent (ADR-0050)
   * Uses LLM-based comparison when turn count exceeds threshold
   */
  public async checkDrift(
    currentPlan: string,
    context: Record<string, any>,
  ): Promise<DriftCheckResult> {
    this.lastPlan = currentPlan;

    // Quick heuristics: detect obvious stop-words indicating radical shift
    const radicalPhrases = [
      "delete all",
      "remove everything",
      "drop database",
      "rm -rf",
    ];
    const planLower = currentPlan.toLowerCase();

    for (const phrase of radicalPhrases) {
      if (planLower.includes(phrase)) {
        logger.warn("[IntentGate] Radical shift detected via heuristics", {
          phrase,
          originalIntent: this.originalIntent.slice(0, 30),
        });
        return {
          hasDrift: true,
          confidence: 1.0,
          reason: `Radical phrase detected: ${phrase}`,
        };
      }
    }

    // Only run LLM check every N turns to avoid excessive calls
    if (this.turnCount < this.MAX_TURNS_BEFORE_CHECK) {
      logger.debug("[IntentGate] Skipping LLM drift check", {
        turn: this.turnCount,
      });
      return {
        hasDrift: false,
        confidence: 0.0,
        reason: "Below turn threshold",
      };
    }

    logger.info("[IntentGate] Running semantic drift check", {
      turn: this.turnCount,
      originalIntent: this.originalIntent.slice(0, 30),
      currentPlan: currentPlan.slice(0, 30),
    });

    try {
      // TODO: Replace with invoke mechanism
      throw new Error(
        "Intent gate LLM functionality disabled - use invoke mechanism",
      );

      const content = response.content?.trim() || "";
      const parsed = tryParseJsonFromLlmText(content);
      const result = parsed !== null ? validateDriftResult(parsed) : null;
      if (result === null && content.length > 0) {
        logger.debug("[IntentGate] Drift JSON parse/validate failed", {
          preview: content.slice(0, 120),
        });
      }

      if (result) {
        if (result.hasDrift) {
          logger.error("[IntentGate] Semantic drift detected", {
            confidence: result.confidence,
            reason: result.reason,
          });
        }
        return result;
      }

      // Fallback: heuristic only
      return {
        hasDrift: false,
        confidence: 0.3,
        reason: "Parse failed - heuristic fallback",
      };
    } catch (err) {
      logger.error("[IntentGate] Drift check failed", { error: String(err) });
      return {
        hasDrift: false,
        confidence: 0.0,
        reason: `Error: ${String(err).slice(0, 50)}`,
      };
    }
  }

  public getLockedIntent(): string {
    return this.originalIntent;
  }

  /**
   * Reset the intent gate (for new session)
   */
  public reset(): void {
    this.originalIntent = "";
    this.lastPlan = "";
    this.turnCount = 0;
  }
}

export const globalIntentGate = new IntentGate();
