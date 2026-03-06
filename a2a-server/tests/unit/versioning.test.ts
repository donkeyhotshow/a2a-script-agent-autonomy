/**
 * Unit tests for Protocol Versioning System
 */

import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSIONS,
  CURRENT_PROTOCOL_VERSION,
  MIN_SUPPORTED_VERSION,
  getVersionInfo,
  isSupportedVersion,
  needsMigration,
  compareVersions,
  getMigrationPath,
  isValidVersionFormat
} from '../src/protocol/versioning/protocol-versions.js';

import {
  transformData,
  validateForVersion,
  detectVersion,
  normalizeToCurrentVersion
} from '../src/protocol/versioning/transform-governance.js';

import {
  isLegacyFormat,
  convertCamelToSnake,
  convertSnakeToCamel,
  transformLegacyRequest,
  transformLegacyResponse,
  applyCompatibility,
  isDeprecatedVersion,
  adaptActionKey
} from '../src/protocol/versioning/backwards-compat.js';

describe('Protocol Versions', () => {
  it('should have correct protocol versions', () => {
    expect(PROTOCOL_VERSIONS).toContain('1.0');
    expect(PROTOCOL_VERSIONS).toContain('1.1');
    expect(PROTOCOL_VERSIONS).toContain('2.0');
  });

  it('should return correct version info', () => {
    const info = getVersionInfo();
    expect(info.current).toBe('2.0');
    expect(info.minSupported).toBe('1.0');
    expect(info.supported).toEqual(['1.0', '1.1', '2.0']);
  });

  it('should check supported versions', () => {
    expect(isSupportedVersion('1.0')).toBe(true);
    expect(isSupportedVersion('1.1')).toBe(true);
    expect(isSupportedVersion('2.0')).toBe(true);
    expect(isSupportedVersion('3.0')).toBe(false);
    expect(isSupportedVersion('0.9')).toBe(false);
  });

  it('should check if migration needed', () => {
    expect(needsMigration('1.0')).toBe(true);
    expect(needsMigration('1.1')).toBe(true);
    expect(needsMigration('2.0')).toBe(false);
    expect(needsMigration('3.0')).toBe(true);
  });

  it('should compare versions correctly', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0);
    expect(compareVersions('1.0', '1.1')).toBe(-1);
    expect(compareVersions('1.1', '1.0')).toBe(1);
    expect(compareVersions('2.0', '1.1')).toBe(1);
    expect(compareVersions('1.0', '2.0')).toBe(-1);
  });

  it('should get migration path', () => {
    expect(getMigrationPath('1.0', '2.0')).toEqual(['1.0', '1.1', '2.0']);
    expect(getMigrationPath('1.0', '1.1')).toEqual(['1.0', '1.1']);
    expect(getMigrationPath('1.1', '2.0')).toEqual(['1.1', '2.0']);
    expect(getMigrationPath('2.0', '2.0')).toEqual([]);
    expect(getMigrationPath('2.0', '1.0')).toEqual([]);
  });

  it('should validate version format', () => {
    expect(isValidVersionFormat('1.0')).toBe(true);
    expect(isValidVersionFormat('1.0.0')).toBe(true);
    expect(isValidVersionFormat('2.0')).toBe(true);
    expect(isValidVersionFormat('2.0.1')).toBe(true);
    expect(isValidVersionFormat('v1.0')).toBe(false);
    expect(isValidVersionFormat('1')).toBe(false);
    expect(isValidVersionFormat('')).toBe(false);
    expect(isValidVersionFormat(123)).toBe(false);
  });
});

