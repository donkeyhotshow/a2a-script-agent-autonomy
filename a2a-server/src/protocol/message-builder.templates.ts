/** Message templates (skeleton objects). */

export function templateClientMessage(sessionId: string): Record<string, unknown> {
  return { version: '1.0', session_id: sessionId };
}

export function templateServerMessage(sessionId: string): Record<string, unknown> {
  return { version: '1.0', session_id: sessionId, direction: 'SERVER_TO_CLIENT' };
}
