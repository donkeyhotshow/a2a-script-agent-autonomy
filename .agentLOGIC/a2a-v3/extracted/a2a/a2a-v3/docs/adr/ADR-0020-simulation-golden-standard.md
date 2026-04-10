# ADR-0020: Simulation Golden Standard

Status: accepted
Date: 2026-03-06

## Context

AI-powered systems are inherently unpredictable and expensive to test with real LLM calls. The project needed a deterministic testing approach that could validate behavior without external dependencies. Without simulations:

- Tests are flaky due to AI response variability
- Expensive API calls for every test run
- Difficult to test error conditions and edge cases
- No way to validate expected behavior consistently
- Slow test execution due to network latency

The project needed a simulation system that serves as the "golden standard" for comparing behavior across all layers.

## Decision

Use simulations as the golden standard for testing, with recorded AI responses and deterministic replay capabilities.

### Simulation Architecture

**Golden Standard Definition:**
Simulations define the expected behavior for all system interactions, serving as:
- Test baselines for behavior validation
- Documentation of expected system responses
- Regression testing foundation
- Development environment consistency

**Simulation Components:**

1. **Request/Response Pairs:**
```javascript
{
  request: {
    sessionId: "sess_123",
    message: "Hello world",
    context: { /* full context */ }
  },
  response: {
    step: "completed",
    message: "Hello! How can I help you?",
    execute: null
  }
}
```

2. **Simulation Modes:**
   - **Record**: Capture real AI responses for future replay
   - **Replay**: Use recorded responses for deterministic testing
   - **Mock**: Use predefined responses for specific scenarios

3. **Validation Framework:**
   - Compare actual responses against simulation expectations
   - Report deviations and suggest updates
   - Support fuzzy matching for non-deterministic elements

### Simulation Pipeline

```
Request → Simulation Lookup → Response Generation → Validation → Storage
```

**Key Features:**
- **Deterministic Testing**: Same input always produces same output
- **Cost Effective**: No API calls during testing
- **Fast Execution**: No network latency
- **Comprehensive Coverage**: Test all code paths with controlled responses
- **Evolution Tracking**: Simulations evolve with system changes

## Consequences

### Positive
- **Reliable Testing**: Deterministic test results
- **Cost Reduction**: No ongoing API costs for testing
- **Fast Development**: Quick test execution cycles
- **Edge Case Testing**: Easy to create scenarios for rare conditions
- **Documentation**: Simulations serve as executable specifications

### Negative
- **Maintenance Overhead**: Simulations need updates when behavior changes
- **Coverage Limitations**: May miss real-world AI behavior variations
- **Complexity**: Additional simulation management layer
- **Staleness Risk**: Simulations can become outdated

### Trade-offs
- **Determinism vs Realism**: Controlled responses vs real AI variability
- **Maintenance vs Reliability**: Simulation updates for consistent testing
- **Speed vs Coverage**: Fast testing may miss integration issues

## Notes / Follow-ups

### Completed
- ✅ Simulation schema and format definition
- ✅ Record/replay infrastructure
- ✅ Validation framework
- ✅ Integration with testing pipeline
- ✅ Simulation management utilities

### Future Enhancements
- Add fuzzy matching for dynamic content
- Implement simulation versioning
- Add simulation coverage metrics
- Integrate with property-based testing
- Add simulation diffing tools