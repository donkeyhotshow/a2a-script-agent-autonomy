"""
Main entry point for the Ollama Proxy
Run with: python -m proxy
or: python proxy.py
"""
import os
import sys
import atexit
import signal
import time
import logging
from typing import Optional

# Load .env file
from dotenv import load_dotenv
# Load from parent directory (ai-integration/)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from proxy import app
from proxy.config import PROXY_PORT, HEALTH_CHECK_INTERVAL
from proxy.ollama_manager import get_ollama_host_port, check_port_occupied, get_ollama_manager
from proxy.utils import kill_ports
from proxy.daemon import start_daemon, stop_daemon
from proxy.config import CLEANUP_INTERVAL_HOURS, ENABLE_CLEANUP

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ai-proxy')


class GracefulShutdown:
    """Управление graceful shutdown прокси."""
    
    def __init__(self):
        self._shutting_down = False
        self._shutdown_reason: Optional[str] = None
        self._active_requests = 0
        self._lock = None
    
    def initialize(self):
        """Initialize shutdown handlers."""
        try:
            import threading
            self._lock = threading.Lock()
        except ImportError:
            pass
    
    @property
    def is_shutting_down(self) -> bool:
        return self._shutting_down
    
    def request_started(self):
        """Отметить начало обработки запроса."""
        if self._lock:
            with self._lock:
                self._active_requests += 1
        else:
            self._active_requests += 1
    
    def request_finished(self):
        """Отметить завершение обработки запроса."""
        if self._lock:
            with self._lock:
                self._active_requests -= 1
        else:
            self._active_requests -= 1
    
    def shutdown(self, reason: Optional[str] = None) -> None:
        """Инициировать graceful shutdown."""
        if self._shutting_down:
            logger.warning("Shutdown already in progress, ignoring duplicate signal")
            return
        
        self._shutting_down = True
        self._shutdown_reason = reason
        
        logger.info(f"{'=' * 50}")
        logger.info(f"Graceful shutdown initiated")
        if reason:
            logger.info(f"Reason: {reason}")
        logger.info(f"{'=' * 50}")
        
        # Остановить Ollama если она была запущена прокси
        mgr = get_ollama_manager()
        if mgr.process is not None and mgr.started_by_proxy:
            logger.info("Stopping Ollama (started by proxy)...")
            try:
                result = mgr.stop()
                logger.info(f"Ollama stopped: {result}")
            except Exception as e:
                logger.error(f"Error stopping Ollama: {e}")
        
        # Ждем завершения активных запросов
        drain_start = time.time()
        max_drain_time = 30  # максимальное время ожидания в секундах
        drain_interval = 0.1
        
        while self._active_requests > 0:
            elapsed = time.time() - drain_start
            if elapsed > max_drain_time:
                logger.warning(f"Drain timeout reached after {elapsed:.1f}s, {self._active_requests} requests still active")
                break
            
            logger.info(f"Draining {self._active_requests} active connection(s)... ({elapsed:.1f}s)")
            time.sleep(drain_interval)
        
        if self._active_requests == 0:
            logger.info("All connections drained successfully")
        
        logger.info("Shutdown complete")


# Global shutdown manager
shutdown_manager = GracefulShutdown()


def _cleanup(why: Optional[str] = None) -> None:
    """Cleanup function called at exit."""
    # Stop the daemon
    stop_daemon()
    shutdown_manager.shutdown(why)


def _install_cleanup_handlers() -> None:
    """Install signal handlers for graceful shutdown."""
    atexit.register(lambda: _cleanup("process exit"))
    
    def _handle_signal(signum, _frame):
        signal_name = signal.Signals(signum).name if hasattr(signal, 'Signals') else str(signum)
        logger.info(f"Received signal {signal_name}")
        _cleanup(f"signal {signal_name}")
        # Exit cleanly
        sys.exit(0)
    
    for sig in (getattr(signal, "SIGINT", None), getattr(signal, "SIGTERM", None)):
        if sig is not None:
            try:
                signal.signal(sig, _handle_signal)
                logger.debug(f"Installed handler for signal {sig}")
            except Exception as e:
                logger.warning(f"Could not install handler for signal {sig}: {e}")


def _setup_request_middleware():
    """Setup request counting middleware for graceful shutdown."""
    shutdown_manager.initialize()
    
    @app.before_request
    def track_request_start():
        if shutdown_manager.is_shutting_down:
            from flask import abort
            abort(503, "Service is shutting down")
        shutdown_manager.request_started()
    
    @app.after_request
    def track_request_end(response):
        shutdown_manager.request_finished()
        return response


def main():
    print(f"{'=' * 50}")
    print(f"Ollama Proxy Service")
    print(f"{'=' * 50}")
    
    _install_cleanup_handlers()
    _setup_request_middleware()
    
    # Start the built-in promise daemon
    start_daemon(
        cleanup_interval_hours=CLEANUP_INTERVAL_HOURS,
        enable_cleanup=ENABLE_CLEANUP,
    )
    
    # Проверяем порт Ollama
    ollama_host, ollama_port = get_ollama_host_port()
    print(f"\nПроверка портов:")
    print(f"  - Прокси порт: {PROXY_PORT}")
    print(f"  - Ollama хост: {ollama_host}:{ollama_port}")
    print(f"  - Health check interval: {HEALTH_CHECK_INTERVAL}s")
    
    # Автоматически убиваем процессы на обоих портах при старте
    kill_ports(PROXY_PORT, ollama_port)
    
    if check_port_occupied(ollama_host, ollama_port):
        print(f"  [OK] Ollama available on port {ollama_port}")
    else:
        if ollama_port == 11434:
            print(f"  [!] Ollama port same as proxy port (11434)")
            print(f"    Ollama might be conflict. Please check manually.")
        else:
            print(f"  [X] Ollama NOT available on port {ollama_port}")
            print(f"    Attempting to start Ollama automatically...")
            mgr = get_ollama_manager()
            started = mgr.start()
            if started.get('status') in {'started', 'already_running'} and check_port_occupied(ollama_host, ollama_port):
                print(f"  [OK] Ollama available! ({started.get('status')})")
            else:
                print(f"  [X] Could not start Ollama automatically")
                print(f"    Please start Ollama manually or check OLLAMA_HOST")
    
    print(f"\nЗапуск прокси на порту {PROXY_PORT}...")
    print(f"Health endpoints:")
    print(f"  - /health       - Liveness probe")
    print(f"  - /health/ollama - Ollama availability")
    print(f"  - /health/ready  - Readiness probe")
    print(f"  - /metrics       - Prometheus metrics")
    print(f"{'=' * 50}")
    
    try:
        from werkzeug.serving import WSGIRequestHandler
        from proxy.config import OLLAMA_SERVER_HEADER
        
        class OllamaRequestHandler(WSGIRequestHandler):
            server_version = OLLAMA_SERVER_HEADER
            sys_version = ""
            
            def version_string(self) -> str:
                return OLLAMA_SERVER_HEADER
        
        app.run(host='0.0.0.0', port=PROXY_PORT, debug=False, request_handler=OllamaRequestHandler)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        app.run(host='0.0.0.0', port=PROXY_PORT, debug=False)


if __name__ == '__main__':
    main()
