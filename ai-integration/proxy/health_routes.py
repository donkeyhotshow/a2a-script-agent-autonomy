"""
Health Routes Module
Contains Flask route handlers for health checks and system status
"""
import logging
import os

from flask import Flask, request, Response, send_from_directory

logger = logging.getLogger(__name__)

# Import app from parent module
from . import app
from .config import PROXY_PORT, LOCAL_LLM_UPSTREAM_URL, STORAGE_DIR
from .caching import get_cache

# Web folder for static files
WEB_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')


@app.route('/', methods=['GET', 'HEAD'])
def root():
    """Корневой маршрут - возвращает queue viewer для браузеров, 200 для API clients"""
    # Check if request accepts HTML (browser)
    accept_header = request.headers.get('Accept', '')
    user_agent = request.headers.get('User-Agent', '').lower()

    # If it's a browser request (accepts HTML), serve the queue viewer
    if 'text/html' in accept_header or 'mozilla' in user_agent or 'chrome' in user_agent or 'safari' in user_agent:
        index_path = os.path.join(WEB_FOLDER, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(WEB_FOLDER, 'index.html')

    # For API clients, return simple health status
    return '', 200


@app.route('/health')
def health():
    """Проверка здоровья прокси (liveness probe)"""
    from .local_llm_manager import get_local_llm_upstream_host_port, check_port_occupied
    from .ai_hub_config import _CONFIG_PATH, get_ai_hub_config
    from .caching import get_cache
    from .config import SIMULATION_ENABLED, PROMISE_DAEMON_ONLY
    
    local_llm_upstream_host, local_llm_upstream_port = get_local_llm_upstream_host_port()
    local_llm_upstream_available = check_port_occupied(local_llm_upstream_host, local_llm_upstream_port)
    cfg = get_ai_hub_config()
    cache = get_cache()
    return {
        "status": "running",
        "proxy_port": PROXY_PORT,
        "local_llm_upstream_host": LOCAL_LLM_UPSTREAM_URL,
        "local_llm_upstream_port": local_llm_upstream_port,
        "local_llm_upstream_available": local_llm_upstream_available,
        "storage_dir": STORAGE_DIR,
        "ai_hub_config": (_CONFIG_PATH or os.environ.get('AI_HUB_CONFIG', '')) or None,
        "ai_hub_rules": len(cfg.get('rules') or []),
        "simulation_enabled": SIMULATION_ENABLED,
        "promise_daemon_only": PROMISE_DAEMON_ONLY,
        "cache": cache.status(),
    }


@app.route('/health/local-llm-upstream')
def health_local_llm_upstream():
    """Проверка доступности Local LLM upstream (deep health check)"""
    from .local_llm_manager import get_local_llm_upstream_host_port, check_port_occupied, get_local_llm_manager
    
    local_llm_upstream_host, local_llm_upstream_port = get_local_llm_upstream_host_port()
    local_llm_upstream_available = check_port_occupied(local_llm_upstream_host, local_llm_upstream_port)
    mgr = get_local_llm_manager()
    
    upstream_llm_status = mgr.get_status() if local_llm_upstream_available else {'running': False, 'error': 'port not available'}
    
    if local_llm_upstream_available:
        return {
            "status": "healthy",
            "local_llm_upstream_available": True,
            "local_llm_upstream_url": mgr.base_url,
            "local_llm_upstream_pid": upstream_llm_status.get('pid'),
            "idle_seconds": upstream_llm_status.get('idle_seconds', 0),
        }
    else:
        return {
            "status": "unhealthy",
            "local_llm_upstream_available": False,
            "local_llm_upstream_host": local_llm_upstream_host,
            "local_llm_upstream_port": local_llm_upstream_port,
            "error": "Local LLM upstream is not responding on the configured host/port",
        }, 503


@app.route('/health/ready')
def health_ready():
    """Проверка готовности прокси к обработке запросов (readiness probe)"""
    from .local_llm_manager import get_local_llm_upstream_host_port, check_port_occupied
    from .caching import get_cache
    from .providers import get_router
    
    local_llm_upstream_host, local_llm_upstream_port = get_local_llm_upstream_host_port()
    local_llm_upstream_available = check_port_occupied(local_llm_upstream_host, local_llm_upstream_port)
    cache = get_cache()

    try:
        router = get_router()
        default_provider = getattr(router.config, "default_provider", None)
    except Exception as e:
        logger.warning("health/ready: get_router failed: %s", e, exc_info=True)
        return {
            "status": "not_ready",
            "reason": "router_unavailable",
            "error": str(e),
            "local_llm_upstream_available": local_llm_upstream_available,
            "local_llm_upstream_host": local_llm_upstream_host,
            "local_llm_upstream_port": local_llm_upstream_port,
        }, 503

    requires_compat_llm = default_provider == 'compat_llm'
    
    if requires_compat_llm and not local_llm_upstream_available:
        return {
            "status": "not_ready",
            "reason": "local_llm_upstream_not_available",
            "default_provider": default_provider,
            "local_llm_upstream_host": local_llm_upstream_host,
            "local_llm_upstream_port": local_llm_upstream_port,
        }, 503
    
    return {
        "status": "ready",
        "default_provider": default_provider,
        "local_llm_upstream_available": local_llm_upstream_available,
        "cache_status": cache.status().get('status', 'unknown'),
    }
