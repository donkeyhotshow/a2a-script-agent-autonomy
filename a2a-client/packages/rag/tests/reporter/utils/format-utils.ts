/**
 * Shared formatting utilities
 * @module @a2a/rag/tests/reporter/utils/format-utils
 */

/**
 * Format duration in human-readable format
 * Used by all formatters
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, threshold = 0.8): string {
  const percentage = (value * 100).toFixed(1);
  return `${percentage}%`;
}

/**
 * Get pass/fail status icon
 */
export function getStatusIcon(passed: boolean): string {
  return passed ? '✅' : '❌';
}

