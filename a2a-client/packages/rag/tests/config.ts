/**
 * @fileoverview Test configuration for RAG testing infrastructure
 * @module @a2a/rag/tests/config
 * 
 * Configuration can be overridden via environment variables:
 * - TEST_DATA_DIR: Directory for test data
 * - TEST_OUTPUT_DIR: Directory for generated test files
 * - THRESHOLD_SEARCH_TIME_MS: Maximum search time threshold
 * - THRESHOLD_ACCURACY: Minimum accuracy threshold (0-1)
 * - THRESHOLD_MEMORY_MB: Maximum memory usage threshold
 * - TEST_FILES_PER_TYPE: Number of files to generate per type
 * - TEST_AVG_FILE_SIZE: Average file size in lines
 */

import path from 'path';
import type {TestConfig, TestEnvironmentConfig} from './types.js';

/**
 * Get environment variable with fallback
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
function env(key: keyof TestEnvironmentConfig, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get numeric environment variable with fallback
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Parsed number or default
 */
function envNumber(key: keyof TestEnvironmentConfig, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Base directory for the RAG package
 */
export const RAG_PACKAGE_DIR = path.resolve(process.cwd(), 'a2a-client/packages/rag');

/**
 * Default test configuration
 * Values can be overridden via environment variables
 */
export const DEFAULT_CONFIG: TestConfig = {
  testDataDir: env('TEST_DATA_DIR', path.join(RAG_PACKAGE_DIR, 'test-data')),
  outputDir: env('TEST_OUTPUT_DIR', path.join(RAG_PACKAGE_DIR, 'test-data/output')),
  
  thresholds: {
    searchTimeMs: envNumber('THRESHOLD_SEARCH_TIME_MS', 100),
    accuracyThreshold: envNumber('THRESHOLD_ACCURACY', 0.8),
    memoryUsageMb: envNumber('THRESHOLD_MEMORY_MB', 100),
    indexBuildTimeMs: envNumber('THRESHOLD_INDEX_BUILD_MS', 5000),
  },
  
  dataGeneration: {
    filesPerType: envNumber('TEST_FILES_PER_TYPE', 10),
    avgFileSizeLines: envNumber('TEST_AVG_FILE_SIZE', 100),
    fileSizeVariance: 0.3,
    varyComplexity: true,
  },
  
  search: {
    defaultLimit: 10,
    useTFIDF: true,
    useBM25: true,
    useSemantic: false, // Disabled by default (requires embedding service)
  },
};

/**
 * Performance test configuration with stricter thresholds
 */
export const PERFORMANCE_CONFIG: TestConfig = {
  ...DEFAULT_CONFIG,
  thresholds: {
    ...DEFAULT_CONFIG.thresholds,
    searchTimeMs: envNumber('PERF_THRESHOLD_SEARCH_MS', 50),
    accuracyThreshold: envNumber('PERF_THRESHOLD_ACCURACY', 0.85),
    memoryUsageMb: envNumber('PERF_THRESHOLD_MEMORY_MB', 150),
  },
};

/**
 * Minimal test configuration for quick smoke tests
 */
export const SMOKE_TEST_CONFIG: TestConfig = {
  ...DEFAULT_CONFIG,
  dataGeneration: {
    filesPerType: 3,
    avgFileSizeLines: 50,
    fileSizeVariance: 0.2,
    varyComplexity: false,
  },
  thresholds: {
    searchTimeMs: 200,
    accuracyThreshold: 0.6,
    memoryUsageMb: 50,
  },
};

/**
 * Large-scale test configuration for stress testing
 */
export const STRESS_TEST_CONFIG: TestConfig = {
  ...DEFAULT_CONFIG,
  dataGeneration: {
    filesPerType: 50,
    avgFileSizeLines: 300,
    fileSizeVariance: 0.4,
    varyComplexity: true,
  },
  thresholds: {
    searchTimeMs: 500,
    accuracyThreshold: 0.75,
    memoryUsageMb: 500,
  },
};

/**
 * Load configuration from environment and merge with defaults
 * @param overrides - Optional configuration overrides
 * @returns Merged configuration
 */
export function loadConfig(overrides: Partial<TestConfig> = {}): TestConfig {
  return {
    testDataDir: overrides.testDataDir ?? DEFAULT_CONFIG.testDataDir,
    outputDir: overrides.outputDir ?? DEFAULT_CONFIG.outputDir,
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      ...overrides.thresholds,
    },
    dataGeneration: {
      ...DEFAULT_CONFIG.dataGeneration,
      ...overrides.dataGeneration,
    },
    search: {
      ...DEFAULT_CONFIG.search,
      ...overrides.search,
    },
  };
}

