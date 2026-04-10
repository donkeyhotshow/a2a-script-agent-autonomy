/**
 * @fileoverview Metrics collection and monitoring module
 * @module @a2a/rag/tests/reporter/metrics-collector
 * 
 * Handles real-time metrics collection during test execution,
 * including performance monitoring, memory tracking, and
 * accuracy calculations.
 */

import type {
  TestResult,
  PerformanceMetrics,
  AccuracyMetrics,
  TestConfig,
} from '../types.js';

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  rss: number; // Resident Set Size
  heapUsed: number;
  heapTotal: number;
  external: number;
}

/**
 * Performance monitoring data
 */
export interface PerformanceSnapshot {
  timestamp: number;
  searchTimeMs: number;
  memoryUsage: MemorySnapshot;
}

/**
 * Metrics collector for real-time monitoring
 */
export class MetricsCollector {
  private startTime: number;
  private memorySnapshots: MemorySnapshot[] = [];
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private searchTimes: number[] = [];
  private accuracyData: Array<{
    query: string;
    expected: string[];
    actual: string[];
    precision: number;
    recall: number;
    f1Score: number;
  }> = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Start monitoring memory usage
   */
  startMemoryMonitoring(intervalMs = 1000): () => void {
    const interval = setInterval(() => {
      this.recordMemorySnapshot();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Record memory snapshot
   */
  private recordMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });
  }

  /**
   * Record search performance
   */
  recordSearchPerformance(searchTimeMs: number): void {
    this.searchTimes.push(searchTimeMs);
    this.performanceSnapshots.push({
      timestamp: Date.now(),
      searchTimeMs,
      memoryUsage: this.getCurrentMemorySnapshot(),
    });
  }

  /**
   * Record accuracy metrics for a search
   */
  recordAccuracy(
    query: string,
    expected: string[],
    actual: string[],
    precision: number,
    recall: number,
    f1Score: number
  ): void {
    this.accuracyData.push({
      query,
      expected,
      actual,
      precision,
      recall,
      f1Score,
    });
  }

