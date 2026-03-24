/**
 * Phase-specific instructions for the LLM, keyed by `context.execution.action` + `context.execution.step`.
 * Injected into request templates as `${flowControlHint}` (see `attachFlowControlHintToInvokePayload`).
 */

export type ExecutionRef = { action: string; step: string };

const DEFAULT_HINT = [
  'Use `context.execution.step` as the **current** phase.',
  'In your JSON, set `step` to the phase you are **proposing next** (you may keep the same value or advance).',
  'The server may normalize `step`; still choose the best next phase for one clear tool call in `execute`.'
].join(' ');

/** Longer guidance per `action:step` (exact match wins). */
const BY_ACTION_STEP: Record<string, string> = {
  // --- auto-ai (canonical phases) ---
  'auto-ai:plan':
    '**Phase: plan.** Clarify scope and sub-goals. Prefer `rag-search` or `list-directory` only if you need grounding; otherwise narrow the plan in `message` and pick a concrete next phase in `step`.',
  'auto-ai:locate_code':
    '**Phase: locate_code.** Discover entrypoints. Prefer **one** `rag-search` with a stable query, or `list-directory` at a sensible root. Do not edit files yet.',
  'auto-ai:inspect_structure':
    '**Phase: inspect_structure.** Map layout (dirs, modules). Use `list-directory` or light `read-file` on obvious entry files only.',
  'auto-ai:read_code':
    '**Phase: read_code.** Read minimal files to understand behavior. Exactly **one** `read-file` per turn unless you are sure no further reads are needed—then advance `step` toward `edit_code`.',
  'auto-ai:edit_code':
    '**Phase: edit_code.** Implement changes with **one** `write-file` (or the single tool that matches the change). Keep edits small and consistent with existing style.',
  'auto-ai:locate_tests':
    '**Phase: locate_tests.** Find tests with `grep-search` or `list-directory` under test roots.',
  'auto-ai:read_tests':
    '**Phase: read_tests.** Read one test file per turn until expectations are clear.',
  'auto-ai:edit_tests':
    '**Phase: edit_tests.** Update or add tests with **one** `write-file` per turn.',
  'auto-ai:run_lint':
    '**Phase: run_lint.** Run **one** `execute-command` for lint/format; interpret output in `message` and decide whether to fix (`edit_code`) or proceed.',
  'auto-ai:run_tests':
    '**Phase: run_tests.** Run **one** `execute-command` for tests; if failures, move to `read_code` / `edit_code` / `edit_tests` as needed.',
  'auto-ai:write_report':
    '**Phase: write_report.** Summarize in **one** `write-file` to the requested report path.',
  'auto-ai:final_review':
    '**Phase: final_review.** No new tools unless you spot a blocking gap; otherwise consolidate status in `message` and move toward `completed`.',
  'auto-ai:completed':
    '**Phase: completed.** Task should be finished. Set `completed: true`, omit or empty `execute`, and give a short wrap-up in `message`.',
  'auto-ai:*':
    '**Auto-AI.** Pick **exactly one** tool in `execute`. Propose the next `step` explicitly; prefer the phase list you were given in the system prompt.',

  // --- dialog ---
  'dialog:request':
    '**Dialog (request).** User just sent text; answer in `message` and keep `execute.form` for follow-up unless the task is done.',
  'dialog:response':
    '**Dialog (response).** Stay helpful and concise; same JSON shape; use history only—no tool keys unless the flow allows them.',
  'dialog:*':
    '**Dialog.** Reply in the user language; ground answers in `context.history`; output only the JSON block.',

  // --- coder (coder-smart style phases) ---
  'coder:clarify':
    '**Coder · clarify.** Use **one** `rag-search` with a focused query, or `read-file` if a path is already known.',
  'coder:research-plan':
    '**Coder · research-plan.** Synthesize findings in `message`; use at most **one** tool if you still lack facts.',
  'coder:checklist':
    '**Coder · checklist.** Define concrete checklist items in `message`; tools only if you need evidence for an item.',
  'coder:write-doc':
    '**Coder · write-doc.** Use **one** `write-file` to `.carrier/tasks/` with the agreed plan/checklist.',
  'coder:execute-item':
    '**Coder · execute-item.** Execute the next checklist slice with **one** tool (`read-file`, `write-file`, or `execute-command`).',
  'coder:completed':
    '**Coder · completed.** Set `completed: true`, summarize outcomes, empty `execute`.',
  'coder:*':
    '**Coder.** One action-key in `execute` per turn (`rag-search`, `read-file`, `write-file`, …). Use `step` to show phase; advance when the current micro-goal is satisfied.',

  // --- analyze ---
  'analyze:search':
    '**Analyze · search.** One `rag-search` per turn with a stable architecture-oriented query.',
  'analyze:read':
    '**Analyze · read.** One `read-file` to verify a specific doc or source file.',
  'analyze:continue':
    '**Analyze · continue.** Either one more search/read or move toward summarizing in `message`.',
  'analyze:save':
    '**Analyze · save.** One `write-file` for the analysis report.',
  'analyze:completed':
    '**Analyze · completed.** `completed: true`, wrap up in `message`.',
  'analyze:*':
    '**Analyze.** Prefer `rag-search` for architecture/docs before `read-file`. Single tool per turn; use `step` to track analysis phase.',

  // --- router / task (first hop) ---
  'task:router':
    '**Router.** User chose or is routing a task; return the JSON shape expected for this flow (often ranked actions or the next form step).',
  'task:new':
    '**Task (new).** Treat as setup for the chosen mode; follow the response schema for this action.'
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

export function resolveFlowControlHintMarkdown(ref: ExecutionRef): string {
  const { action, step } = ref;
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
