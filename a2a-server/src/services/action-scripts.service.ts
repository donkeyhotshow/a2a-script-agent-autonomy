/** Resolve executable script for an action (from registry/definitions). */

export interface ActionScriptResult {
  code: string;
  language: 'typescript' | 'javascript';
  subActionId?: string;
}

export function getScriptForAction(
  _actionId: string,
  _subActionId?: string,
  _registry?: { getCode?: (id: string, subId?: string) => string | null }
): ActionScriptResult | null {
  const code = _registry?.getCode?.(_actionId, _subActionId);
  if (typeof code !== 'string' || code.trim() === '') return null;
  return {
    code: code.trim(),
    language: 'typescript',
    subActionId: _subActionId,
  };
}
