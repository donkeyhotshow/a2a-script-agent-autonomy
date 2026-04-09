/**
 * Prompt Router — ADR-ClawCode-Orchestration §14.1 (Token Economy)
 *
 * Lightweight token-based pre-scorer that selects the top-N most relevant
 * tools for a given prompt, reducing context-window pressure before the LLM
 * call in the ENRICHING phase.
 *
 * Design choices:
 *  - Pure function, no I/O — cheap to run on every ENRICHING entry.
 *  - Normalises both the prompt and tool descriptions to lower-case so that
 *    stopwords can be filtered without a heavy NLP library.
 *  - Falls back to returning all tools when the scored slice would be empty.
 */

// ── Common English stop-words to skip during scoring ─────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'on', 'at', 'for', 'by', 'with', 'from', 'as',
  'and', 'or', 'but', 'if', 'so', 'yet', 'nor',
  'that', 'this', 'these', 'those', 'it', 'its',
]);

// ── Public tool interface (minimal — callers own the full type) ───────────────

export interface Tool {
  /** Unique tool identifier */
  name: string;
  /** Human-readable description — used for scoring */
  description: string;
  /** Any additional tool metadata preserved verbatim */
  [key: string]: unknown;
}

export interface ScoredTool {
  tool: Tool;
  /** Number of prompt tokens found in the tool description */
  score: number;
}

// ── Core scoring logic ────────────────────────────────────────────────────────

/**
 * Tokenise a string into lowercase words, filtering stop-words.
 */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Score a single tool against a set of prompt tokens.
 *
 * Each matching token contributes +1 to the score; repeated matches count
 * independently so that tools with many keyword hits rank higher.
 */
function scoreTool(tool: Tool, promptTokens: string[]): number {
  const descTokens = tokenise(tool.description);
  const descSet = new Set(descTokens);
  return promptTokens.filter((t) => descSet.has(t)).length;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Route a prompt to at most `topN` tools (default: 5).
 *
 * @param prompt  The user / LLM prompt for the current turn.
 * @param tools   Full set of available tools.
 * @param topN    Maximum number of tools to return (default: 5).
 * @returns       Ordered slice of tools, most relevant first.
 *                Falls back to returning all tools when every score is zero.
 */
export function routePrompt(prompt: string, tools: Tool[], topN = 5): Tool[] {
  if (tools.length === 0) return [];

  const promptTokens = tokenise(prompt);
  if (promptTokens.length === 0) return tools.slice(0, topN);

  const scored: ScoredTool[] = tools.map((tool) => ({
    tool,
    score: scoreTool(tool, promptTokens),
  }));

  scored.sort((a, b) => b.score - a.score);

  // If no tool matched at all, return the first topN unfiltered
  const hasMatches = scored[0] !== undefined && scored[0].score > 0;
  if (!hasMatches) return tools.slice(0, topN);

  return scored.slice(0, topN).map((s) => s.tool);
}

/**
 * Same as `routePrompt` but also returns per-tool scores for observability
 * (useful for logging in the ENRICHING phase).
 */
export function routePromptScored(
  prompt: string,
  tools: Tool[],
  topN = 5,
): ScoredTool[] {
  if (tools.length === 0) return [];

  const promptTokens = tokenise(prompt);
  if (promptTokens.length === 0) {
    return tools.slice(0, topN).map((tool) => ({ tool, score: 0 }));
  }

  const scored: ScoredTool[] = tools.map((tool) => ({
    tool,
    score: scoreTool(tool, promptTokens),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
