# RAG Package Testing with Simulated Data Plan

## Overview

This plan outlines comprehensive testing for the RAG (Retrieval-Augmented Generation) package using simulated data to validate functionality, performance, and accuracy.

## Current State Analysis

### RAG Package Structure
```
a2a-client/packages/rag/
├── src/
│   ├── index.ts              # Main export
│   ├── rag.ts               # Core RAG implementation
│   ├── vector-store.ts      # Vector storage
│   ├── embedding.ts         # Embedding generation
│   ├── search.ts           # Search functionality
│   └── utils/              # Utility functions
├── tests/                  # Test files
└── package.json           # Package configuration
```

### Testing Requirements
- **Input/Output Visibility**: Need to see what was input and what algorithm output
- **Simulated Data**: Create controlled test datasets
- **Separate Query Set**: Dedicated test queries for validation
- **Performance Metrics**: Measure accuracy and response time

## Testing Architecture

### 1. Test Data Generation

#### Simulated Document Corpus
```typescript
// test-data/generator.ts
export class TestDataGenerator {
  static generateDocuments(count: number): Document[] {
    const documents: Document[] = [];
    
    for (let i = 0; i < count; i++) {
      documents.push({
        id: `doc-${i}`,
        content: this.generateContent(i),
        metadata: {
          category: this.randomCategory(),
          tags: this.randomTags(),
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          author: this.randomAuthor()
        }
      });
    }
    
    return documents;
  }
  
  private static generateContent(index: number): string {
    const topics = [
      'JavaScript programming',
      'TypeScript development',
      'Node.js backend',
      'React frontend',
      'Vue.js framework',
      'API design',
      'Database optimization',
      'Security best practices',
      'Performance tuning',
      'DevOps automation'
    ];
    
    const topic = topics[index % topics.length];
    return `
# ${topic} - Document ${index}
## Overview
This is a simulated document about ${topic} containing various technical information.
## Key Concepts
- Important concept 1 for ${topic}
- Important concept 2 for ${topic}
- Important concept 3 for ${topic}
## Examples
Here are some examples related to ${topic}:
${this.generateExamples(topic)}
## Best Practices
- Best practice 1
- Best practice 2
- Best practice 3
Generated for testing purposes.
    `.trim();
  }
}
```

#### Test Query Set
```typescript
// test-data/queries.ts
export const TEST_QUERIES = [
  {
    id: 'q-001',
    query: 'How to optimize JavaScript performance?',
    expected_docs: ['doc-0', 'doc-5', 'doc-8'],
    category: 'performance'
  },
  {
    id: 'q-002', 
    query: 'What are TypeScript best practices?',
    expected_docs: ['doc-1', 'doc-6'],
    category: 'best-practices'
  },
  {
    id: 'q-003',
    query: 'How to secure Node.js applications?',
    expected_docs: ['doc-2', 'doc-7', 'doc-9'],
    category: 'security'
  },
  // ... more test queries
];

export const EDGE_CASE_QUERIES = [
  {
    id: 'edge-001',
    query: '', // Empty query
    expected_error: 'empty_query'
  },
  {
    id: 'edge-002', 
    query: ' '.repeat(1000), // Very long query
    expected_docs: []
  },
  {
    id: 'edge-003',
    query: 'nonexistent topic that should not match anything',
    expected_docs: []
  }
];
```

### 2. Test Framework Setup

#### Test Configuration
```typescript
// tests/config.ts
export interface TestConfig {
  embedding_model: string;
  vector_store: string;
  test_data_size: number;
  performance_thresholds: {
    search_time_ms: number;
    accuracy_threshold: number;
    memory_usage_mb: number;
  };
}

export const DEFAULT_CONFIG: TestConfig = {
  embedding_model: 'test-embedding-model',
  vector_store: 'in-memory',
  test_data_size: 1000,
  performance_thresholds: {
    search_time_ms: 100,
    accuracy_threshold: 0.8,
    memory_usage_mb: 100
  }
};
```

