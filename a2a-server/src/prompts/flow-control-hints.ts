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
    'Narrow scope in `message`. Check `context.history` for prior clarifications before asking again.'
    + ' Use `rag-search` or `list-directory` only if grounding is needed. Advance `step` to `locate_code` when the plan is clear.',

  'auto-ai:locate_code':
    'Check `ragResults` — if relevant hits exist, use them instead of a new search.'
    + ' Otherwise one `rag-search` (stable query) or `list-directory`. Do not read or edit files yet. Advance to `inspect_structure` or `read_code`.',

  'auto-ai:inspect_structure':
    'Check `workbench.sections` for any already-mapped layout before listing again.'
    + ' One `list-directory` or a single `read-file` on an obvious entry file. Advance to `read_code`.',

  'auto-ai:read_code':
    'Check `context.history` for files already read — do not re-read them.'
    + ' One `read-file` per turn. When behavior is understood, advance `step` to `edit_code`.',

  'auto-ai:edit_code':
    'Read `workbench.sections` for the plan/checklist before writing.'
    + ' One `write-file` (or the single matching tool). Keep the edit minimal and style-consistent. Advance to `run_lint` or `run_tests`.',

  'auto-ai:locate_tests':
    'Check `context.history` for test paths already found.'
    + ' One `grep-search` or `list-directory` under test roots. Advance to `read_tests`.',

  'auto-ai:read_tests':
    'Check `context.history` for test files already read — skip them.'
    + ' One `read-file` per turn until expectations are clear. Advance to `edit_tests`.',

  'auto-ai:edit_tests':
    'Read `workbench.sections` for the checklist item being addressed.'
    + ' One `write-file` per turn. Advance to `run_tests` when done.',

  'auto-ai:run_lint':
    'One `execute-command` for lint/format. Interpret output in `message`; go to `edit_code` if fixes needed, else advance.',

  'auto-ai:run_tests':
    'One `execute-command` for tests. On failure go to `read_code`/`edit_code`/`edit_tests`; on pass advance to `final_review`.',

  'auto-ai:write_report':
    'Use `workbench.slots.reportPath` or `context.task` for the target path.'
    + ' One `write-file`. Advance to `final_review`.',

  'auto-ai:final_review':
    'Scan `context.history` for unresolved items before closing.'
    + ' No new tools unless a blocking gap exists. Consolidate status in `message`; advance to `completed`.',

  'auto-ai:completed':
    'Set `completed: true`. Omit or empty `execute`. Short wrap-up in `message`.',

  'auto-ai:*':
    'Exactly one tool key in `execute`. Set `step` to the next phase from the system-prompt list.',

  // --- dialog ---
  'dialog:request':
    'Read `context.history` to avoid repeating information already given.'
    + ' Default: `message` + `execute.form`. If the user needs repo facts not already in history/`ragResults`, use **one** tool in `execute` (`rag-search`, `read-file`, `write-file`, `list-directory`, `grep-search`, `execute-command`, or `script`) and a short `message`.',

  'dialog:response':
    'Ground answers in `context.history`. Prefer chat + form; use a single tool key in `execute` only when the codebase must be consulted. Stay concise.',

  'dialog:*':
    'Reply in the user\'s language. Optional RAG/tools when necessary — see system prompt patterns A/B. Output only the JSON block.',

  // --- coder ---
  'coder:clarify':
    'Check `ragResults` for existing hits before issuing a new search.'
    + ' One `rag-search` (focused query) or `read-file` if the path is known. Advance to `research-plan`.',

  'coder:research-plan':
    'Synthesize `ragResults` and `context.history` into `message`. At most one tool if facts are still missing. Advance to `checklist`.',

  'coder:checklist':
    'Write checklist items into `workbench.sections` (not only `message`) so `execute-item` can read them.'
    + ' Use a tool only if evidence is needed. Advance to `write-doc`.',

  'coder:write-doc':
    'Read `workbench.sections` to compose the document. One `write-file` to `.carrier/tasks/`. Advance to `execute-item`.',

  'coder:execute-item':
    'Read `workbench.sections` to find the first unchecked item — do not re-execute completed ones.'
    + ' One tool (`read-file`, `write-file`, or `execute-command`). Mark item done in `workbench.sections`. Advance to `completed` when all items are checked.',

  'coder:completed':
    'Set `completed: true`. Summarize outcomes from `workbench.sections` in `message`. Empty `execute`.',

  'coder:*':
    'One action-key in `execute` per turn. Advance `step` when the current micro-goal is satisfied.',

  // --- analyze ---
  'analyze:search':
    'Check `ragResults` — if relevant hits already exist, skip the search and advance to `read`.'
    + ' Otherwise one `rag-search` with an architecture-oriented query.',

  'analyze:read':
    'Check `context.history` for files already read — do not re-read them.'
    + ' One `read-file` to verify a specific doc or source file. Advance to `continue` or `save`.',

  'analyze:continue':
    'Review `workbench.sections` for gaps. One more search/read if gaps remain; otherwise summarize in `message` and advance to `save`.',

  'analyze:save':
    'Use `workbench.slots.reportPath` or `context.task` for the target path.'
    + ' One `write-file` for the analysis report. Advance to `completed`.',

  'analyze:completed':
    'Set `completed: true`. Wrap up findings from `workbench.sections` in `message`.',

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

const FLOW_HINT_ACTION_ALIASES: Record<string, string> = {
  'auto-ai-v2': 'auto-ai',
  'coder-smart': 'coder',
  'coder-smart-v2': 'coder',
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
