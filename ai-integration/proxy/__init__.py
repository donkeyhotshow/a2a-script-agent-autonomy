"""
Ollama Proxy Package
"""

import time
import asyncio
import logging

from flask import Flask, g, request

_metrics_log = logging.getLogger(__name__)

from .metrics import metrics

app = Flask(__name__)


@app.before_request
def _start_request_timer() -> None:
    """
    Store request start time for basic latency metrics.
    """
    g._proxy_request_started_at = time.time()


@app.after_request
def _record_request_metrics(response):
    """
    Record basic per-request metrics.

    Metrics collection must never break the proxy; failures are logged.
    """
    try:
        started_at = getattr(g, "_proxy_request_started_at", None)
        if isinstance(started_at, (int, float)):
            duration = time.time() - started_at
        else:
            duration = 0.0

        metrics.record_request(
            path=request.path,
            method=request.method,
            status_code=response.status_code,
            duration=duration,
        )
    except Exception:
        _metrics_log.warning("metrics.record_request failed", exc_info=True)

    return response


# Import routes after app is created and middleware is configured
from . import routes  # noqa: E402,F401

# Register OpenAI-compatible API routes
try:
    from .openai_wrapper import openai_bp
    app.register_blueprint(openai_bp)
except ImportError as e:
    _metrics_log.warning("Could not register OpenAI API routes: %s", e)

# Initialize provider router on startup
def init_providers():
    """Initialize the provider router"""
    try:
        from .providers import get_router

        router = get_router()

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(router.initialize())
            _metrics_log.info("Provider router initialized successfully")
            return

        loop.create_task(router.initialize())
        _metrics_log.info("Provider router initialization scheduled")
    except Exception as e:
        _metrics_log.warning("Could not initialize provider router: %s", e, exc_info=True)

# Initialize providers when module is loaded
# init_providers()  # Commented out to avoid event loop issues


def init_daemon():
    """Auto-start promise daemon on proxy load (if DAEMON_ENABLED)."""
    try:
        from .config import DAEMON_ENABLED
        if DAEMON_ENABLED:
            from .daemon import start_daemon
            start_daemon()
            _metrics_log.info("Promise daemon auto-started")
    except Exception as e:
        _metrics_log.warning("Could not start daemon: %s", e, exc_info=True)


init_daemon()

