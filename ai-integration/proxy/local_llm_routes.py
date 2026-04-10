"""Flask routes for local upstream LLM process management."""

from . import app
from .local_llm_manager import get_local_llm_manager


@app.route('/local-llm-upstream/status', methods=['GET'])
def local_llm_upstream_status():
    mgr = get_local_llm_manager()
    return mgr.get_status()


@app.route('/local-llm-upstream/start', methods=['GET'])
def local_llm_upstream_start():
    mgr = get_local_llm_manager()
    return mgr.start()


@app.route('/local-llm-upstream/stop', methods=['POST'])
def local_llm_upstream_stop():
    mgr = get_local_llm_manager()
    return mgr.stop()


@app.route('/local-llm-upstream/restart', methods=['POST'])
def local_llm_upstream_restart():
    mgr = get_local_llm_manager()
    return mgr.restart()