#### Test Runner
```typescript
// tests/runner.ts
export class RAGTestRunner {
  private config: TestConfig;
  private rag: RAG;
  private testData: Document[];
  private results: TestResult[] = [];
  
  constructor(config: TestConfig) {
    this.config = config;
    this.rag = new RAG(config);
  }
  
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('🚀 Starting RAG Test Suite');
    
    // 1. Setup test data
    await this.setupTestData();
    
    // 2. Run functional tests
    await this.runFunctionalTests();
    
    // 3. Run performance tests
    await this.runPerformanceTests();
    
    // 4. Run edge case tests
    await this.runEdgeCaseTests();
    
    // 5. Generate report
    return this.generateReport();
  }
  
  private async setupTestData(): Promise<void> {
    console.log('📊 Generating test data...');
    this.testData = TestDataGenerator.generateDocuments(this.config.test_data_size);
    await this.rag.initialize(this.testData);
    console.log(`✅ Generated ${this.testData.length} test documents`);
  }
}
```

## Test Categories

### 1. Functional Tests

#### Basic Search Functionality
```typescript
// tests/functional/search.test.ts
describe('RAG Search Functionality', () => {
  test('should return relevant documents for query', async () => {
    const query = 'JavaScript performance optimization';
    const results = await rag.search(query, { limit: 5 });
    
    console.log('🔍 Query:', query);
    console.log('📊 Results:', results.map(r => ({
      id: r.document.id,
      score: r.score,
      content: r.document.content.substring(0, 100) + '...'
    })));
    
    expect(results).toHaveLength(5);
    expect(results[0].score).toBeGreaterThan(0.5);
  });
  
  test('should handle exact match queries', async () => {
    const query = 'JavaScript programming';
    const results = await rag.search(query, { limit: 3 });
    
    console.log('🎯 Exact match query:', query);
    console.log('📊 Results:', results);
    
    // Should return documents with high similarity scores
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeCloseTo(1, 1);
  });
});
```

