"""
Ollama Manager Module
Handles Ollama server start/stop/management
"""
import logging
import os
import threading
import time
import requests

from .config import OLLAMA_IDLE_TIMEOUT, OLLAMA_KEEP_ALIVE, OLLAMA_HOST, OLLAMA_MODELS
from .network import check_port_occupied

logger = logging.getLogger(__name__)


class OllamaManager:
    """Управление Ollama - старт/стоп внутри daemon"""
    
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
        """Проверить запущена ли Ollama"""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return resp.status_code == 200
        except requests.RequestException as e:
            logger.warning("Ollama check failed for %s: %s", self.base_url, e)
            return False
    
    def start(self) -> dict:
        """Запустить Ollama"""
        with self._lock:
            if self.is_running():
                return {'status': 'already_running', 'url': self.base_url}
            
            try:
                # Запускаем ollama serve на нужном порту
                import subprocess
                env = {**os.environ, 'OLLAMA_HOST': f'http://localhost:{self.port}'}
                if OLLAMA_MODELS:
                    env['OLLAMA_MODELS'] = OLLAMA_MODELS
                self.process = subprocess.Popen(
                    ['ollama', 'serve'],
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                self._running = True
                self.started_by_proxy = True
                
                # Ждем запуска
                for _ in range(30):
                    if self.is_running():
                        break
                    time.sleep(0.5)
                
                return {'status': 'started', 'url': self.base_url, 'pid': self.process.pid if self.process else None}
            except Exception as e:
                logger.warning("Ollama start failed: %s", e, exc_info=True)
                return {'status': 'error', 'error': str(e)}
    
    def stop(self) -> dict:
        """Остановить Ollama"""
        with self._lock:
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                self.process = None
            self._running = False
            return {'status': 'stopped'}
    
    def restart(self) -> dict:
        """Перезапустить Ollama"""
        self.stop()
        time.sleep(1)
        return self.start()
    
    def get_status(self) -> dict:
        """Получить статус Ollama"""
        running = self.is_running()
        idle_time = int(time.time() - self._last_request_time) if running else 0
        return {
            'running': running,
            'url': self.base_url,
            'pid': self.process.pid if self.process and self.process.poll() is None else None,
            'idle_seconds': idle_time,
            'idle_timeout': OLLAMA_IDLE_TIMEOUT
        }
    
    def touch(self):
        """Обновить время последнего запроса"""
        self._last_request_time = time.time()


# Глобальный экземпляр менеджера
_ollama_manager = None


def get_ollama_manager() -> OllamaManager:
    global _ollama_manager
    if _ollama_manager is None:
        # Извлекаем порт из OLLAMA_HOST
        import re
        host = 'localhost'
        port = 11435
        if OLLAMA_HOST:
            match = re.search(r':(\d+)', OLLAMA_HOST)
            if match:
                port = int(match.group(1))
        _ollama_manager = OllamaManager(host=host, port=port)
    return _ollama_manager


def get_ollama_host_port():
    """Извлекает хост и порт из OLLAMA_HOST"""
    import re
    host = OLLAMA_HOST.replace('http://', '').replace('https://', '')
    if ':' in host:
        host, port_str = host.rsplit(':', 1)
        try:
            port = int(port_str)
        except ValueError:
            logger.warning(
                "OLLAMA_HOST port not an integer (%r in %r); using 11435",
                port_str,
                OLLAMA_HOST,
            )
            port = 11435
    else:
        port = 11435
    return host, port
