# RAG Testing Simulation Documentation

## Overview

The RAG Testing Simulation is a comprehensive testing framework designed to validate the performance, accuracy, and robustness of the RAG (Retrieval-Augmented Generation) system. It provides detailed metrics, edge case testing, and comprehensive reporting for quality assurance.

## Features

### 🧪 Comprehensive Test Types

1. **Performance Tests**
   - Simple keyword searches
   - Complex multi-term queries
   - Long-tail search patterns
   - Response time measurements

2. **Edge Case Tests**
   - Empty and whitespace queries
   - Special characters and symbols
   - Unicode and international text
   - Very long queries
   - Security tests (SQL injection, XSS attempts)

3. **Accuracy Tests**
   - Domain-specific queries
   - File type specific searches
   - Code pattern recognition
   - Relevance scoring validation

### 📊 Detailed Metrics

- **Response Times**: Per-query and average response times
- **Success Rates**: Scenario and query-level success rates
- **Result Quality**: Relevance scoring and result count validation
- **Processing Performance**: Total processing time and throughput

### 📈 Comprehensive Reporting

- **JSON Results**: Detailed machine-readable results
- **Markdown Reports**: Human-readable summary reports
- **Performance Charts**: Response time and success rate visualizations
- **Error Analysis**: Detailed error categorization and analysis

## Usage

### Basic Usage

```bash
# Run all tests with default configuration
node scripts/rag-testing-simulation.js

# Run specific test type
node scripts/rag-testing-simulation.js --test-type performance
node scripts/rag-testing-simulation.js --test-type edge-cases
node scripts/rag-testing-simulation.js --test-type accuracy

# Custom project path
node scripts/rag-testing-simulation.js --project-path /path/to/project

# Custom output directory
node scripts/rag-testing-simulation.js --output-dir ./custom-results

# Enable verbose logging
node scripts/rag-testing-simulation.js --verbose
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--project-path <path>` | Project path to index | `C:\workspace\domain-platform\websitestore.com.ua` |
| `--output-dir <dir>` | Output directory for results | `./rag-test-results` |
| `--test-type <type>` | Test type: all, performance, edge-cases, accuracy | `all` |
| `--verbose` | Enable verbose logging | `false` |
| `--config <file>` | Configuration file path | - |

## Test Scenarios

### Performance Test Scenarios

#### 1. Simple Keyword Search
- **Purpose**: Test basic search functionality
- **Queries**: Single and multi-word keywords
- **Expected**: Fast response times, relevant results
- **Timeout**: 5 seconds

#### 2. Complex Multi-term Search
- **Purpose**: Test advanced search capabilities
- **Queries**: Multiple related terms
- **Expected**: High-quality results, reasonable performance
- **Timeout**: 8 seconds

#### 3. Long-tail Queries
- **Purpose**: Test natural language query handling
- **Queries**: Full sentences and questions
- **Expected**: Contextual understanding, relevant results
- **Timeout**: 10 seconds

### Edge Case Test Scenarios

#### 1. Empty and Whitespace Queries
- **Purpose**: Test input validation
- **Expected**: Graceful handling, no errors
- **Should Fail**: Yes (empty queries should return no results)

#### 2. Special Characters
- **Purpose**: Test character encoding and escaping
- **Queries**: Symbols, punctuation, special characters
- **Expected**: Safe handling, no security vulnerabilities

#### 3. Unicode and International Characters
- **Purpose**: Test internationalization support
- **Queries**: Non-ASCII characters, different languages
- **Expected**: Proper Unicode handling

#### 4. Very Long Queries
- **Purpose**: Test system limits and performance
- **Queries**: Extremely long search strings
- **Expected**: Reasonable performance, no crashes
- **Timeout**: 15 seconds

#### 5. Security Tests
- **Purpose**: Test security vulnerability prevention
- **Queries**: SQL injection, XSS attempts
- **Expected**: Safe handling, no code execution

### Accuracy Test Scenarios

