"""
Daemon Routes Module
Contains Flask route handlers for daemon management
"""
import logging

# Import app from parent module
from . import app
from .config import DAEMON_ENABLED

logger = logging.getLogger(__name__)


@app.route('/daemon/status', methods=['GET'])
def daemon_status():
    """Get daemon status including provider connection status."""
    from .daemon import get_daemon
    from .providers.router import get_router
    
    daemon = get_daemon()
    
    # Get provider status
    provider_status = {}
    try:
        router = get_router()
        if router._initialized:
            provider_status = router.get_provider_status()
    except Exception as e:
        logger.warning("daemon_status: get_provider_status failed: %s", e, exc_info=True)
        provider_status = {"error": str(e)}
    
    return {
        "enabled": DAEMON_ENABLED,
        "running": daemon._running if daemon else False,
        "poll_interval": daemon.poll_interval if daemon else None,
        "auto_execute": daemon.auto_execute if daemon else None,
        "providers": provider_status,
    }


@app.route('/daemon/start', methods=['POST'])
def daemon_start():
    """Start the daemon (if not already running)."""
    from .daemon import start_daemon, get_daemon
    
    daemon = get_daemon()
    if daemon and daemon._running:
        return {"status": "already_running"}
    
    start_daemon()
    return {"status": "started"}


@app.route('/daemon/stop', methods=['POST'])
def daemon_stop():
    """Stop the daemon."""
    from .daemon import stop_daemon, get_daemon

    daemon = get_daemon()
    if not daemon or not daemon._running:
        return {"status": "not_running"}

    stop_daemon()
    return {"status": "stopped"}
