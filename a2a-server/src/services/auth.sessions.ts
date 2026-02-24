/** Session/token helpers. */

export function createSessionToken(_userId: string, _expiresIn?: string): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseSessionToken(_token: string): { userId?: string; exp?: number } | null {
  return null;
}

