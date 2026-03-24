/**
 * Phase-specific instructions for the LLM, keyed by `context.execution.action` + `context.execution.step`.
 * Injected into request templates as `${flowControlHint}` (see `attachFlowControlHintToInvokePayload`).
 */

export type ExecutionRef = { action: string; step: string };

const DEFAULT_HINT =
  'Set `step` to the next phase you propose. Use exactly one key in `execute`. The server may normalize `step`.';

/** Directive per `action:step` — injected as `${flowControlHint}`. Keep each entry short and imperative. */
const BY_ACTION_STEP: Record<string, string> = {
  // --- auto-ai ---
  'auto-ai:plan':
    'Narrow scope in `message`. Use `rag-search` or `list-directory` only if grounding is needed. Advance `step` to `locate_code` when the plan is clear.',
  'auto-ai:locate_code':
    'One `rag-search` (stable query) or `list-directory` to find entrypoints. Do not read or edit files yet. Advance to `inspect_structure` or `read_code`.',
  'auto-ai:inspect_structure':
    'One `list-directory` or a single `read-file` on an obvious entry file. Map layout; advance to `read_code`.',
  'auto-ai:read_code':
    'One `read-file` per turn. When behavior is understood, advance `step` to `edit_code`.',
  'auto-ai:edit_code':
    'One `write-file` (or the single matching tool). Keep the edit minimal and style-consistent. Advance to `run_lint` or `run_tests`.',
  'auto-ai:locate_tests':
    'One `grep-search` or `list-directory` under test roots. Advance to `read_tests`.',
  'auto-ai:read_tests':
    'One `read-file` per turn until test expectations are clear. Advance to `edit_tests`.',
  'auto-ai:edit_tests':
    'One `write-file` per turn. Advance to `run_tests` when done.',
  'auto-ai:run_lint':
    'One `execute-command` for lint/format. Interpret output in `message`; go to `edit_code` if fixes needed, else advance.',
  'auto-ai:run_tests':
    'One `execute-command` for tests. On failure go to `read_code`/`edit_code`/`edit_tests`; on pass advance to `final_review`.',
  'auto-ai:write_report':
    'One `write-file` to the requested report path. Advance to `final_review`.',
  'auto-ai:final_review':
    'No new tools unless a blocking gap exists. Consolidate status in `message`; advance to `completed`.',
  'auto-ai:completed':
    'Set `completed: true`. Omit or empty `execute`. Short wrap-up in `message`.',
  'auto-ai:*':
    'Exactly one tool key in `execute`. Set `step` to the next phase from the system-prompt list.',

  // --- dialog ---
  'dialog:request':
    'Answer in `message`. Include `execute.form` for follow-up input unless the task is done.',
  'dialog:response':
    'Stay concise. Use `context.history` only; no tool keys unless the flow explicitly allows them.',
  'dialog:*':
    'Reply in the user\'s language. Ground answers in `context.history`. Output only the JSON block.',

  // --- coder ---
  'coder:clarify':
    'One `rag-search` (focused query) or `read-file` if the path is known. Advance to `research-plan`.',
  'coder:research-plan':
    'Synthesize findings in `message`. At most one tool if facts are still missing. Advance to `checklist`.',
  'coder:checklist':
    'List concrete checklist items in `message`. Use a tool only if evidence is needed. Advance to `write-doc`.',
  'coder:write-doc':
    'One `write-file` to `.carrier/tasks/`. Advance to `execute-item`.',
  'coder:execute-item':
    'One tool (`read-file`, `write-file`, or `execute-command`) for the next unchecked item. Repeat until all items done, then advance to `completed`.',
  'coder:completed':
    'Set `completed: true`. Summarize outcomes in `message`. Empty `execute`.',
  'coder:*':
    'One action-key in `execute` per turn. Advance `step` when the current micro-goal is satisfied.',

  // --- analyze ---
  'analyze:search':
    'One `rag-search` with an architecture-oriented query. Advance to `read` or `continue`.',
  'analyze:read':
    'One `read-file` to verify a specific doc or source file. Advance to `continue` or `save`.',
  'analyze:continue':
    'One more search/read if gaps remain; otherwise summarize in `message` and advance to `save`.',
  'analyze:save':
    'One `write-file` for the analysis report. Advance to `completed`.',
  'analyze:completed':
    'Set `completed: true`. Wrap up in `message`.',
  'analyze:*':
    'Prefer `rag-search` before `read-file`. One tool per turn; advance `step` when the sub-goal is met.',

  // --- router / task ---
  'task:router':
    'Return the ranked-choices JSON shape. Do not call tools.',
  'task:new':
    'Set up the chosen mode. Follow the response schema for this action.',
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

/** Same phases as `auto-ai`; separate simulation id for context-v2 golden (ISSUE 9). */
const FLOW_HINT_ACTION_ALIASES: Record<string, string> = {
  'auto-ai-v2': 'auto-ai',
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
