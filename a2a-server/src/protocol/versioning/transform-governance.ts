/**
 * Transform Governance System
 * 
 * Validates and migrates protocol data between versions.
 */

import {
  ProtocolVersion,
  CURRENT_PROTOCOL_VERSION,
  isSupportedVersion,
  compareVersions
} from './protocol-versions.js';

/**
 * Transform result
 */
export interface TransformResult<T = unknown> {
  success: boolean;
  data?: T;
  version: ProtocolVersion;
  originalVersion?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Transform options
 */
export interface TransformOptions {
  targetVersion?: ProtocolVersion;
  validate?: boolean;
  strict?: boolean;
}

/**
 * Transform validator interface
 */
export interface TransformValidator {
  validate(data: unknown): { valid: boolean; errors: string[] };
}

/**
 * Base transform handler
 */
export abstract class TransformHandler<T = unknown> {
  abstract readonly fromVersion: ProtocolVersion;
  abstract readonly toVersion: ProtocolVersion;
  
  /**
   * Transform data from source version to target version
   */
  abstract transform(data: unknown): TransformResult<T>;
  
  /**
   * Validate transformed data
   */
  validate(data: unknown): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }
}

/**
 * Registry of transform handlers
 */
class TransformRegistry {
  private handlers: Map<string, TransformHandler> = new Map();
  
  register(handler: TransformHandler): void {
    const key = `${handler.fromVersion}-${handler.toVersion}`;
    this.handlers.set(key, handler);
  }
  
  get(from: ProtocolVersion, to: ProtocolVersion): TransformHandler | undefined {
    const key = `${from}-${to}`;
    return this.handlers.get(key);
  }
  
  has(from: ProtocolVersion, to: ProtocolVersion): boolean {
    const key = `${from}-${to}`;
    return this.handlers.has(key);
  }
}

const registry = new TransformRegistry();

/**
 * Register a transform handler
 */
export function registerTransform(handler: TransformHandler): void {
  registry.register(handler);
}

/**
 * Get transform handler
 */
export function getTransformHandler(
  from: ProtocolVersion, 
  to: ProtocolVersion
): TransformHandler | undefined {
  return registry.get(from, to);
}

/**
 * Check if transform is available
 */
export function hasTransform(from: ProtocolVersion, to: ProtocolVersion): boolean {
  return registry.has(from, to);
}

// ============================================
// Legacy to 1.0 Transform (Backward Compatibility)
// ============================================

class LegacyToV1Transform extends TransformHandler {
  readonly fromVersion = '1.0' as ProtocolVersion;
  readonly toVersion = '1.0' as ProtocolVersion;
  
  transform(data: unknown): TransformResult {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        version: '1.0',
        errors: ['Invalid data: must be an object']
      };
    }
    
    const ctx = data as Record<string, unknown>;
    const warnings: string[] = [];
    const result: Record<string, unknown> = {};
    
    // Handle legacy 'actions' field -> context transformation
    if (ctx.actions !== undefined) {
      warnings.push('Legacy "actions" field detected - migrating to context format');
      result.context = {
        actions: ctx.actions,
        version: '1.0'
      };
    }
    
    // Handle legacy 'proposedActions' field
    if (ctx.proposedActions !== undefined) {
      warnings.push('Legacy "proposedActions" field detected');
      if (!result.context) result.context = {};
      (result.context as Record<string, unknown>)['proposedActions'] = ctx.proposedActions;
    }
    
    // Handle legacy 'subActions' field
    if (ctx.subActions !== undefined) {
      warnings.push('Legacy "subActions" field detected');
      if (!result.context) result.context = {};
      (result.context as Record<string, unknown>)['subActions'] = ctx.subActions;
    }
    
    // Handle legacy 'executingAction' field
    if (ctx.executingAction !== undefined) {
      warnings.push('Legacy "executingAction" field detected');
      if (!result.context) result.context = {};
      (result.context as Record<string, unknown>)['executingAction'] = ctx.executingAction;
    }
    
    // Handle legacy 'dslScript' field
    if (ctx.dslScript !== undefined) {
      warnings.push('Legacy "dslScript" field detected - moving to context');
      if (!result.context) result.context = {};
      (result.context as Record<string, unknown>)['dslScript'] = ctx.dslScript;
    }
    
    // Copy other fields
    for (const key of Object.keys(ctx)) {
      if (!['actions', 'proposedActions', 'subActions', 'executingAction', 'dslScript'].includes(key)) {
        result[key] = ctx[key];
      }
    }
    
    // Ensure version
    if (!result.version) {
      result.version = '1.0';
    }
    
    return {
      success: true,
      data: result,
      version: '1.0',
      originalVersion: ctx.version as string | undefined,
      errors: [],
      warnings
    };
  }
}

