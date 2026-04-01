"""
Lightweight in-memory metrics collection for the AI proxy with Prometheus support.

Metrics:
- ai_proxy_requests_total - total requests counter
- ai_proxy_request_duration_seconds - request duration histogram
- ai_proxy_errors_total - error counter
- ollama_model_loaded - gauge for model availability
"""

from __future__ import annotations

import threading
import time
from collections import Counter
from typing import Any, Dict, List, Tuple


class PrometheusMetrics:
    """Thread-safe Prometheus-compatible metrics collector."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # Counters
        self._requests_total: int = 0
        self._requests_by_path: Counter[str] = Counter()
        self._requests_by_method: Counter[str] = Counter()
        self._requests_by_status: Counter[str] = Counter()
        self._errors_total: int = 0
        self._errors_by_type: Counter[str] = Counter()
        
        # Histogram buckets for latency (in seconds)
        self._latency_buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        self._latency_bucket_counts: Dict[str, int] = {str(b): 0 for b in self._latency_buckets}
        self._latency_bucket_counts['+Inf'] = 0
        self._latency_sum: float = 0.0
        self._latency_count: int = 0
        
        # Gauge
        self._ollama_model_loaded: int = 0
        
        # Start time
        self._start_time: float = time.time()

    def record_request(
        self,
        *,
        path: str,
        method: str,
        status_code: int,
        duration: float,
    ) -> None:
        """Record a single HTTP request."""
        # Guard against obviously broken values
        if duration < 0:
            duration = 0.0

        key_status = str(status_code)
        method_upper = method.upper()

        with self._lock:
            self._requests_total += 1
            self._requests_by_path[path] += 1
            self._requests_by_method[method_upper] += 1
            self._requests_by_status[key_status] += 1
            
            # Record errors (4xx and 5xx)
            if status_code >= 400:
                self._errors_total += 1
                error_type = 'client' if status_code < 500 else 'server'
                self._errors_by_type[error_type] += 1
            
            # Record latency in histogram
            self._latency_sum += duration
            self._latency_count += 1
            for bucket in self._latency_buckets:
                if duration <= bucket:
                    self._latency_bucket_counts[str(bucket)] += 1
                    break
            else:
                self._latency_bucket_counts['+Inf'] += 1

    def record_error(self, error_type: str = 'unknown') -> None:
        """Record an error occurrence."""
        with self._lock:
            self._errors_total += 1
            self._errors_by_type[error_type] += 1

    def set_ollama_loaded(self, loaded: bool) -> None:
        """Set Ollama model loaded gauge."""
        with self._lock:
            self._ollama_model_loaded = 1 if loaded else 0

    def prometheus_format(self) -> str:
        """Return metrics in Prometheus text format."""
        with self._lock:
            lines: List[str] = []
            
            # Header
            lines.append("# AI Proxy Metrics")
            lines.append(f"# Generated at: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
            lines.append("")
            
            # Uptime
            uptime = time.time() - self._start_time
            lines.append("# HELP ai_proxy_uptime_seconds Total uptime in seconds")
            lines.append("# TYPE ai_proxy_uptime_seconds gauge")
            lines.append(f"ai_proxy_uptime_seconds {uptime:.3f}")
            lines.append("")
            
            # Total requests counter
            lines.append("# HELP ai_proxy_requests_total Total number of requests")
            lines.append("# TYPE ai_proxy_requests_total counter")
            lines.append(f"ai_proxy_requests_total {self._requests_total}")
            
            # Requests by path
            lines.append("# HELP ai_proxy_requests_by_path Total requests by path")
            lines.append("# TYPE ai_proxy_requests_by_path counter")
            for path, count in sorted(self._requests_by_path.items()):
                lines.append(f'ai_proxy_requests_by_path{{path="{path}"}} {count}')
            
            # Requests by method
            lines.append("# HELP ai_proxy_requests_by_method Total requests by HTTP method")
            lines.append("# TYPE ai_proxy_requests_by_method counter")
            for method, count in sorted(self._requests_by_method.items()):
                lines.append(f'ai_proxy_requests_by_method{{method="{method}"}} {count}')
            
            # Requests by status
            lines.append("# HELP ai_proxy_requests_by_status Total requests by HTTP status code")
            lines.append("# TYPE ai_proxy_requests_by_status counter")
            for status, count in sorted(self._requests_by_status.items()):
                lines.append(f'ai_proxy_requests_by_status{{status="{status}"}} {count}')
            lines.append("")
            
            # Request duration histogram
            lines.append("# HELP ai_proxy_request_duration_seconds Request duration in seconds")
            lines.append("# TYPE ai_proxy_request_duration_seconds histogram")
            for bucket in self._latency_buckets:
                count = self._latency_bucket_counts[str(bucket)]
                lines.append(f'ai_proxy_request_duration_seconds_bucket{{le="{bucket}"}} {count}')
            lines.append(f'ai_proxy_request_duration_seconds_bucket{{le="+Inf"}} {self._latency_bucket_counts["+Inf"]}')
            lines.append(f'ai_proxy_request_duration_seconds_sum {self._latency_sum:.6f}')
            lines.append(f'ai_proxy_request_duration_seconds_count {self._latency_count}')
            lines.append("")
            
            # Errors counter
            lines.append("# HELP ai_proxy_errors_total Total number of errors")
            lines.append("# TYPE ai_proxy_errors_total counter")
            lines.append(f"ai_proxy_errors_total {self._errors_total}")
            for error_type, count in sorted(self._errors_by_type.items()):
                lines.append(f'ai_proxy_errors_total{{type="{error_type}"}} {count}')
            lines.append("")
            
            # Ollama model loaded gauge
            lines.append("# HELP ollama_model_loaded Whether Ollama model is loaded (1=yes, 0=no)")
            lines.append("# TYPE ollama_model_loaded gauge")
            lines.append(f"ollama_model_loaded {self._ollama_model_loaded}")
            lines.append("")
            
            return "\n".join(lines)

    def snapshot(self) -> Dict[str, Any]:
        """Return a JSON snapshot of current metrics (for backward compatibility)."""
        with self._lock:
            total = self._requests_total
            avg_duration = self._latency_sum / self._latency_count if self._latency_count else 0.0

            return {
                "total_requests": total,
                "requests_by_path": dict(self._requests_by_path),
                "requests_by_status": dict(self._requests_by_status),
                "errors_total": self._errors_total,
                "avg_duration_seconds": avg_duration,
                "latency_sum_seconds": self._latency_sum,
                "latency_count": self._latency_count,
                "ollama_model_loaded": bool(self._ollama_model_loaded),
                "uptime_seconds": time.time() - self._start_time,
                "generated_at": time.time(),
            }


# Global singleton used by the Flask app
metrics = PrometheusMetrics()


# Backward compatibility - old class name
ProxyMetrics = PrometheusMetrics