describe('Transform Governance', () => {
  it('should transform data to target version', () => {
    const data = { version: '1.0', session_id: 'test' };
    const result = transformData(data, { targetVersion: '2.0' });
    expect(result.success).toBe(true);
    expect(result.version).toBe('2.0');
  });

  it('should handle already current version', () => {
    const data = { version: '2.0', session_id: 'test' };
    const result = transformData(data, { targetVersion: '2.0' });
    expect(result.success).toBe(true);
    expect(result.version).toBe('2.0');
  });

  it('should reject unsupported versions', () => {
    const data = { version: '3.0', session_id: 'test' };
    const result = transformData(data, { targetVersion: '2.0' });
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Unsupported protocol version: 3.0');
  });

  it('should detect version from data', () => {
    expect(detectVersion({ version: '1.0', session_id: 'test' })).toBe('1.0');
    expect(detectVersion({ version: '2.0', session_id: 'test' })).toBe('2.0');
    expect(detectVersion({ session_id: 'test' })).toBe(null);
  });

  it('should detect legacy format', () => {
    expect(detectVersion({ actions: [], session_id: 'test' })).toBe('1.0');
    // Note: proposedActions detection removed - use canonical format
  });

  it('should normalize to current version', () => {
    const data = { version: '1.0', session_id: 'test' };
    const result = normalizeToCurrentVersion(data);
    expect(result.success).toBe(true);
    expect(result.version).toBe('2.0');
  });

  it('should validate for specific version', () => {
    const valid = { version: '2.0', session_id: 'test' };
    expect(validateForVersion(valid, '2.0').valid).toBe(true);

    const invalid = { session_id: 'test' };
    const result = validateForVersion(invalid, '2.0');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: version');
  });
});

describe('Backwards Compatibility', () => {
  it('should detect legacy format', () => {
    expect(isLegacyFormat({ actions: [] })).toBe(true);
    // Note: proposedActions detection removed - use canonical format
    expect(isLegacyFormat({ content: 'test' })).toBe(true);
    expect(isLegacyFormat({ sessionId: 'test' })).toBe(true);
    expect(isLegacyFormat({ version: '2.0', session_id: 'test' })).toBe(false);
  });

  it('should convert camelCase to snake_case', () => {
    expect(convertCamelToSnake({ sessionId: 'test' })).toEqual({ session_id: 'test' });
    expect(convertCamelToSnake({ taskId: '123', requestId: '456' })).toEqual({ task_id: '123', request_id: '456' });
    expect(convertCamelToSnake({ nested: { sessionId: 'test' } })).toEqual({ nested: { session_id: 'test' } });
    expect(convertCamelToSnake([{ sessionId: 'test' }])).toEqual([{ session_id: 'test' }]);
  });

  it('should convert snake_case to camelCase', () => {
    expect(convertSnakeToCamel({ session_id: 'test' })).toEqual({ sessionId: 'test' });
    expect(convertSnakeToCamel({ task_id: '123' })).toEqual({ taskId: '123' });
  });

  it('should transform legacy request', () => {
    const legacy = {
      actions: ['action1', 'action2'],
      sessionId: 'test'
    };

    const result = transformLegacyRequest(legacy);
    expect(result).toHaveProperty('context');
    expect((result as any).context.actions).toEqual(['action1', 'action2']);
    // Note: proposedActions removed - use canonical format
    expect((result as any).session_id).toBe('test');
  });

  it('should transform legacy response', () => {
    const legacy = { content: 'Hello world' };
    const result = transformLegacyResponse(legacy);
    expect(result).toHaveProperty('result');
    expect((result as any).version).toBe('2.0');
  });

  it('should apply compatibility transformations', () => {
    const legacy = { sessionId: 'test', version: '1.0' };
    const result = applyCompatibility(legacy);
    expect(result).toHaveProperty('session_id');
    expect((result as any).version).toBe('2.0');
  });

  it('should check deprecated versions', () => {
    expect(isDeprecatedVersion('0.9')).toBe(true);
    expect(isDeprecatedVersion('0.8')).toBe(true);
    expect(isDeprecatedVersion('1.0')).toBe(false);
    expect(isDeprecatedVersion('2.0')).toBe(false);
  });

  it('should adapt action key', () => {
    // Already correct format
    expect(adaptActionKey({ form: { input: {} } })).toEqual({ form: { input: {} } });
    
    // Legacy format
    expect(adaptActionKey({ action: 'script', data: {} })).toEqual({ script: { data: {} } });
    expect(adaptActionKey({ content: 'test' })).toEqual({ message: { content: 'test' } });
  });
});
