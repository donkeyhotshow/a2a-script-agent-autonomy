/**
 * Protocol Versioning System
 * 
 * Manages protocol versions, migrations, and backwards compatibility.
 */

export const PROTOCOL_VERSIONS = ['1.0', '1.1', '2.0'] as const;
export type ProtocolVersion = (typeof PROTOCOL_VERSIONS)[number];

export const CURRENT_PROTOCOL_VERSION: ProtocolVersion = '2.0';
export const MIN_SUPPORTED_VERSION: ProtocolVersion = '1.0';

/**
 * Version info for API responses
 */
export interface VersionInfo {
  version: ProtocolVersion;
  minSupported: ProtocolVersion;
  current: ProtocolVersion;
  supported: readonly ProtocolVersion[];
  deprecated: readonly ProtocolVersion[];
}

/**
 * Get version info
 */
export function getVersionInfo(): VersionInfo {
  return {
    version: CURRENT_PROTOCOL_VERSION,
    minSupported: MIN_SUPPORTED_VERSION,
    current: CURRENT_PROTOCOL_VERSION,
    supported: PROTOCOL_VERSIONS,
    deprecated: []
  };
}

/**
 * Check if a version is supported
 */
export function isSupportedVersion(version: string): version is ProtocolVersion {
  return PROTOCOL_VERSIONS.includes(version as ProtocolVersion);
}

/**
 * Check if version needs migration
 */
export function needsMigration(version: string): boolean {
  if (!isSupportedVersion(version)) return true;
  return version !== CURRENT_PROTOCOL_VERSION;
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

/**
 * Get migration path from one version to another
 */
export function getMigrationPath(from: string, to: ProtocolVersion): string[] | null {
  if (!isSupportedVersion(from)) return null;
  
  const fromIndex = PROTOCOL_VERSIONS.indexOf(from as ProtocolVersion);
  const toIndex = PROTOCOL_VERSIONS.indexOf(to);
  
  if (fromIndex === -1 || toIndex === -1) return null;
  if (fromIndex >= toIndex) return []; // No migration needed
  
  return PROTOCOL_VERSIONS.slice(fromIndex, toIndex);
}

/**
 * Validate version string format
 */
export function isValidVersionFormat(version: unknown): boolean {
  if (typeof version !== 'string') return false;
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}
