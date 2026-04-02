"""
Health Routes Module
Contains Flask route handlers for health checks and system status
"""
import os
from flask import Flask, request, Response, send_from_directory

# Import app from parent module
from . import app
from .config import PROXY_PORT, OLLAMA_HOST, STORAGE_DIR
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
    from .ollama_manager import get_ollama_host_port, check_port_occupied
    from .ai_hub_config import _CONFIG_PATH, get_ai_hub_config
    from .caching import get_cache
    from .config import SIMULATION_ENABLED
    
    ollama_host, ollama_port = get_ollama_host_port()
    ollama_available = check_port_occupied(ollama_host, ollama_port)
    cfg = get_ai_hub_config()
    cache = get_cache()
    return {
        "status": "running",
        "proxy_port": PROXY_PORT,
        "ollama_host": OLLAMA_HOST,
        "ollama_port": ollama_port,
        "ollama_available": ollama_available,
        "storage_dir": STORAGE_DIR,
        "ai_hub_config": (_CONFIG_PATH or os.environ.get('AI_HUB_CONFIG', '')) or None,
        "ai_hub_rules": len(cfg.get('rules') or []),
        "simulation_enabled": SIMULATION_ENABLED,
        "cache": cache.status(),
    }


@app.route('/health/ollama')
def health_ollama():
    """Проверка доступности Ollama (deep health check)"""
    from .ollama_manager import get_ollama_host_port, check_port_occupied, get_ollama_manager
    
    ollama_host, ollama_port = get_ollama_host_port()
    ollama_available = check_port_occupied(ollama_host, ollama_port)
    mgr = get_ollama_manager()
    
    ollama_status = mgr.get_status() if ollama_available else {'running': False, 'error': 'port not available'}
    
    if ollama_available:
        return {
            "status": "healthy",
            "ollama_available": True,
            "ollama_url": mgr.base_url,
            "ollama_pid": ollama_status.get('pid'),
            "idle_seconds": ollama_status.get('idle_seconds', 0),
        }
    else:
        return {
            "status": "unhealthy",
            "ollama_available": False,
            "ollama_host": ollama_host,
            "ollama_port": ollama_port,
            "error": "Ollama is not responding on the configured host/port",
        }, 503


@app.route('/health/ready')
def health_ready():
    """Проверка готовности прокси к обработке запросов (readiness probe)"""
    from .ollama_manager import get_ollama_host_port, check_port_occupied
    from .caching import get_cache
    from .providers import get_router
    
    ollama_host, ollama_port = get_ollama_host_port()
    ollama_available = check_port_occupied(ollama_host, ollama_port)
    cache = get_cache()

    router = get_router()
    default_provider = getattr(router.config, 'default_provider', None)
    requires_ollama = default_provider == 'ollama'
    
    if requires_ollama and not ollama_available:
        return {
            "status": "not_ready",
            "reason": "ollama_not_available",
            "default_provider": default_provider,
            "ollama_host": ollama_host,
            "ollama_port": ollama_port,
        }, 503
    
    return {
        "status": "ready",
        "default_provider": default_provider,
        "ollama_available": ollama_available,
        "cache_status": cache.status().get('status', 'unknown'),
    }
