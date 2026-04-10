import { Registry, Histogram } from 'prom-client';

// Create a registry for our metrics
export const register = new Registry();

// Histogram for request processor latency
export const requestProcessorLatencyHistogram = new Histogram({
  name: 'request_processor_latency_ms',
  help: 'Latency of request processor ticks in milliseconds',
  labelNames: ['outcome'], // We can label by outcome (success, failed, etc.)
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // Up to 10 seconds
});

// Register the histogram
register.registerMetric(requestProcessorLatencyHistogram);