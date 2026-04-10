"""
Metrics Routes Module
Contains Flask route handlers for Prometheus metrics
"""
from flask import Response

# Import app from parent module
from . import app
from .metrics import metrics


@app.route('/metrics', methods=['GET'])
def proxy_metrics():
    """Prometheus-compatible metrics endpoint."""
    from .local_llm_manager import get_local_llm_manager
    
    # Update local_llm_model_loaded gauge before generating metrics
    mgr = get_local_llm_manager()
    is_loaded = mgr.is_running() if hasattr(mgr, 'is_running') else False
    metrics.set_local_llm_loaded(is_loaded)
    
    prometheus_output = metrics.prometheus_format()
    return Response(prometheus_output, mimetype='text/plain; version=0.0.4; charset=utf-8')
