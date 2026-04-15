/**
 * Session Compaction — ADR-ClawCode-Orchestration §14.3
 *
 * Automatically triggers a `compress_history` interrupt when the serialised
 * context reaches 80 % of the configured context-window budget.
 */
export interface CompactionConfig {
    contextWindowChars?: number;
    compactionThreshold?: number;
    targetEntries?: number;
}
export interface CompactionCheckResult {
    shouldCompact: boolean;
    currentChars: number;
    thresholdChars: number;
    fillRatio: number;
}
export declare function checkCompactionNeeded(ctx: Record<string, unknown> | string, config?: CompactionConfig): CompactionCheckResult;
export interface HistoryEntry {
    role?: string;
    message?: string;
    artifact_type?: string;
    [key: string]: unknown;
}
export declare function compactHistory(history: HistoryEntry[], targetEntries?: number): HistoryEntry[];
export declare function applyCompaction(ctx: Record<string, unknown>, config?: CompactionConfig): boolean;
//# sourceMappingURL=session-compaction.d.ts.map