/** Context protocol version support. */

export const SUPPORTED_CONTEXT_VERSIONS = ['1.0'] as const;
export type ContextVersion = (typeof SUPPORTED_CONTEXT_VERSIONS)[number];

export function getContextVersion(block: { version?: string }): ContextVersion | null {
  const v = block.version;
  if (v === '1.0') return '1.0';
  return null;
}

export function isSupportedContextVersion(v: string): v is ContextVersion {
  return SUPPORTED_CONTEXT_VERSIONS.includes(v as ContextVersion);
}