#### 1. Domain-specific Queries
- **Purpose**: Test technical knowledge retrieval
- **Queries**: Framework-specific, technology-specific
- **Expected**: High relevance, technical accuracy

#### 2. File Type Specific Queries
- **Purpose**: Test file type awareness
- **Queries**: Language-specific patterns
- **Expected**: Appropriate file type filtering

#### 3. Code Pattern Recognition
- **Purpose**: Test code structure understanding
- **Queries**: Programming patterns and conventions
- **Expected**: Contextual code understanding

## Configuration

### Default Configuration

```javascript
const CONFIG = {
    projectPath: 'C:\\workspace\\domain-platform\\websitestore.com.ua',
    outputDir: './rag-test-results',
    verbose: false,
    testTypes: ['all', 'performance', 'edge-cases', 'accuracy'],
    defaultTestType: 'all'
};
```

### Custom Configuration

Create a configuration file and pass it via `--config` option:

```javascript
// custom-config.js
export default {
    projectPath: '/custom/project/path',
    outputDir: './custom-results',
    verbose: true,
    testTypes: ['performance', 'accuracy'],
    defaultTestType: 'performance'
};
```

## Output Files

### 1. Detailed Results (JSON)
```
simulation-results-{timestamp}.json
```

Contains:
- Complete test execution details
- Per-query results and metrics
- Error information and stack traces
- Performance measurements

### 2. Summary Results (JSON)
```
simulation-summary-{timestamp}.json
```

Contains:
- Aggregated metrics
- Success rates and averages
- Test type breakdowns
- Overall performance statistics

### 3. Human-readable Report (Markdown)
```
simulation-report-{timestamp}.md
```

Contains:
- Executive summary
- Performance charts and tables
- Detailed scenario results
- Recommendations and insights

## Result Structure

### Scenario Result Format

```javascript
{
    testType: 'performance',
    name: 'Simple keyword search',
    queries: [
        {
            query: 'backend architecture',
            success: true,
            responseTime: 1250.5,
            error: null,
            results: [
                {
                    file: 'path/to/file.php',
                    score: 0.85,
                    snippet: 'Backend architecture implementation...'
                }
            ],
            resultCount: 5,
            expectedResults: 3,
            shouldFail: false
        }
    ],
    passed: 5,
    failed: 0,
    averageResponseTime: 1250.5,
    totalResponseTime: 6252.5,
    success: true
}
```

### Summary Format

```javascript
{
    totalScenarios: 15,
    passedScenarios: 14,
    failedScenarios: 1,
    totalQueries: 45,
    successfulQueries: 42,
    failedQueries: 3,
    averageResponseTime: 1250.5,
    totalProcessingTime: 15000.0,
    successRate: '93.33',
    querySuccessRate: '93.33',
    scenariosByType: {
        performance: {
            total: 5,
            passed: 5,
            failed: 0,
            scenarios: [...]
        },
        edgeCases: {
            total: 6,
            passed: 5,
            failed: 1,
            scenarios: [...]
        }
    }
}
```

## Performance Metrics

### Response Time Analysis

- **Average Response Time**: Mean response time across all queries
- **Total Processing Time**: Overall test suite execution time
- **Per-scenario Times**: Individual scenario performance metrics
- **Timeout Tracking**: Queries that exceeded timeout limits

### Success Rate Analysis

- **Scenario Success Rate**: Percentage of successful scenarios
- **Query Success Rate**: Percentage of successful queries
- **Test Type Success Rates**: Success rates by test category
- **Error Categorization**: Types and frequencies of errors

### Quality Metrics

- **Result Relevance**: Quality scoring of returned results
- **Result Count Validation**: Verification of expected result counts
- **Content Quality**: Assessment of result snippet quality
- **File Type Distribution**: Analysis of result file types

## Error Handling

### Error Types

1. **Timeout Errors**: Queries exceeding timeout limits
2. **Index Errors**: Issues with index loading or access
3. **Search Errors**: Problems during search execution
4. **Validation Errors**: Issues with result validation
5. **System Errors**: General system or configuration issues

### Error Recovery

