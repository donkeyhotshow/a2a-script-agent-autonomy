import {Router, Request, Response} from 'express';
import {
  getVersionInfo,
  isSupportedVersion,
  needsMigration,
  getMigrationPath,
  compareVersions,
  CURRENT_PROTOCOL_VERSION,
  MIN_SUPPORTED_VERSION,
  ProtocolVersion
} from '../protocol/versioning/protocol-versions.js';
import {
  transformData,
  validateForVersion,
  detectVersion,
  normalizeToCurrentVersion
} from '../protocol/versioning/transform-governance.js';
import {
  isLegacyFormat,
  applyCompatibility,
  getDeprecationWarning
} from '../protocol/versioning/backwards-compat.js';

const router = Router();

/**
 * Get protocol version info
 */
router.get('/', (_req: Request, res: Response) => {
  const versionInfo = getVersionInfo();
  res.json({
    success: true,
    data: versionInfo
  });
});

/**
 * Get supported versions
 */
router.get('/supported', (_req: Request, res: Response) => {
  const versionInfo = getVersionInfo();
  res.json({
    success: true,
    data: {
      supported: versionInfo.supported,
      current: versionInfo.current,
      minSupported: versionInfo.minSupported,
      deprecated: versionInfo.deprecated
    }
  });
});

/**
 * Check specific version support
 */
router.get('/check/:version', (req: Request, res: Response) => {
  const { version } = req.params;
  const supported = isSupportedVersion(version);
  
  res.json({
    success: true,
    data: {
      version,
      supported,
      current: CURRENT_PROTOCOL_VERSION,
      needsMigration: needsMigration(version),
      deprecationWarning: getDeprecationWarning(version)
    }
  });
});

/**
 * Compare versions
 */
router.post('/compare', (req: Request, res: Response) => {
  const { v1, v2 } = req.body;
  
  if (!v1 || !v2) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMS',
        message: 'Both v1 and v2 parameters are required'
      }
    });
    return;
  }
  
  const comparison = compareVersions(v1, v2);
  
  res.json({
    success: true,
    data: {
      v1,
      v2,
      comparison,
      result: comparison === 0 ? 'equal' : comparison < 0 ? 'v1 older' : 'v1 newer'
    }
  });
});

/**
 * Get migration path
 */
router.get('/migrate/:from/:to', (req: Request, res: Response) => {
  const { from, to } = req.params;
  
  if (!isSupportedVersion(from) || !isSupportedVersion(to)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_VERSION',
        message: 'Invalid version specified'
      }
    });
    return;
  }
  
  const path = getMigrationPath(from, to as ProtocolVersion);
  
  res.json({
    success: true,
    data: {
      from,
      to,
      path,
      needsMigration: path !== null && path.length > 0
    }
  });
});

/**
 * Transform/validate data to target version
 */
router.post('/transform', (req: Request, res: Response) => {
  const { data, targetVersion, validate = true, strict = false } = req.body;
  
  if (!data) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Data is required'
      }
    });
    return;
  }
  
  const version = (targetVersion || CURRENT_PROTOCOL_VERSION) as ProtocolVersion;
  
  if (!isSupportedVersion(version)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_VERSION',
        message: `Unsupported target version: ${version}`
      }
    });
    return;
  }
  
  const result = transformData(data, {
    targetVersion: version,
    validate,
    strict
  });
  
  res.json({
    success: result.success,
    data: result.success ? {
      data: result.data,
      version: result.version,
      originalVersion: result.originalVersion,
      warnings: result.warnings
    } : undefined,
    error: result.success ? undefined : {
      code: 'TRANSFORM_ERROR',
      message: result.errors.join(', ')
    },
    warnings: result.warnings
  });
});

/**
 * Detect version from data
 */
router.post('/detect', (req: Request, res: Response) => {
  const { data } = req.body;
  
  if (!data) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Data is required'
      }
    });
    return;
  }
  
  const detectedVersion = detectVersion(data);
  const isLegacy = isLegacyFormat(data);
  
  res.json({
    success: true,
    data: {
      version: detectedVersion,
      isLegacy,
      needsTransformation: isLegacy || (detectedVersion !== null && detectedVersion !== CURRENT_PROTOCOL_VERSION),
      deprecationWarning: detectedVersion ? getDeprecationWarning(detectedVersion) : null
    }
  });
});

/**
 * Normalize to current version
 */
router.post('/normalize', (req: Request, res: Response) => {
  const { data } = req.body;
  
  if (!data) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Data is required'
      }
    });
    return;
  }
  
  const result = normalizeToCurrentVersion(data);
  
  res.json({
    success: result.success,
    data: result.success ? result.data : undefined,
    error: result.success ? undefined : {
      code: 'NORMALIZE_ERROR',
      message: result.errors.join(', ')
    },
    warnings: result.warnings
  });
});

/**
 * Apply backwards compatibility
 */
router.post('/compat', (req: Request, res: Response) => {
  const { data, convertFields = true, transformLegacy = true, strict = false } = req.body;
  
  if (!data) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Data is required'
      }
    });
    return;
  }
  
  const isLegacy = isLegacyFormat(data);
  const result = applyCompatibility(data, {
    convertFields,
    transformLegacy,
    strict
  });
  
  res.json({
    success: true,
    data: result,
    warnings: isLegacy ? ['Legacy format detected and transformed'] : []
  });
});

/**
 * Validate data for specific version
 */
router.post('/validate', (req: Request, res: Response) => {
  const { data, version = CURRENT_PROTOCOL_VERSION } = req.body;
  
  if (!data) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Data is required'
      }
    });
    return;
  }
  
  if (!isSupportedVersion(version)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_VERSION',
        message: `Unsupported version: ${version}`
      }
    });
    return;
  }
  
  const validation = validateForVersion(data, version as ProtocolVersion);
  
  res.json({
    success: validation.valid,
    data: validation.valid ? {
      valid: true,
      version
    } : undefined,
    error: validation.valid ? undefined : {
      code: 'VALIDATION_ERROR',
      message: validation.errors.join(', ')
    }
  });
});

export default router;
