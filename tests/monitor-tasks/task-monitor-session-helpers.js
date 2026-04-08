import { _userMessageIsRouterChoiceId } from './task-monitor-utils.js';

/** Merge `messages` vs `context.history`: longer history must not hide assistant lines that exist only on `messages`. */
export function sessionTimelineEntries(sessionData) {
  const msgs = Array.isArray(sessionData?.messages) ? sessionData.messages : [];
  const hist = sessionData?.context?.history;
  if (!Array.isArray(hist) || hist.length === 0) return msgs;
  const fromHist = hist
    .map((item) => {
      const content = String(item?.message || item?.content || '').trim();
      if (!content) return null;
      const role = String(item?.role || 'assistant').toLowerCase();
      return { role, content };
    })
    .filter(Boolean);
  const assistantCount = (arr) =>
    arr.filter(
      (m) =>
        m &&
        String(m.role || '').toLowerCase() === 'assistant' &&
        String(m.content || '').trim().length > 0
    ).length;
  if (fromHist.length > msgs.length) {
    const acM = assistantCount(msgs);
    const acH = assistantCount(fromHist);
    if (acM > acH || (acM > 0 && acH === 0)) return msgs;
  }
  return fromHist.length > msgs.length ? fromHist : msgs;
}

/**
 * Public GET /sessions/:id includes `messages`. When execute stays `agent`/`request` without `context.result`,
 * accept completion only if we see **agent-pipeline** output — not router-only assistant text.
 * - If timeline has a user line choosing `agent` (etc.), prefer assistant **after** that index.
 * - If none yet, but **2+** assistant lines exist overall (e.g. timeline ordering), accept.
 * - Else (seeded agent / odd shapes): require **2+** short assistants or **1** assistant ≥ `longChars`.
 */
export function sessionHasAssistantAfterAgentChoice(sessionData, taskDescription, minChars = 20, longChars = 80) {
  const loose =
    /^(1|true|yes)$/i.test(String(process.env.TASK_MONITOR_ASSISTANT_LOOSE ?? '').trim());
  if (loose) {
    const msgs = sessionTimelineEntries(sessionData);
    return msgs.some(
      (m) =>
        m &&
        String(m.role || '').toLowerCase() === 'assistant' &&
        String(m.content || '').trim().length >= minChars
    );
  }

  const msgs = sessionTimelineEntries(sessionData);
  if (msgs.length === 0) return false;

  let lastChoiceIdx = -1;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (String(m?.role || '').toLowerCase() !== 'user') continue;
    if (_userMessageIsRouterChoiceId(m?.content)) {
      lastChoiceIdx = i;
    }
  }

  const assistantOk = (m) =>
    m &&
    String(m.role || '').toLowerCase() === 'assistant' &&
    String(m.content || '').trim().length >= minChars;

  // Agent `step=request`: task text was already accepted; idle + same form must not re-POST every poll (Orange alert loop).
  const POST_ROUTER_ASSISTANT_MIN = 12;
  if (lastChoiceIdx >= 0) {
    for (let j = lastChoiceIdx + 1; j < msgs.length; j++) {
      const m = msgs[j];
      if (
        m &&
        String(m.role || '').toLowerCase() === 'assistant' &&
        String(m.content || '').trim().length >= POST_ROUTER_ASSISTANT_MIN
      ) {
        return true;
      }
    }
    return false;
  }

  const assistants = msgs.filter((m) => assistantOk(m));
  if (assistants.length >= 2) return true;
  if (assistants.length === 1 && String(assistants[0].content || '').trim().length >= longChars) {
    return true;
  }

  const stub = (taskDescription || '').trim().slice(0, 48);
  if (stub.length < 12) return false;
  let sawTaskUser = false;
  for (const m of msgs) {
    const role = String(m?.role || '').toLowerCase();
    const content = String(m?.content || '');
    if (role === 'user' && content.includes(stub.slice(0, 24))) {
      sawTaskUser = true;
      continue;
    }
    if (sawTaskUser && assistantOk(m)) {
      return true;
    }
  }
  return false;
}

/**
 * When `step=request` and Agent Mode, `messages` can lag behind `execute` / `context.execution`
 * (hydrated via includeContext). Treat visible pipeline text as evidence the agent turn produced output.
 */
export function sessionHasVisibleAgentPipelineContent(sessionData) {
  const ex = sessionData?.execute || sessionData?.context?.execution || null;
  if (!ex || typeof ex !== 'object') return false;
  const lm = ex.llmMessage;
  if (typeof lm === 'string' && lm.trim().length >= 12) return true;
  if (lm && typeof lm === 'object') {
    const c = lm.content ?? lm.text ?? lm.message;
    if (typeof c === 'string' && c.trim().length >= 12) return true;
  }
  const m = ex.message;
  if (typeof m === 'string' && m.trim().length >= 12) return true;
  return false;
}

/** True when the user task stub appears and the router recorded **agent** (user or system line). */
function _timelineHasAgentRouterChoice(msgs) {
  for (const m of msgs) {
    const role = String(m?.role || '').toLowerCase();
    const content = String(m?.content || '');
    if (role === 'system' && /\bchoice:\s*agent\b/i.test(content)) return true;
    if (role !== 'user') continue;
    const t = content.trim().toLowerCase();
    if (t === 'agent') return true;
    try {
      const j = JSON.parse(content.trim());
      if (j && typeof j === 'object' && String(j.choice || '').trim().toLowerCase() === 'agent') {
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Router may emit **system** `choice: agent` (not a user line), so `sessionHasAssistantAfterAgentChoice`
 * never sees `lastChoiceIdx` and no assistant exists **after** that line yet. For monitor verification
 * tasks, task stub + recorded agent choice is enough when execution is already `agent`/`request` + idle.
 */
export function sessionRouterAgentChoiceWithTaskStub(sessionData, taskDescription) {
  const stub = (taskDescription || '').trim().slice(0, 48);
  if (stub.length < 12) return false;
  const stubPrefix = stub.slice(0, 24);
  const msgs = sessionTimelineEntries(sessionData);
  let sawTaskUser = false;
  for (const m of msgs) {
    const role = String(m?.role || '').toLowerCase();
    const content = String(m?.content || '');
    if (role === 'user' && content.includes(stubPrefix)) {
      sawTaskUser = true;
      break;
    }
  }
  if (!sawTaskUser) return false;
  return _timelineHasAgentRouterChoice(msgs);
}