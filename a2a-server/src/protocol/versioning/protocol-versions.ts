/**
 * Protocol Versions
 * Defines current protocol version for request/response parsing
 */

export const CURRENT_PROTOCOL_VERSION = '2.0';
export const SUPPORTED_PROTOCOL_VERSIONS = ['1.0', '2.0'];

/**
 * Check if version is supported
 */
export function isSupportedVersion(version: string): boolean {
    return SUPPORTED_PROTOCOL_VERSIONS.includes(version);
}
