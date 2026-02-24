/** API key validation (prefix + optional lookup). */

export function isApiKeyFormat(key: string, prefix = 'sk_a2a_'): boolean {
  return typeof key === 'string' && key.startsWith(prefix) && key.length > prefix.length;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

export async function validateApiKey(_key: string): Promise<{ valid: boolean; userId?: string }> {
  return { valid: false };
}

