"""
Ollama Routes Module
Contains Flask route handlers for Ollama management
"""

# Import app from parent module
from . import app
from .ollama_manager import get_ollama_manager


# ========== Ollama Manager Endpoints ==========
@app.route('/ollama/status', methods=['GET'])
def ollama_status():
    """Статус Ollama"""
    mgr = get_ollama_manager()
    return mgr.get_status()


@app.route('/ollama/start', methods=['GET'])
def ollama_start():
    """Запустить Ollama"""
    mgr = get_ollama_manager()
    return mgr.start()


@app.route('/ollama/stop', methods=['POST'])
def ollama_stop():
    """Остановить Ollama"""
    mgr = get_ollama_manager()
    return mgr.stop()


@app.route('/ollama/restart', methods=['POST'])
def ollama_restart():
    """Перезапустить Ollama"""
    mgr = get_ollama_manager()
    return mgr.restart()
