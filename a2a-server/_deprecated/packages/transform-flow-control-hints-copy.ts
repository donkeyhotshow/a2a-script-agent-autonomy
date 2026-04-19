/**
 * Phase-specific instructions for the LLM, keyed by `context.execution.action` + `context.execution.step`.
 * Injected into request templates as `${flowControlHint}` (see `attachFlowControlHintToInvokePayload`).
 *
 * NOTE: This module is owned by `@a2a/server-transform` to avoid package cycles
 * (`transform` must not depend on `llm`).
 */

export type ExecutionRef = { action: string; step: string };

const DEFAULT_HINT =
  'Set `step` to the next phase you propose. Use exactly one key in `execute`. The server may normalize `step`.';

/** Directive per `action:step` — injected as `${flowControlHint}`. Keep each entry short and imperative. */
const BY_ACTION_STEP: Record<string, string> = {
  // --- agent (unified mode) ---
  'agent:plan':
    'Understand the task. Ask clarifying questions if needed. Outline your approach in `message`.'
    + ' If repo facts are needed, use `rag-search` or `list-directory`. Advance to `analyze` when plan is clear.',

  'agent:analyze':
    'Gather information. Check `ragResults` and `context.history` for existing info.'
    + ' Use `rag-search`, `read-file`, or `list-directory` as needed. Advance to `execute` when you have enough info.',

  'agent:execute':
    'Perform the task. Use `write-file`, `execute-command`, or other tools as needed.'
    + ' Check `workbench.sections` for checklist/plan. Advance to `review` when done.',

  'agent:review':
    'Verify the results. Check `context.history` for what was done.'
    + ' Use `read-file` or `execute-command` to verify. If issues found, go back to `execute`. Otherwise advance.',

  'agent:completed':
    'Set `completed: true`. Summarize what was accomplished in `message`. Empty `execute`.',

  'agent:*': 'Use exactly one tool key in `execute`. Advance `step` when the current goal is satisfied.',

  // --- dialog ---
  'dialog:request':
    'Read `context.history` to avoid repeating information already given.'
    + ' Default: `message` + `execute.form`. If the user needs repo facts not already in history/`ragResults`, use **one** tool in `execute` (`rag-search`, `read-file`, `write-file`, `list-directory`, `grep-search`, `execute-command`, or `script`) and a short `message`.',

  'dialog:response':
    'Ground answers in `context.history`. Prefer chat + form; use a single tool key in `execute` only when the codebase must be consulted. Stay concise.',

  'dialog:*':
    "Reply in the user's language. Optional RAG/tools when necessary — see system prompt patterns A/B. Output only the JSON block.",

  // --- router / task ---
  'task:router': 'Return the ranked-choices JSON shape. Do not call tools.',

  'task:new': 'Set up the chosen mode. Follow the response schema for this action.',
};

function normalizeToken(x: string | undefined): string {
  if (typeof x !== 'string' || !x.trim()) return '*';
  return x.trim();
}

export function readExecutionRef(root: Record<string, unknown>): ExecutionRef {
  const ctx = root['context'] as Record<string, unknown> | undefined;
  const ex = ctx?.['execution'] as Record<string, unknown> | undefined;
  const action = normalizeToken(ex?.['action'] as string | undefined);
  const step = normalizeToken(ex?.['step'] as string | undefined);
  if (action !== '*') return { action, step };
  const topAction = normalizeToken(root['action'] as string | undefined);
  return { action: topAction, step };
}

const FLOW_HINT_ACTION_ALIASES: Record<string, string> = {
  'auto-ai-v2': 'agent',
  'coder-smart': 'agent',
  'coder-smart-v2': 'agent',
  analyze: 'agent',
  coder: 'agent',
  'auto-ai': 'agent',
};

export function resolveFlowControlHintMarkdown(ref: ExecutionRef): string {
  const action = FLOW_HINT_ACTION_ALIASES[ref.action] ?? ref.action;
  const step = ref.step;
  const keys = [`${action}:${step}`, `${action}:*`, `*:${step}`, '*:*'];
  for (const k of keys) {
    const h = BY_ACTION_STEP[k];
    if (h) return h;
  }
  return DEFAULT_HINT;
}

/** Sets `flowControlHint` on the invoke root for `${flowControlHint}` in markdown templates. */
export function attachFlowControlHintToInvokePayload(root: Record<string, unknown>): void {
  root['flowControlHint'] = resolveFlowControlHintMarkdown(readExecutionRef(root));
}

