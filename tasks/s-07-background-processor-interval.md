# S-07: Server Background Processor Interval Target

## Problem
Need to set and verify REQUEST_PROCESSOR_INTERVAL_MS target based on queue latency SLO.

## Solution
1. Set default interval to 5000ms (5 seconds)
2. Make configurable via environment variable
3. Add metrics for queue processing latency

## Where
- File: `a2a-server/src/daemon/request-processor-daemon.ts`
- Config: `REQUEST_PROCESSOR_INTERVAL_MS` in config

## Implementation
```typescript
// In request-processor-daemon.ts
const DEFAULT_INTERVAL_MS = parseInt(process.env.REQUEST_PROCESSOR_INTERVAL_MS || '5000');
const SLO_LATENCY_MS = 10000; // 10s SLO

// Add latency metric
function recordProcessingLatency(durationMs: number) {
  metrics.histogram('request_processor_latency', durationMs);
  if (durationMs > SLO_LATENCY_MS) {
    logger.warn('Request processing exceeded SLO', { durationMs });
  }
}
```

## Verification
```bash
# Check queue latency metrics
curl http://localhost:3000/metrics | grep request_processor_latency
```
