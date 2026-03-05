/**
 * Protocol Versioning Module
 * 
 * Exports all versioning-related functionality.
 */

// Protocol versions
export {
  PROTOCOL_VERSIONS,
  CURRENT_PROTOCOL_VERSION,
  MIN_SUPPORTED_VERSION,
  type ProtocolVersion,
  type VersionInfo,
  getVersionInfo,
  isSupportedVersion,
  needsMigration,
  compareVersions,
  getMigrationPath,
  isValidVersionFormat
} from './protocol-versions.js';

//} from './protocol Transform governance
export {
  type TransformResult,
  type TransformOptions,
  type TransformValidator,
  TransformHandler,
  transformData,
  validateForVersion,
  detectVersion,
  normalizeToCurrentVersion,
  registerTransform,
  getTransformHandler,
  hasTransform
} from './transform-governance.js';

// Backwards compatibility
export {
  isLegacyFormat,
  convertCamelToSnake,
  convertSnakeToCamel,
  transformLegacyRequest,
  transformLegacyResponse,
  applyCompatibility,
  isDeprecatedVersion,
  getDeprecationWarning,
  adaptActionKey,
  isAIActionFormat,
  isCanonicalFormat,
  isLegacyAIActionFormat,
  FormatType,
  type CompatibilityOptions
} from './backwards-compat.js';