#### Relevance Ranking
```typescript
// tests/functional/ranking.test.ts
describe('Relevance Ranking', () => {
  test('should rank documents by relevance', async () => {
    const query = 'TypeScript development best practices';
    const results = await rag.search(query, { limit: 10 });
    
    console.log('📈 Relevance ranking test');
    console.log('📊 Results ranking:');
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. Score: ${result.score.toFixed(3)}, Doc: ${result.document.id}`);
    });
    
    // Scores should be in descending order
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });
});
```

### 2. Performance Tests

#### Search Performance
```typescript
// tests/performance/search-performance.test.ts
describe('Search Performance', () => {
  test('should search within time threshold', async () => {
    const query = 'performance optimization techniques';
    const startTime = Date.now();
    
    const results = await rag.search(query, { limit: 10 });
    const searchTime = Date.now() - startTime;
    
    console.log('⏱️  Search performance test');
    console.log(`📊 Query: "${query}"`);
    console.log(`⏱️  Search time: ${searchTime}ms`);
    console.log(`📊 Results count: ${results.length}`);
    
    expect(searchTime).toBeLessThan(config.performance_thresholds.search_time_ms);
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should handle concurrent searches', async () => {
    const queries = [
      'JavaScript optimization',
      'TypeScript best practices', 
      'Node.js security',
      'React performance',
      'Vue.js optimization'
    ];
    
    const startTime = Date.now();
    const promises = queries.map(query => rag.search(query, { limit: 5 }));
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log('🔄 Concurrent search test');
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📊 Queries processed: ${queries.length}`);
    console.log(`📊 Average time per query: ${totalTime / queries.length}ms`);
    
    expect(totalTime).toBeLessThan(config.performance_thresholds.search_time_ms * queries.length);
  });
});
```

#### Memory Usage
```typescript
// tests/performance/memory.test.ts
describe('Memory Usage', () => {
  test('should not exceed memory threshold', async () => {
    const initialMemory = process.memoryUsage();
    
    // Load large dataset
    const largeDataset = TestDataGenerator.generateDocuments(5000);
    await rag.initialize(largeDataset);
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    console.log('💾 Memory usage test');
    console.log(`📊 Initial memory: ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`📊 Final memory: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`📊 Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    
    expect(memoryIncreaseMB).toBeLessThan(config.performance_thresholds.memory_usage_mb);
  });
});
```

### 3. Accuracy Tests

#### Precision and Recall
```typescript
// tests/accuracy/precision-recall.test.ts
describe('Precision and Recall', () => {
  test('should achieve target precision', async () => {
    let totalPrecision = 0;
    let testCount = 0;
    
    for (const testQuery of TEST_QUERIES) {
      const results = await rag.search(testQuery.query, { limit: 5 });
      const relevantResults = results.filter(r => 
        testQuery.expected_docs.includes(r.document.id)
      );
      const precision = relevantResults.length / results.length;
      
      totalPrecision += precision;
      testCount++;
      
      console.log(`🎯 Query: "${testQuery.query}"`);
      console.log(`📊 Precision: ${precision.toFixed(3)}`);
      console.log(`📊 Relevant: ${relevantResults.length}/${results.length}`);
    }
    
    const averagePrecision = totalPrecision / testCount;
    console.log(`📈 Average precision: ${averagePrecision.toFixed(3)}`);
    
    expect(averagePrecision).toBeGreaterThanOrEqual(config.performance_thresholds.accuracy_threshold);
  });
});
```

#### Semantic Understanding
```typescript
// tests/accuracy/semantic.test.ts
describe('Semantic Understanding', () => {
  test('should understand semantic similarity', async () => {
    const semanticQueries = [
      {
        query: 'How to make JavaScript code faster?',
        related: 'JavaScript performance optimization'
      },
      {
        query: 'Best practices for TypeScript code',
        related: 'TypeScript development guidelines'
      },
      {
        query: 'Securing Node.js applications',
        related: 'Node.js security measures'
      }
    ];
    
    for (const { query, related } of semanticQueries) {
      const queryResults = await rag.search(query, { limit: 3 });
      const relatedResults = await rag.search(related, { limit: 3 });
      
      console.log(`🧠 Semantic understanding test`);
      console.log(`🔍 Query: "${query}"`);
      console.log(`🔍 Related: "${related}"`);
      console.log(`📊 Query results: ${queryResults.map(r => r.document.id)}`);
      console.log(`📊 Related results: ${relatedResults.map(r => r.document.id)}`);
      
      // Check if results overlap significantly
      const queryIds = new Set(queryResults.map(r => r.document.id));
      const relatedIds = new Set(relatedResults.map(r => r.document.id));
      const overlap = [...queryIds].filter(id => relatedIds.has(id));
      
      expect(overlap.length).toBeGreaterThan(0);
    }
  });
});
```

### 4. Edge Case Tests

#### Error Handling
```typescript
// tests/edge-cases/error-handling.test.ts
describe('Error Handling', () => {
  test('should handle empty queries', async () => {
    await expect(rag.search('', { limit: 5 }))
      .rejects.toThrow('Query cannot be empty');
  });
  
  test('should handle very long queries', async () => {
    const longQuery = 'a '.repeat(10000);
    const results = await rag.search(longQuery, { limit: 5 });
    
    console.log('📏 Long query test');
    console.log(`📊 Query length: ${longQuery.length} characters`);
    console.log(`📊 Results: ${results.length}`);
    
    expect(Array.isArray(results)).toBe(true);
  });
  
  test('should handle non-existent documents', async () => {
    const results = await rag.search('completely unrelated query with no matches', { limit: 5 });
    
    console.log('🔍 Non-existent query test');
    console.log(`📊 Results: ${results.length}`);
    
    expect(Array.isArray(results)).toBe(true);
    // Should return empty or low-score results
  });
});
```

#### Boundary Conditions
```typescript
// tests/edge-cases/boundary.test.ts
describe('Boundary Conditions', () => {
  test('should handle minimum result limit', async () => {
    const results = await rag.search('JavaScript', { limit: 1 });
    
    console.log('📏 Minimum limit test');
    console.log(`📊 Results: ${results.length}`);
    
    expect(results.length).toBeLessThanOrEqual(1);
  });
  
  test('should handle maximum result limit', async () => {
    const results = await rag.search('programming', { limit: 100 });
    
    console.log('📏 Maximum limit test');
    console.log(`📊 Results: ${results.length}`);
    
    expect(results.length).toBeLessThanOrEqual(100);
  });
});
```

## Test Data Management

### 1. Data Generation Pipeline
```typescript
// test-data/pipeline.ts
export class TestDataPipeline {
  static async generateCompleteDataset(): Promise<TestDataset> {
    console.log('🏗️  Generating complete test dataset...');
    
    // 1. Generate base documents
    const documents = TestDataGenerator.generateDocuments(1000);
    
    // 2. Generate test queries
    const queries = this.generateTestQueries(documents);
    
    // 3. Generate edge cases
    const edgeCases = this.generateEdgeCases();
    
    // 4. Create validation sets
    const validationSets = this.createValidationSets(documents, queries);
    
    const dataset: TestDataset = {
      documents,
      queries,
      edgeCases,
      validationSets,
      metadata: {
        generated_at: new Date(),
        document_count: documents.length,
        query_count: queries.length,
        edge_case_count: edgeCases.length
      }
    };
    
    // 5. Save to file
    await this.saveDataset(dataset);
    
    console.log(`✅ Generated dataset with ${documents.length} documents, ${queries.length} queries`);
    return dataset;
  }
  