/**
 * Get configuration by preset name
 * @param preset - Configuration preset name
 * @returns Configuration object
 */
export function getConfigByPreset(
  preset: 'default' | 'performance' | 'smoke' | 'stress'
): TestConfig {
  switch (preset) {
    case 'performance':
      return PERFORMANCE_CONFIG;
    case 'smoke':
      return SMOKE_TEST_CONFIG;
    case 'stress':
      return STRESS_TEST_CONFIG;
    default:
      return DEFAULT_CONFIG;
  }
}

/**
 * Validate configuration values
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: TestConfig): void {
  if (!config.testDataDir) {
    throw new Error('testDataDir is required');
  }
  
  if (!config.outputDir) {
    throw new Error('outputDir is required');
  }
  
  if (config.thresholds.searchTimeMs <= 0) {
    throw new Error('searchTimeMs must be positive');
  }
  
  if (config.thresholds.accuracyThreshold < 0 || config.thresholds.accuracyThreshold > 1) {
    throw new Error('accuracyThreshold must be between 0 and 1');
  }
  
  if (config.thresholds.memoryUsageMb <= 0) {
    throw new Error('memoryUsageMb must be positive');
  }
  
  if (config.dataGeneration.filesPerType < 1) {
    throw new Error('filesPerType must be at least 1');
  }
  
  if (config.dataGeneration.avgFileSizeLines < 10) {
    throw new Error('avgFileSizeLines must be at least 10');
  }
}

/**
 * Get paths for test data directories
 * @param config - Test configuration
 * @returns Object with resolved paths
 */
export function getTestPaths(config: TestConfig = DEFAULT_CONFIG) {
  return {
    /** Root test data directory */
    testDataDir: config.testDataDir,
    /** Output directory for generated files */
    outputDir: config.outputDir,
    /** Directory for TypeScript files */
    typescriptDir: path.join(config.outputDir, 'typescript'),
    /** Directory for JavaScript files */
    javascriptDir: path.join(config.outputDir, 'javascript'),
    /** Directory for PHP files */
    phpDir: path.join(config.outputDir, 'php'),
    /** Directory for Vue files */
    vueDir: path.join(config.outputDir, 'vue'),
    /** Directory for Markdown files */
    markdownDir: path.join(config.outputDir, 'markdown'),
    /** Directory for test reports */
    reportsDir: path.join(config.testDataDir, 'reports'),
  };
}

/**
 * Create all necessary directories for testing
 * @param config - Test configuration
 */
export async function ensureTestDirectories(config: TestConfig = DEFAULT_CONFIG): Promise<void> {
  const fs = await import('fs/promises');
  const paths = getTestPaths(config);
  
  const dirs = [
    paths.outputDir,
    paths.typescriptDir,
    paths.javascriptDir,
    paths.phpDir,
    paths.vueDir,
    paths.markdownDir,
    paths.reportsDir,
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, {recursive: true});
  }
}

/**
 * Configuration for different test suites
 */
export const TEST_SUITE_CONFIGS = {
  /** Functional tests - basic search functionality */
  functional: {
    name: 'Functional Tests',
    description: 'Tests basic RAG search functionality',
    categories: ['functional'],
    matchTypes: ['exact', 'semantic', 'hybrid'] as const,
  },
  
  /** Performance tests - speed and resource usage */
  performance: {
    name: 'Performance Tests',
    description: 'Tests search performance and resource usage',
    categories: ['performance'],
    skipEdgeCases: true,
  },
  
  /** Accuracy tests - precision and recall */
  accuracy: {
    name: 'Accuracy Tests',
    description: 'Tests search accuracy metrics',
    categories: ['accuracy'],
    matchTypes: ['exact', 'semantic', 'hybrid'] as const,
  },
  
  /** Edge case tests - boundary conditions */
  edgeCases: {
    name: 'Edge Case Tests',
    description: 'Tests boundary conditions and error handling',
    categories: ['edge-case'],
    skipPerformance: true,
  },
  
  /** Full test suite */
  full: {
    name: 'Full Test Suite',
    description: 'Complete test suite including all tests',
    categories: ['functional', 'performance', 'accuracy', 'edge-case'],
    matchTypes: ['exact', 'semantic', 'hybrid', 'fuzzy'] as const,
  },
};

/**
 * Export default configuration
 */
export default DEFAULT_CONFIG;