- **Graceful Degradation**: Continue testing despite individual failures
- **Detailed Logging**: Comprehensive error information
- **Recovery Strategies**: Automatic retry mechanisms where appropriate
- **Fallback Handling**: Alternative approaches for failed scenarios

## Integration with CI/CD

### Automated Testing

```yaml
# GitHub Actions example
name: RAG Testing
on: [push, pull_request]
jobs:
  rag-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run RAG tests
        run: node scripts/rag-testing-simulation.js --test-type performance
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: rag-test-results
          path: rag-test-results/
```

### Quality Gates

- **Minimum Success Rate**: Fail builds if success rate below threshold
- **Maximum Response Time**: Fail builds if response times exceed limits
- **Error Thresholds**: Fail builds if error rates are too high
- **Regression Detection**: Compare results with baseline metrics

## Best Practices

### Test Design

1. **Representative Queries**: Use queries that reflect real user behavior
2. **Diverse Scenarios**: Cover different use cases and edge cases
3. **Performance Baselines**: Establish and track performance benchmarks
4. **Regular Updates**: Keep test scenarios current with codebase changes

### Performance Optimization

1. **Index Quality**: Ensure high-quality embeddings and indexing
2. **Query Optimization**: Use effective search query patterns
3. **Resource Management**: Monitor memory and CPU usage
4. **Caching Strategies**: Implement appropriate caching mechanisms

### Quality Assurance

1. **Result Validation**: Verify result relevance and accuracy
2. **Error Monitoring**: Track and analyze error patterns
3. **User Experience**: Consider end-user perspective in test design
4. **Continuous Improvement**: Regularly refine test scenarios based on results

## Troubleshooting

### Common Issues

1. **Index Loading Failures**
   - Check project path exists and is accessible
   - Verify index files are present and not corrupted
   - Ensure sufficient disk space and permissions

2. **Slow Response Times**
   - Check system resources (CPU, memory, disk)
   - Verify index size and complexity
   - Consider query optimization

3. **Low Success Rates**
   - Review query quality and relevance
   - Check index coverage and quality
   - Validate expected result thresholds

4. **Memory Issues**
   - Monitor memory usage during testing
   - Consider reducing batch sizes or query counts
   - Check for memory leaks in the RAG system

### Debug Mode

Enable verbose logging for detailed debugging:

```bash
node scripts/rag-testing-simulation.js --verbose
```

This provides:
- Detailed query execution logs
- Performance timing information
- Error stack traces and context
- System state information

## Future Enhancements

### Planned Features

1. **Visual Dashboard**: Web-based interface for test results
2. **Historical Tracking**: Long-term performance trend analysis
3. **A/B Testing**: Compare different RAG configurations
4. **Load Testing**: Simulate concurrent user loads
5. **Custom Metrics**: User-defined performance indicators

### Extension Points

1. **Custom Test Types**: Add new test categories
2. **Plugin System**: Extensible test scenario framework
3. **Integration APIs**: Programmatic access to test results
4. **Reporting Templates**: Customizable report formats

## Support and Maintenance

### Regular Maintenance

1. **Test Scenario Updates**: Keep scenarios current with codebase
2. **Performance Baseline Updates**: Adjust expectations based on improvements
3. **Error Pattern Analysis**: Identify and address recurring issues
4. **Documentation Updates**: Keep documentation current

### Support Resources

- **Issue Tracking**: Use GitHub issues for bug reports and feature requests
- **Documentation**: This file and inline code comments
- **Code Examples**: Test scenarios serve as usage examples
- **Community**: Team collaboration and knowledge sharing

## Conclusion

The RAG Testing Simulation provides a comprehensive framework for validating and improving the RAG system's performance, accuracy, and reliability. By regularly running these tests and analyzing the results, the team can ensure the system meets quality standards and continues to improve over time.

Regular testing helps identify:
- Performance bottlenecks and optimization opportunities
- Accuracy issues and areas for improvement
- Edge cases and potential vulnerabilities
- Regression issues from code changes

The detailed reporting and metrics enable data-driven decisions about system improvements and resource allocation.