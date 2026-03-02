/**
 * @fileoverview Type definitions for RAG testing infrastructure
 * @module @a2a/rag/tests/types
 */

import type {Chunk, SearchResult} from '../src/index.js';

/**
 * Supported file types for test data generation
 */
export type FileType = 'typescript' | 'javascript' | 'php' | 'vue' | 'markdown';

/**
 * Search match types for test categorization
 */
export type MatchType = 'exact' | 'semantic' | 'hybrid' | 'fuzzy';

/**
 * Individual test result with detailed metrics
 */
export interface TestResult {
  /** Unique test identifier */
  id: string;
  /** Test name/description */
  name: string;
  /** Test category */
  category: string;
  /** Whether test passed */
  passed: boolean;
  /** Execution time in milliseconds */
  durationMs: number;
  /** Search results returned */
  results?: SearchResult[];
  /** Expected document IDs */
  expectedDocs?: string[];
  /** Actual document IDs returned */
  actualDocs?: string[];
  /** Precision score (0-1) */
  precision?: number;
  /** Recall score (0-1) */
  recall?: number;
  /** F1 score */
  f1Score?: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Test suite containing multiple test cases
 */
export interface TestSuite {
  /** Suite identifier */
  id: string;
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** Test cases in this suite */
  tests: TestCase[];
  /** Setup function */
  setup?: () => Promise<void>;
  /** Teardown function */
  teardown?: () => Promise<void>;
}

/**
 * Single test case definition
 */
export interface TestCase {
  /** Test identifier */
  id: string;
  /** Test name */
  name: string;
  /** Search query */
  query: string;
  /** Expected matching document IDs */
  expectedDocs?: string[];
  /** Minimum expected precision */
  minPrecision?: number;
  /** Minimum expected recall */
  minRecall?: number;
  /** Match type category */
  matchType: MatchType;
  /** Test category (functional, performance, edge-case) */
  category: 'functional' | 'performance' | 'edge-case' | 'accuracy';
  /** Maximum allowed execution time in ms */
  maxDurationMs?: number;
  /** Whether test expects an error */
  expectError?: boolean;
  /** Expected error type */
  expectedErrorType?: string;
}

/**
 * Performance metrics for test execution
 */
export interface PerformanceMetrics {
  /** Total execution time in milliseconds */
  totalTimeMs: number;
  /** Average search time */
  avgSearchTimeMs: number;
  /** Minimum search time */
  minSearchTimeMs: number;
  /** Maximum search time */
  maxSearchTimeMs: number;
  /** 95th percentile search time */
  p95SearchTimeMs: number;
  /** Memory usage in MB */
  memoryUsageMb: number;
  /** Peak memory usage in MB */
  peakMemoryMb: number;
  /** Number of concurrent searches supported */
  concurrentSearches: number;
  /** Index build time in ms */
  indexBuildTimeMs?: number;
  /** Number of documents indexed */
  documentsIndexed?: number;
  /** Number of chunks indexed */
  chunksIndexed?: number;
}

/**
 * Accuracy metrics for search results
 */
export interface AccuracyMetrics {
  /** Overall precision (relevant retrieved / total retrieved) */
  precision: number;
  /** Overall recall (relevant retrieved / total relevant) */
  recall: number;
  /** F1 score (harmonic mean of precision and recall) */
  f1Score: number;
  /** Mean Average Precision @ K */
  mapAtK: number;
  /** Normalized Discounted Cumulative Gain */
  ndcg: number;
  /** Mean Reciprocal Rank */
  mrr: number;
  /** Number of queries with zero results */
  zeroResultQueries: number;
  /** Average result count per query */
  avgResultCount: number;
}

/**
 * Complete test execution report
 */
export interface TestReport {
  /** Report generation timestamp */
  timestamp: string;
  /** Test configuration used */
  config: TestConfig;
  /** Overall test results */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
  /** Individual test results */
  results: TestResult[];
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Accuracy metrics */
  accuracy: AccuracyMetrics;
  /** Test duration */
  durationMs: number;
}

/**
 * Test configuration interface
 */
export interface TestConfig {
  /** Test data directory path */
  testDataDir: string;
  /** Output directory for generated data */
  outputDir: string;
  /** Performance thresholds */
  thresholds: {
    /** Maximum search time in milliseconds */
    searchTimeMs: number;
    /** Minimum accuracy threshold (0-1) */
    accuracyThreshold: number;
    /** Maximum memory usage in MB */
    memoryUsageMb: number;
    /** Maximum index build time in ms */
    indexBuildTimeMs?: number;
  };
  /** Data generation settings */
  dataGeneration: {
    /** Number of files to generate per type */
    filesPerType: number;
    /** Average file size in lines */
    avgFileSizeLines: number;
    /** Variance in file size */
    fileSizeVariance: number;
    /** Enable code complexity variation */
    varyComplexity: boolean;
  };
  /** Search settings */
  search: {
    /** Default result limit */
    defaultLimit: number;
    /** Use TF-IDF scoring */
    useTFIDF: boolean;
    /** Use BM25 scoring */
    useBM25: boolean;
    /** Use semantic search */
    useSemantic: boolean;
  };
}

/**
 * Generated test file metadata
 */
export interface TestFile {
  /** File identifier */
  id: string;
  /** File path (relative to output dir) */
  path: string;
  /** File type */
  type: FileType;
  /** File content */
  content: string;
  /** Number of lines */
  lineCount: number;
  /** Content hash */
  hash: string;
  /** Metadata */
  metadata: {
    /** Author of generated content */
    author?: string;
    /** Creation timestamp */
    createdAt: string;
    /** Tags/categories */
    tags: string[];
    /** Complexity level (1-5) */
    complexity: number;
  };
}

/**
 * Test dataset containing all generated data
 */
export interface TestDataset {
  /** Generated files */
  files: TestFile[];
  /** Test queries */
  queries: TestCase[];
  /** Edge case queries */
  edgeCases: TestCase[];
  /** Chunks extracted from files */
  chunks: Chunk[];
  /** Dataset metadata */
  metadata: {
    generatedAt: string;
    fileCount: number;
    queryCount: number;
    chunkCount: number;
    edgeCaseCount: number;
  };
}

/**
 * Test runner options
 */
export interface TestRunnerOptions {
  /** Specific test suite to run */
  suite?: string;
  /** Specific test categories to run */
  categories?: string[];
  /** Specific match types to test */
  matchTypes?: MatchType[];
  /** Skip performance tests */
  skipPerformance?: boolean;
  /** Skip edge case tests */
  skipEdgeCases?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Generate report file */
  generateReport?: boolean;
  /** Report output path */
  reportPath?: string;
}

/**
 * Generated code construct (class, function, interface)
 */
export interface CodeConstruct {
  /** Construct type */
  type: 'class' | 'function' | 'interface' | 'method' | 'property';
  /** Construct name */
  name: string;
  /** Construct content */
  content: string;
  /** Start line number */
  startLine: number;
  /** End line number */
  endLine: number;
  /** Parent construct (for methods) */
  parent?: string;
}

/**
 * Vue SFC component structure
 */
export interface VueComponent {
  /** Component name */
  name: string;
  /** Template section */
  template?: string;
  /** Script section */
  script?: string;
  /** Style section */
  style?: string;
  /** Props definitions */
  props?: string[];
  /** Computed properties */
  computed?: string[];
  /** Methods */
  methods?: string[];
  /** Full component content */
  content: string;
}

/**
 * Test data generator options
 */
export interface GeneratorOptions {
  /** Output directory */
  outputDir: string;
  /** Seed for reproducibility */
  seed?: number;
  /** Types of files to generate */
  fileTypes?: FileType[];
  /** Number of files per type */
  filesPerType?: number;
  /** Average lines per file */
  avgLinesPerFile?: number;
  /** Complexity level (1-5) */
  complexity?: number;
}

/**
 * Query-to-document relevance mapping
 */
export interface QueryRelevance {
  /** Query ID */
  queryId: string;
  /** Relevant document IDs with relevance scores */
  relevantDocs: Array<{docId: string; relevance: number}>;
  /** Explanation of relevance */
  explanation?: string;
}

/**
 * Environment configuration for test runner
 */
export interface TestEnvironmentConfig {
  /** Node environment */
  NODE_ENV: string;
  /** Skip authentication */
  SKIP_AUTH?: string;
  /** Encryption key */
  ENCRYPTION_KEY?: string;
  /** JWT secret */
  JWT_SECRET?: string;
  /** Test data directory override */
  TEST_DATA_DIR?: string;
  /** Test output directory override */
  TEST_OUTPUT_DIR?: string;
  /** Performance threshold overrides */
  THRESHOLD_SEARCH_TIME_MS?: string;
  THRESHOLD_ACCURACY?: string;
  THRESHOLD_MEMORY_MB?: string;
}
