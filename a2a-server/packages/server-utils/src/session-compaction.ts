/**
 * Session Compaction — ADR-ClawCode-Orchestration §14.3
 *
 * Automatically triggers a `compress_history` interrupt when the serialised
 * context reaches 80 % of the configured context-window budget.
 */

import { logger } from "./logger.js";

export interface CompactionConfig {
  contextWindowChars?: number;
  compactionThreshold?: number;
  targetEntries?: number;
}

const DEFAULT_CONTEXT_WINDOW_CHARS = 128_000;
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_TARGET_ENTRIES = 5;

const PRESERVED_ARTIFACT_TYPES = new Set([
  "EXECUTION_DECISION",
  "CONFIDENCE_TRACE",
  "WAITING_STATE",
  "SESSION_END_RECORD",
  "VALIDATION_SUMMARY",
  "OPPORTUNITY_SET",
]);

export interface CompactionCheckResult {
  shouldCompact: boolean;
  currentChars: number;
  thresholdChars: number;
  fillRatio: number;
}

export function checkCompactionNeeded(
  ctx: Record<string, unknown> | string,
  config: CompactionConfig = {},
): CompactionCheckResult {
  const windowChars = config.contextWindowChars ?? DEFAULT_CONTEXT_WINDOW_CHARS;
  const threshold = config.compactionThreshold ?? DEFAULT_THRESHOLD;
  const thresholdChars = Math.floor(windowChars * threshold);

  const json = typeof ctx === "string" ? ctx : JSON.stringify(ctx);
  const currentChars = json.length;
  const fillRatio = currentChars / windowChars;

  return {
    shouldCompact: currentChars >= thresholdChars,
    currentChars,
    thresholdChars,
    fillRatio,
  };
}

export interface HistoryEntry {
  role?: string;
  message?: string;
  artifact_type?: string;
  [key: string]: unknown;
}

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

  if (history[0] !== undefined) addEntry(history[0], 0);

  history.forEach((entry, idx) => {
    if (
      typeof entry.artifact_type === "string" &&
      PRESERVED_ARTIFACT_TYPES.has(entry.artifact_type)
    ) {
      addEntry(entry, idx);
    }
  });

  const remaining = targetEntries - kept.length;
  if (remaining > 0) {
    const tail = history.slice(-remaining);
    const tailStartIdx = history.length - remaining;
    tail.forEach((entry, i) => addEntry(entry, tailStartIdx + i));
  }

  const indexMap = new Map(history.map((e, i) => [e, i]));
  kept.sort((a, b) => (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0));

  logger.info("[SessionCompaction] Compacted history", {
    from: history.length,
    to: kept.length,
    target: targetEntries,
  });

  return kept;
}

export function applyCompaction(
  ctx: Record<string, unknown>,
  config: CompactionConfig = {},
): boolean {
  const check = checkCompactionNeeded(ctx, config);
  if (!check.shouldCompact) return false;

  logger.info("[SessionCompaction] Context window at threshold — compacting", {
    fillRatio: check.fillRatio.toFixed(2),
    chars: check.currentChars,
    threshold: check.thresholdChars,
  });

  const targetEntries = config.targetEntries ?? DEFAULT_TARGET_ENTRIES;

  const rootHistory = ctx["history"];
  if (Array.isArray(rootHistory)) {
    ctx["history"] = compactHistory(rootHistory as HistoryEntry[], targetEntries);
  }

  const inner = ctx["context"];
  if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) {
    const innerCtx = inner as Record<string, unknown>;
    const innerHistory = innerCtx["history"];
    if (Array.isArray(innerHistory)) {
      innerCtx["history"] = compactHistory(innerHistory as HistoryEntry[], targetEntries);
    }
  }

  ctx["_compacted_at"] = new Date().toISOString();
  ctx["_compaction_fill_ratio"] = check.fillRatio;
  return true;
}
