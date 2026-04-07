"""
Manage optional auto-start of the local upstream LLM process (operator configures command).
"""
import logging
import os
import shlex
import subprocess
import threading
import time
import requests

from .config import (
    LOCAL_LLM_IDLE_TIMEOUT,
    LOCAL_LLM_UPSTREAM_URL,
    LOCAL_LLM_MODELS_DIR,
)
from .network import check_port_occupied

logger = logging.getLogger(__name__)


class LocalLlmManager:
    def __init__(self, host: str = None, port: int = None):
        self.host = host or 'localhost'
        self.port = port or 11435
        self.base_url = f"http://{self.host}:{self.port}"
        self.process = None
        self.started_by_proxy = False
        self._lock = threading.Lock()
        self._last_request_time = time.time()
        self._idle_timer = None
        self._running = False

    def is_running(self) -> bool:
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return resp.status_code == 200
        except requests.RequestException as e:
            logger.warning("Local LLM upstream check failed for %s: %s", self.base_url, e)
            return False

    def start(self) -> dict:
        with self._lock:
            if self.is_running():
                return {'status': 'already_running', 'url': self.base_url}

            raw = os.environ.get('LOCAL_LLM_SERVE_CMD', '').strip()
            if not raw:
                return {
                    'status': 'error',
                    'error': 'LOCAL_LLM_SERVE_CMD is not set; cannot auto-start upstream LLM',
                }

            try:
                env = {**os.environ}
                if LOCAL_LLM_MODELS_DIR:
                    env['LOCAL_LLM_MODELS_DIR'] = LOCAL_LLM_MODELS_DIR
                args = shlex.split(raw, posix=os.name != 'nt')
                self.process = subprocess.Popen(
                    args,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                self._running = True
                self.started_by_proxy = True

                for _ in range(30):
                    if self.is_running():
                        break
                    time.sleep(0.5)

                return {'status': 'started', 'url': self.base_url, 'pid': self.process.pid if self.process else None}
            except Exception as e:
                logger.warning("Local LLM upstream start failed: %s", e, exc_info=True)
                return {'status': 'error', 'error': str(e)}

    def stop(self) -> dict:
        with self._lock:
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning(
                        "Local LLM subprocess PID %s did not exit within 5s; sending kill",
                        getattr(self.process, "pid", None),
                    )
                    self.process.kill()
                self.process = None
            self._running = False
            return {'status': 'stopped'}

    def restart(self) -> dict:
        self.stop()
        time.sleep(1)
        return self.start()

    def get_status(self) -> dict:
        running = self.is_running()
        idle_time = int(time.time() - self._last_request_time) if running else 0
        return {
            'running': running,
            'url': self.base_url,
            'pid': self.process.pid if self.process and self.process.poll() is None else None,
            'idle_seconds': idle_time,
            'idle_timeout': LOCAL_LLM_IDLE_TIMEOUT
        }

    def touch(self):
        self._last_request_time = time.time()


_local_llm_manager = None


def get_local_llm_manager() -> LocalLlmManager:
    global _local_llm_manager
    if _local_llm_manager is None:
        import re
        host = 'localhost'
        port = 11435
        if LOCAL_LLM_UPSTREAM_URL:
            match = re.search(r':(\d+)', LOCAL_LLM_UPSTREAM_URL)
            if match:
                port = int(match.group(1))
        _local_llm_manager = LocalLlmManager(host=host, port=port)
    return _local_llm_manager


def get_local_llm_upstream_host_port():
    import re
    host = LOCAL_LLM_UPSTREAM_URL.replace('http://', '').replace('https://', '')
    if ':' in host:
        host, port_str = host.rsplit(':', 1)
        try:
            port = int(port_str)
        except ValueError:
            logger.warning(
                "LOCAL_LLM_UPSTREAM_URL port not an integer (%r in %r); using 11435",
                port_str,
                LOCAL_LLM_UPSTREAM_URL,
            )
            port = 11435
    else:
        port = 11435
    return host, port
