import { Histogram, Registry } from "prom-client";

export const register = new Registry();

export const requestProcessorLatencyHistogram = new Histogram({
  name: "request_processor_latency_ms",
  help: "Latency of request processor ticks in milliseconds",
  labelNames: ["outcome"],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});