// Register legacy transform
registerTransform(new LegacyToV1Transform());

/**
 * Main transform function
 */
export function transformData(
  data: unknown,
  options: TransformOptions = {}
): TransformResult {
  const { targetVersion = CURRENT_PROTOCOL_VERSION, validate = true, strict = false } = options;
  
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      version: targetVersion,
      errors: ['Invalid data: must be an object']
    };
  }
  
  const ctx = data as Record<string, unknown>;
  const currentVersion = ctx.version as string | undefined;
  
  // If no version, assume latest or migrate from legacy
  if (!currentVersion) {
    return transformLegacyData(data, targetVersion, validate, strict);
  }
  
  // Already at target version
  if (currentVersion === targetVersion) {
    return {
      success: true,
      data,
      version: targetVersion,
      originalVersion: currentVersion,
      errors: [],
      warnings: []
    };
  }
  
  // Check if version is supported
  if (!isSupportedVersion(currentVersion)) {
    return {
      success: false,
      version: targetVersion,
      errors: [`Unsupported protocol version: ${currentVersion}`]
    };
  }
  
  // Get transform handler
  const handler = getTransformHandler(currentVersion as ProtocolVersion, targetVersion);
  
  if (!handler) {
    return {
      success: false,
      version: targetVersion,
      errors: [`No transform available from ${currentVersion} to ${targetVersion}`]
    };
  }
  
  // Perform transform
  const result = handler.transform(data);
  
  // Validate if requested
  if (validate && result.success && result.data) {
    const validation = handler.validate(result.data);
    if (!validation.valid) {
      return {
        success: false,
        version: targetVersion,
        originalVersion: currentVersion,
        errors: validation.errors,
        warnings: result.warnings
      };
    }
  }
  
  return result;
}

/**
 * Transform legacy data (no version)
 */
function transformLegacyData(
  data: unknown,
  targetVersion: ProtocolVersion,
  validate: boolean,
  strict: boolean
): TransformResult {
  const ctx = data as Record<string, unknown>;
  const warnings: string[] = ['Legacy data without version - applying migration'];
  
  // Check for legacy fields
  const hasLegacyFields = 
    ctx.actions !== undefined ||
    ctx.proposedActions !== undefined ||
    ctx.subActions !== undefined ||
    ctx.executingAction !== undefined ||
    ctx.dslScript !== undefined;
  
  if (hasLegacyFields) {
    // Use legacy transform
    const legacyHandler = getTransformHandler('1.0', '1.0');
    if (legacyHandler) {
      const result = legacyHandler.transform(data);
      return {
        ...result,
        version: targetVersion,
        warnings: [...warnings, ...result.warnings]
      };
    }
  }
  
  // Default: add version
  return {
    success: true,
    data: { ...ctx, version: targetVersion },
    version: targetVersion,
    originalVersion: undefined,
    errors: [],
    warnings: strict ? warnings : []
  };
}

/**
 * Validate data against protocol version
 */
export function validateForVersion(
  data: unknown,
  version: ProtocolVersion
): { valid: boolean; errors: string[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }
  
  const ctx = data as Record<string, unknown>;
  const dataVersion = ctx.version as string | undefined;
  
  // Version mismatch
  if (dataVersion && dataVersion !== version) {
    return {
      valid: false,
      errors: [`Version mismatch: expected ${version}, got ${dataVersion}`]
    };
  }
  
  // Validate required fields based on version
  const errors: string[] = [];
  
  if (!ctx.version) {
    errors.push('Missing required field: version');
  }
  
  if (!ctx.session_id && !ctx.sessionId) {
    errors.push('Missing required field: session_id');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect version from data
 */
export function detectVersion(data: unknown): ProtocolVersion | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  const ctx = data as Record<string, unknown>;
  const version = ctx.version as string | undefined;
  
  if (!version) {
    // Check for legacy format
    if (ctx.actions !== undefined || ctx.proposedActions !== undefined) {
      return '1.0';
    }
    return null;
  }
  
  if (isSupportedVersion(version)) {
    return version as ProtocolVersion;
  }
  
  return null;
}

/**
 * Normalize data to current version
 */
export function normalizeToCurrentVersion(data: unknown): TransformResult {
  return transformData(data, {
    targetVersion: CURRENT_PROTOCOL_VERSION,
    validate: true
  });
}