  /**
   * Get current memory snapshot
   */
  private getCurrentMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    };
  }

  /**
   * Calculate current performance metrics
   */
  calculatePerformanceMetrics(): PerformanceMetrics {
    if (this.searchTimes.length === 0) {
      return {
        totalTimeMs: 0,
        avgSearchTimeMs: 0,
        minSearchTimeMs: 0,
        maxSearchTimeMs: 0,
        p95SearchTimeMs: 0,
        memoryUsageMb: 0,
        peakMemoryMb: 0,
        concurrentSearches: 1,
      };
    }

    const sortedTimes = [...this.searchTimes].sort((a, b) => a - b);
    const totalDuration = this.searchTimes.reduce((sum, time) => sum + time, 0);
    
    // Calculate percentiles
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    
    // Calculate memory metrics
    const currentMemory = this.getCurrentMemorySnapshot();
    const peakMemory = this.memorySnapshots.reduce(
      (max, snapshot) => snapshot.rss > max.rss ? snapshot : max,
      this.memorySnapshots[0] || currentMemory
    );

    return {
      totalTimeMs: totalDuration,
      avgSearchTimeMs: totalDuration / this.searchTimes.length,
      minSearchTimeMs: sortedTimes[0],
      maxSearchTimeMs: sortedTimes[sortedTimes.length - 1],
      p95SearchTimeMs: sortedTimes[p95Index] || sortedTimes[sortedTimes.length - 1],
      memoryUsageMb: currentMemory.rss / (1024 * 1024),
      peakMemoryMb: peakMemory.rss / (1024 * 1024),
      concurrentSearches: 1, // Default value, would need more complex tracking for actual concurrency
    };
  }

  /**
   * Calculate current accuracy metrics
   */
  calculateAccuracyMetrics(): AccuracyMetrics {
    if (this.accuracyData.length === 0) {
      return {
        precision: 0,
        recall: 0,
        f1Score: 0,
        mapAtK: 0,
        ndcg: 0,
        mrr: 0,
        zeroResultQueries: 0,
        avgResultCount: 0,
      };
    }

    const totalPrecision = this.accuracyData.reduce((sum, data) => sum + data.precision, 0);
    const totalRecall = this.accuracyData.reduce((sum, data) => sum + data.recall, 0);
    const totalF1 = this.accuracyData.reduce((sum, data) => sum + data.f1Score, 0);
    const totalResults = this.accuracyData.reduce((sum, data) => sum + data.actual.length, 0);
    
    const zeroResultQueries = this.accuracyData.filter(data => data.actual.length === 0).length;

    return {
      precision: totalPrecision / this.accuracyData.length,
      recall: totalRecall / this.accuracyData.length,
      f1Score: totalF1 / this.accuracyData.length,
      mapAtK: this.calculateMAP(),
      ndcg: this.calculateNDCG(),
      mrr: this.calculateMRR(),
      zeroResultQueries,
      avgResultCount: this.accuracyData.length > 0 ? totalResults / this.accuracyData.length : 0,
    };
  }

  /**
   * Calculate Mean Average Precision (MAP@K)
   */
  private calculateMAP(): number {
    if (this.accuracyData.length === 0) return 0;

    let totalAP = 0;
    
    for (const data of this.accuracyData) {
      let ap = 0;
      let relevantCount = 0;
      
      for (let i = 0; i < data.actual.length; i++) {
        if (data.expected.includes(data.actual[i])) {
          relevantCount++;
          ap += relevantCount / (i + 1);
        }
      }
      
      if (data.expected.length > 0) {
        totalAP += ap / data.expected.length;
      }
    }
    
    return totalAP / this.accuracyData.length;
  }

  /**
   * Calculate Normalized Discounted Cumulative Gain (NDCG)
   */
  private calculateNDCG(): number {
    if (this.accuracyData.length === 0) return 0;

    let totalNDCG = 0;
    
    for (const data of this.accuracyData) {
      const dcg = this.calculateDCG(data.actual, data.expected);
      const idcg = this.calculateIDCG(data.expected.length, data.expected.length);
      
      totalNDCG += idcg > 0 ? dcg / idcg : 0;
    }
    
    return totalNDCG / this.accuracyData.length;
  }

  /**
   * Calculate Discounted Cumulative Gain
   */
  private calculateDCG(actual: string[], expected: string[]): number {
    let dcg = 0;
    
    for (let i = 0; i < actual.length; i++) {
      if (expected.includes(actual[i])) {
        dcg += 1 / Math.log2(i + 2); // log2(i + 2) for 1-based indexing
      }
    }
    
    return dcg;
  }

  /**
   * Calculate Ideal Discounted Cumulative Gain
   */
  private calculateIDCG(relDocsCount: number, totalDocsCount: number): number {
    let idcg = 0;
    
    for (let i = 0; i < Math.min(relDocsCount, totalDocsCount); i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    
    return idcg;
  }

  /**
   * Calculate Mean Reciprocal Rank (MRR)
   */
  private calculateMRR(): number {
    if (this.accuracyData.length === 0) return 0;

    let totalReciprocalRank = 0;
    let validQueries = 0;
    
    for (const data of this.accuracyData) {
      if (data.expected.length > 0) {
        const firstRelevantRank = data.actual.findIndex(doc => data.expected.includes(doc));
        if (firstRelevantRank !== -1) {
          totalReciprocalRank += 1 / (firstRelevantRank + 1);
        }
        validQueries++;
      }
    }
    
    return validQueries > 0 ? totalReciprocalRank / validQueries : 0;
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Get performance trend
   */
  getPerformanceTrend(): PerformanceSnapshot[] {
    return [...this.performanceSnapshots];
  }

  /**
   * Get accuracy trend
   */
  getAccuracyTrend(): Array<{
    query: string;
    precision: number;
    recall: number;
    f1Score: number;
  }> {
    return this.accuracyData.map(data => ({
      query: data.query,
      precision: data.precision,
      recall: data.recall,
      f1Score: data.f1Score,
    }));
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.performanceSnapshots = [];
    this.searchTimes = [];
    this.accuracyData = [];
  }

  /**
   * Get current metrics summary
   */
  getCurrentMetrics(): {
    performance: PerformanceMetrics;
    accuracy: AccuracyMetrics;
    memory: MemorySnapshot;
    trends: {
      memory: MemorySnapshot[];
      performance: PerformanceSnapshot[];
      accuracy: Array<{ query: string; precision: number; recall: number; f1Score: number }>;
    };
  } {
    return {
      performance: this.calculatePerformanceMetrics(),
      accuracy: this.calculateAccuracyMetrics(),
      memory: this.getCurrentMemorySnapshot(),
      trends: {
        memory: this.getMemoryTrend(),
        performance: this.getPerformanceTrend(),
        accuracy: this.getAccuracyTrend(),
      },
    };
  }
}

/**
 * Utility functions for metrics calculation
 */

/**
 * Calculate precision for a single query
 */
export function calculatePrecision(expected: string[], actual: string[]): number {
  if (actual.length === 0) return 0;
  
  const relevantRetrieved = actual.filter(doc => expected.includes(doc)).length;
  return relevantRetrieved / actual.length;
}

/**
 * Calculate recall for a single query
 */
export function calculateRecall(expected: string[], actual: string[]): number {
  if (expected.length === 0) return 1;
  
  const relevantRetrieved = actual.filter(doc => expected.includes(doc)).length;
  return relevantRetrieved / expected.length;
}

/**
 * Calculate F1 score for a single query
 */
export function calculateF1Score(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return 2 * (precision * recall) / (precision + recall);
}

/**
 * Calculate Mean Reciprocal Rank for multiple queries
 */
export function calculateMRRForQueries(
  queries: Array<{ expected: string[]; actual: string[] }>
): number {
  if (queries.length === 0) return 0;

  let totalReciprocalRank = 0;
  let validQueries = 0;
  
  for (const { expected, actual } of queries) {
    if (expected.length > 0) {
      const firstRelevantRank = actual.findIndex(doc => expected.includes(doc));
      if (firstRelevantRank !== -1) {
        totalReciprocalRank += 1 / (firstRelevantRank + 1);
      }
      validQueries++;
    }
  }
  
  return validQueries > 0 ? totalReciprocalRank / validQueries : 0;
}

/**
 * Calculate Mean Average Precision for multiple queries
 */
export function calculateMAPForQueries(
  queries: Array<{ expected: string[]; actual: string[] }>
): number {
  if (queries.length === 0) return 0;

  let totalAP = 0;
  
  for (const { expected, actual } of queries) {
    let ap = 0;
    let relevantCount = 0;
    
    for (let i = 0; i < actual.length; i++) {
      if (expected.includes(actual[i])) {
        relevantCount++;
        ap += relevantCount / (i + 1);
      }
    }
    
    if (expected.length > 0) {
      totalAP += ap / expected.length;
    }
  }
  
  return totalAP / queries.length;
}

/**
 * Calculate NDCG for multiple queries
 */
export function calculateNDCGForQueries(
  queries: Array<{ expected: string[]; actual: string[] }>
): number {
  if (queries.length === 0) return 0;

  let totalNDCG = 0;
  
  for (const { expected, actual } of queries) {
    const dcg = calculateDCGForQuery(actual, expected);
    const idcg = calculateIDCGForQuery(expected.length, expected.length);
    
    totalNDCG += idcg > 0 ? dcg / idcg : 0;
  }
  
  return totalNDCG / queries.length;
}

/**
 * Calculate DCG for a single query
 */
function calculateDCGForQuery(actual: string[], expected: string[]): number {
  let dcg = 0;
  
  for (let i = 0; i < actual.length; i++) {
    if (expected.includes(actual[i])) {
      dcg += 1 / Math.log2(i + 2);
    }
  }
  
  return dcg;
}

/**
 * Calculate IDCG for a query
 */
function calculateIDCGForQuery(relDocsCount: number, totalDocsCount: number): number {
  let idcg = 0;
  
  for (let i = 0; i < Math.min(relDocsCount, totalDocsCount); i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  
  return idcg;
}

/**
 * Monitor system resources during test execution
 */
export class SystemMonitor {
  private metricsCollector: MetricsCollector;
  private memoryMonitorInterval?: NodeJS.Timeout;

  constructor() {
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Start system monitoring
   */
  startMonitoring(memoryIntervalMs = 1000): () => void {
    const stopMemoryMonitoring = this.metricsCollector.startMemoryMonitoring(memoryIntervalMs);
    
    this.memoryMonitorInterval = setInterval(() => {
      this.metricsCollector.recordMemorySnapshot();
    }, memoryIntervalMs);

    return () => {
      stopMemoryMonitoring();
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
      }
    };
  }

  /**
   * Record search performance
   */
  recordSearch(searchTimeMs: number): void {
    this.metricsCollector.recordSearchPerformance(searchTimeMs);
  }

  /**
   * Record accuracy metrics
   */
  recordAccuracy(
    query: string,
    expected: string[],
    actual: string[],
    precision: number,
    recall: number,
    f1Score: number
  ): void {
    this.metricsCollector.recordAccuracy(query, expected, actual, precision, recall, f1Score);
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics() {
    return this.metricsCollector.getCurrentMetrics();
  }

  /**
   * Stop monitoring and get final metrics
   */
  stopMonitoring(): {
    performance: PerformanceMetrics;
    accuracy: AccuracyMetrics;
    finalMemory: MemorySnapshot;
  } {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    const metrics = this.metricsCollector.getCurrentMetrics();
    return {
      performance: metrics.performance,
      accuracy: metrics.accuracy,
      finalMemory: metrics.memory,
    };
  }
}