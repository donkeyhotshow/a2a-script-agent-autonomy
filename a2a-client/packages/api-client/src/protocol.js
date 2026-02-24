/**
 * A2A Protocol - context and file block handling per requirements.md
 * §3.2 Block types: context (required), file, file:path:start-end
 * §5.1 Context schema, §5.2 File block format
 *
 * Client does not alter context returned by server: when continuing or iterating,
 * send back server-provided context (e.g. graph) as-is; only add new fields (step_result, step_id, code_blocks).
 */

const VERSION = '1.0';

/**
 * Build context block for new task
 * @param {string} sessionId
 * @param {string[]} newTask - [task text, hints, ...]
 * @param {string[]} [architecturalFeatures]
 */
function buildNewTaskContext(sessionId, newTask, architecturalFeatures) {
  const ctx = { version: VERSION, session_id: sessionId, new_task: newTask };
  if (architecturalFeatures?.length) ctx.architectural_features = architecturalFeatures;
  return ctx;
}

/**
 * Build context for "Делаем" (continue)
 */
function buildContinueContext(sessionId) {
  return { version: VERSION, session_id: sessionId, continue: true };
}

/**
 * Build context for confirm (verification of applied changes)
 */
function buildConfirmContext(sessionId) {
  return { version: VERSION, session_id: sessionId, confirm: true };
}

/**
 * Build context for file response (minimal)
 */
function buildFileResponseContext(sessionId) {
  return { version: VERSION, session_id: sessionId };
}

/**
 * Serialize file block to markdown format per §5.2
 * ```file:path or ```file:path:start-end
 */
function serializeFileBlock(path, content, startLine, endLine) {
  const sig = endLine != null ? `${path}:${startLine}-${endLine}` : path;
  return `\`\`\`file:${sig}\n${content}\n\`\`\``;
}

/**
 * Parse file block from markdown
 * @returns {{ path: string, content: string, startLine?: number, endLine?: number } | null}
 */
function parseFileBlock(text) {
  const m = text.match(/^```file:([^\n]+)\n([\s\S]*?)```$/m);
  if (!m) return null;
  const [, sig, content] = m;
  const rangeMatch = sig.match(/^(.+):(\d+)-(\d+)$/);
  if (rangeMatch) {
    return { path: rangeMatch[1], content: content.trim(), startLine: +rangeMatch[2], endLine: +rangeMatch[3] };
  }
  return { path: sig, content: content.trim() };
}

/**
 * Serialize message to markdown (context + file blocks)
 */
function serializeMessage(context, files = []) {
  const parts = [`\`\`\`context\n${JSON.stringify(context, null, 0)}\n\`\`\``];
  for (const f of files) {
    parts.push(serializeFileBlock(f.path, f.content, f.startLine, f.endLine));
  }
  return parts.join('\n\n');
}

/**
 * Parse message from markdown
 */
function parseMessage(text) {
  const contextMatch = text.match(/```context\n([\s\S]*?)```/);
  if (!contextMatch) return null;
  let context;
  try {
    context = JSON.parse(contextMatch[1].trim());
  } catch {
    return null;
  }
  const files = [];
  const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let m;
  while ((m = fileRegex.exec(text)) !== null) {
    const sig = m[1];
    const content = m[2].trim();
    const rangeMatch = sig.match(/^(.+):(\d+)-(\d+)$/);
    if (rangeMatch) {
      files.push({ path: rangeMatch[1], content, startLine: +rangeMatch[2], endLine: +rangeMatch[3] });
    } else {
      files.push({ path: sig, content });
    }
  }
  return { context, files };
}

module.exports = {
  VERSION,
  buildNewTaskContext,
  buildContinueContext,
  buildConfirmContext,
  buildFileResponseContext,
  serializeFileBlock,
  parseFileBlock,
  serializeMessage,
  parseMessage,
};
