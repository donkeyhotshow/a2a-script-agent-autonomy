/**
 * Session Compaction — ADR-ClawCode-Orchestration §14.3
 *
 * Automatically triggers a `compress_history` interrupt when the serialised
 * context reaches 80 % of the configured context-window budget, preventing
 * the model from losing early turns due to truncation.
 *
 * Integration point:
 *   Call `shouldCompact()` at the top of each GrayRoomOrchestrator.runLoop()
 *   iteration (after extracting context, before calling the LLM).  When it
 *   returns true, inject a `compress_history` InterruptDirective so the
 *   existing gray-room compaction path handles the summary.
 *
 * What is preserved after compaction:
 *   - Final file states (last write-file / edit-patch result per path)
 *   - Key decisions (EXECUTION_DECISION, CONFIDENCE_TRACE, WAITING_STATE)
 *   - Up to `targetEntries` history entries (default 5, range 3–7)
 *
 * What is dropped:
 *   - Intermediate LLM turns superseded by later ones
 *   - Raw tool call/result turns beyond the preserved window
 */

import { logger } from '@a2a/server-utils/logger.js';

// ── Configuration ─────────────────────────────────────────────────────────────

export interface CompactionConfig {
  /**
   * Context-window size in characters (proxy for tokens: ~4 chars/token).
   * Default: 128 000 chars  ≈ 32k tokens.
   */
  contextWindowChars?: number;
  /**
   * Fraction of contextWindowChars that triggers compaction.
   * Default: 0.8 (80 %).
   */
  compactionThreshold?: number;
  /**
   * Target number of history entries after compaction (3–7).
   * Default: 5.
   */
  targetEntries?: number;
}

const DEFAULT_CONTEXT_WINDOW_CHARS = 128_000;
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_TARGET_ENTRIES = 5;

// ── Key-decision artifact types preserved through compaction ─────────────────

const PRESERVED_ARTIFACT_TYPES = new Set([
  'EXECUTION_DECISION',
  'CONFIDENCE_TRACE',
  'WAITING_STATE',
  'SESSION_END_RECORD',
  'VALIDATION_SUMMARY',
  'OPPORTUNITY_SET',
]);

// ── Public API ────────────────────────────────────────────────────────────────

export interface CompactionCheckResult {
  /** True when context has reached the compaction threshold */
  shouldCompact: boolean;
  /** Current context size in characters */
  currentChars: number;
  /** Threshold in characters */
  thresholdChars: number;
  /** Fill ratio 0–1 */
  fillRatio: number;
}

/**
 * Check whether the current context has reached the compaction threshold.
 *
 * @param ctx    The full serialised context object (or its JSON string).
 * @param config Optional overrides.
 */
export function checkCompactionNeeded(
  ctx: Record<string, unknown> | string,
  config: CompactionConfig = {},
): CompactionCheckResult {
  const windowChars = config.contextWindowChars ?? DEFAULT_CONTEXT_WINDOW_CHARS;
  const threshold = config.compactionThreshold ?? DEFAULT_THRESHOLD;
  const thresholdChars = Math.floor(windowChars * threshold);

  const json = typeof ctx === 'string' ? ctx : JSON.stringify(ctx);
  const currentChars = json.length;
  const fillRatio = currentChars / windowChars;

  return {
    shouldCompact: currentChars >= thresholdChars,
    currentChars,
    thresholdChars,
    fillRatio,
  };
}

// ── History record type (minimal, avoids importing the full transform types) ──

export interface HistoryEntry {
  role?: string;
  message?: string;
  artifact_type?: string;
  [key: string]: unknown;
}

/**
 * Compact a history array to `targetEntries` entries by:
 *
 *  1. Preserving the first entry (original task framing).
 *  2. Preserving all entries whose `artifact_type` is in PRESERVED_ARTIFACT_TYPES.
 *  3. Preserving the last N remaining entries (most recent context).
 *  4. Deduplicating by insertion order — no entry appears twice.
 *
 * This is a deterministic offline pass (no LLM call).  The GrayRoomOrchestrator
 * `compress_history` path calls the LLM for a semantic summary; this function
 * is used as a fast pre-pass or as a standalone fallback.
 *
 * @param history       Array of history entries to compact.
 * @param targetEntries Maximum number of entries to retain.
 */
export function compactHistory(
  history: HistoryEntry[],
  targetEntries = DEFAULT_TARGET_ENTRIES,
): HistoryEntry[] {
  if (history.length <= targetEntries) return history;

  const kept: HistoryEntry[] = [];
  const seenIndices = new Set<number>();

  const addEntry = (entry: HistoryEntry, idx: number): void => {
    if (!seenIndices.has(idx)) {
      seenIndices.add(idx);
      kept.push(entry);
    }
  };

  // 1. Always keep the first entry (task framing)
  if (history[0] !== undefined) addEntry(history[0], 0);

  // 2. Keep key-decision entries
  history.forEach((entry, idx) => {
    if (
      typeof entry.artifact_type === 'string' &&
      PRESERVED_ARTIFACT_TYPES.has(entry.artifact_type)
    ) {
      addEntry(entry, idx);
    }
  });

  // 3. Fill remaining slots from the tail
  const remaining = targetEntries - kept.length;
  if (remaining > 0) {
    const tail = history.slice(-remaining);
    const tailStartIdx = history.length - remaining;
    tail.forEach((entry, i) => addEntry(entry, tailStartIdx + i));
  }

  // Re-sort by original index to maintain chronological order
  const indexMap = new Map(history.map((e, i) => [e, i]));
  kept.sort((a, b) => (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0));

  logger.info('[SessionCompaction] Compacted history', {
    from: history.length,
    to: kept.length,
    target: targetEntries,
  });

  return kept;
}

/**
 * Apply in-place compaction to a mutable context object.
 *
 * Mutates `ctx.history` and `ctx.context.history` (if present) to the
 * compacted version, and sets `ctx._compacted_at` for audit.
 *
 * @param ctx    Full context object (mutated in place).
 * @param config Optional overrides.
 * @returns      True when compaction was actually performed.
 */
export function applyCompaction(
  ctx: Record<string, unknown>,
  config: CompactionConfig = {},
): boolean {
  const check = checkCompactionNeeded(ctx, config);
  if (!check.shouldCompact) return false;

  logger.info('[SessionCompaction] Context window at threshold — compacting', {
    fillRatio: check.fillRatio.toFixed(2),
    chars: check.currentChars,
    threshold: check.thresholdChars,
  });

  const targetEntries = config.targetEntries ?? DEFAULT_TARGET_ENTRIES;

  // Compact root-level history
  const rootHistory = ctx['history'];
  if (Array.isArray(rootHistory)) {
    ctx['history'] = compactHistory(rootHistory as HistoryEntry[], targetEntries);
  }

  // Compact nested context.history
  const inner = ctx['context'];
  if (inner !== null && typeof inner === 'object' && !Array.isArray(inner)) {
    const innerCtx = inner as Record<string, unknown>;
    const innerHistory = innerCtx['history'];
    if (Array.isArray(innerHistory)) {
      innerCtx['history'] = compactHistory(innerHistory as HistoryEntry[], targetEntries);
    }
  }

  ctx['_compacted_at'] = new Date().toISOString();
  ctx['_compaction_fill_ratio'] = check.fillRatio;
  return true;
}
