/**
 * Shared rules for assistant-line placement vs tools (LLM JSON and invoke-shaped payloads).
 * Input: object with optional top-level `message` and optional `execute`.
 */

export const TOOL_KEYS = new Set([
  'rag-search',
  'read-file',
  'write-file',
  'list-directory',
  'grep-search',
  'execute-command',
  'script',
  'file-exists',
  'edit-patch',
  'run-script',
  'dialog',
]);

export function toolKeysInExecute(ex) {
  if (!ex || typeof ex !== 'object' || Array.isArray(ex)) return [];
  return Object.keys(ex).filter((k) => TOOL_KEYS.has(k));
}

/**
 * @param {Record<string, unknown>} j
 * @returns {{ code: string; detail: string }[]}
 */
export function analyzeLlmExecuteShape(j) {
  const issues = [];
  if (!j || typeof j !== 'object' || Array.isArray(j)) {
    return issues;
  }

  const topMsg = typeof j.message === 'string' ? j.message.trim() : '';
  const ex = j.execute;
  if (ex === undefined || ex === null) {
    return issues;
  }
  if (typeof ex !== 'object' || Array.isArray(ex)) {
    return issues;
  }

  const tools = toolKeysInExecute(ex);
  const exMsg = typeof ex.message === 'string' ? ex.message.trim() : '';
  const hasForm = ex.form !== undefined && ex.form !== null;

  if (topMsg && tools.length > 0) {
    issues.push({
      code: 'TOP_LEVEL_MESSAGE_WITH_TOOL',
      detail: `tools=[${tools.join(',')}] — move assistant line to execute.message next to tool`,
    });
  }

  if (topMsg && exMsg && topMsg === exMsg) {
    issues.push({
      code: 'DUPLICATE_TOP_AND_EXECUTE_MESSAGE',
      detail: hasForm || tools.length ? 'same text in two places' : 'same text; execute should use form or tool, not message-only',
    });
  }

  if (topMsg && exMsg && topMsg !== exMsg && tools.length > 0) {
    issues.push({
      code: 'TOP_AND_EXECUTE_MESSAGE_MISMATCH',
      detail: 'top-level message differs from execute.message while tools present',
    });
  }

  if (
    Object.keys(ex).length === 1 &&
    exMsg &&
    !hasForm &&
    tools.length === 0 &&
    !(topMsg && topMsg === exMsg)
  ) {
    issues.push({
      code: 'EXECUTE_MESSAGE_ONLY',
      detail: 'execute has only message string — expected form or tool keys',
    });
  }

  return issues;
}