  private static generateTestQueries(documents: Document[]): TestQuery[] {
    const queries: TestQuery[] = [];
    
    // Generate queries based on document content
    documents.forEach((doc, index) => {
      const topics = this.extractTopics(doc.content);
      topics.forEach(topic => {
        queries.push({
          id: `q-${queries.length + 1}`,
          query: `How to ${topic}?`,
          expected_docs: [doc.id],
          category: this.categorizeTopic(topic)
        });
      });
    });
    
    return queries;
  }
}
```

### 2. Test Data Validation
```typescript
// test-data/validator.ts
export class TestDataValidator {
  static validateDataset(dataset: TestDataset): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate documents
    if (dataset.documents.length === 0) {
      errors.push('No documents in dataset');
    }
    
    dataset.documents.forEach((doc, index) => {
      if (!doc.id) {
        errors.push(`Document ${index} missing ID`);
      }
      if (!doc.content || doc.content.length < 10) {
        errors.push(`Document ${index} has invalid content`);
      }
    });
    
    // Validate queries
    if (dataset.queries.length === 0) {
      errors.push('No queries in dataset');
    }
    
    // Validate expected documents exist
    dataset.queries.forEach((query, index) => {
      query.expected_docs.forEach(docId => {
        if (!dataset.documents.find(d => d.id === docId)) {
          errors.push(`Query ${index} references non-existent document: ${docId}`);
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## Reporting and Visualization

### 1. Test Results Dashboard
```typescript
// tests/reporter.ts
export class TestReporter {
  static generateReport(results: TestSuiteResult): string {
    const report = `
# RAG Test Suite Report

## Summary
- **Total Tests**: ${results.totalTests}
- **Passed**: ${results.passedTests}
- **Failed**: ${results.failedTests}
- **Success Rate**: ${(results.successRate * 100).toFixed(1)}%

## Performance Metrics
- **Average Search Time**: ${results.avgSearchTime}ms
- **Memory Usage**: ${results.memoryUsage}MB
- **Precision**: ${(results.precision * 100).toFixed(1)}%

## Test Categories
### Functional Tests
${this.formatCategoryResults(results.functionalTests)}

### Performance Tests  
${this.formatCategoryResults(results.performanceTests)}

### Accuracy Tests
${this.formatCategoryResults(results.accuracyTests)}

### Edge Case Tests
${this.formatCategoryResults(results.edgeCaseTests)}

## Detailed Results
${this.formatDetailedResults(results.testResults)}
    `.trim();
    
    return report;
  }
  
  private static formatDetailedResults(results: TestResult[]): string {
    return results.map(result => `
### ${result.testName}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Details**: ${result.details || 'No details'}
`).join('\n');
  }
}
```

### 2. Performance Visualization
```typescript
// tests/visualizer.ts
export class PerformanceVisualizer {
  static generateCharts(results: TestSuiteResult): void {
    // Generate search time distribution chart
    this.generateSearchTimeChart(results.searchTimes);
    
    // Generate precision/recall chart
    this.generatePrecisionRecallChart(results.precisionRecall);
    
    // Generate memory usage chart
    this.generateMemoryUsageChart(results.memoryUsage);
  }
  
  private static generateSearchTimeChart(searchTimes: number[]): void {
    const chartData = {
      labels: searchTimes.map((_, index) => `Query ${index + 1}`),
      datasets: [{
        label: 'Search Time (ms)',
        data: searchTimes,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
    
    // Save chart as image or HTML
    console.log('📊 Search time chart generated');
  }
}
```

## CI/CD Integration

### 1. Automated Testing Pipeline
```yaml
# .github/workflows/rag-tests.yml
name: RAG Package Tests

on:
  push:
    paths:
      - 'a2a-client/packages/rag/**'
  pull_request:
    paths:
      - 'a2a-client/packages/rag/**'

jobs:
  rag-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate test data
        run: npm run test:data:generate
      
      - name: Run RAG tests
        run: npm run test:rag
      
      - name: Generate test report
        run: npm run test:rag:report
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: rag-test-results
          path: test-results/
```

### 2. Test Scripts
```json
// package.json scripts
{
  "scripts": {
    "test:data:generate": "ts-node tests/generate-data.ts",
    "test:rag": "jest tests/rag.test.ts --verbose",
    "test:rag:report": "ts-node tests/generate-report.ts",
    "test:rag:performance": "jest tests/performance.test.ts --verbose",
    "test:rag:accuracy": "jest tests/accuracy.test.ts --verbose"
  }
}
```

## Implementation Timeline

### Phase 1: Test Infrastructure (Week 1)
- [ ] Test data generation framework
- [ ] Test runner implementation
- [ ] Basic functional tests

### Phase 2: Core Testing (Week 2)
- [ ] Performance tests implementation
- [ ] Accuracy tests implementation
- [ ] Edge case tests

### Phase 3: Advanced Features (Week 3)
- [ ] Test reporting and visualization
- [ ] CI/CD integration
- [ ] Performance benchmarking

### Phase 4: Optimization (Week 4)
- [ ] Test optimization and parallelization
- [ ] Memory usage optimization
- [ ] Documentation and examples

## Success Criteria

### Functional Requirements
- [ ] All functional tests pass
- [ ] Performance within thresholds
- [ ] Accuracy above target threshold
- [ ] Edge cases handled properly

### Non-Functional Requirements
- [ ] Test execution time < 5 minutes
- [ ] Memory usage < 500MB during testing
- [ ] Test coverage > 90%
- [ ] Automated CI/CD pipeline

## Risk Mitigation

### Data Quality Risks
- **Risk**: Test data not representative of real usage
- **Mitigation**: Use diverse document types and realistic queries

### Performance Risks
- **Risk**: Tests too slow for CI/CD
- **Mitigation**: Optimize test data size and parallel execution

### Accuracy Risks
- **Risk**: Accuracy metrics not meaningful
- **Mitigation**: Use multiple accuracy measures and manual validation

This comprehensive testing plan ensures the RAG package is thoroughly validated with simulated data, providing visibility into both input and output for each test case.