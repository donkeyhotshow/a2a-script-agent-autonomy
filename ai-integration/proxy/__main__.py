"""
Main entry point for the Local LLM upstream Proxy
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
from proxy.local_llm_manager import get_local_llm_upstream_host_port, check_port_occupied, get_local_llm_manager
from proxy.utils import kill_ports
from proxy.daemon import start_daemon, stop_daemon
from proxy.config import CLEANUP_INTERVAL_HOURS, ENABLE_CLEANUP
from proxy.logging_setup import ensure_file_log_handler

# Configure logging (console + file under ai-integration/logs/)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
ensure_file_log_handler()
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
        except ImportError as e:
            logger.warning("threading unavailable — shutdown lock disabled: %s", e)
    
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
        
        # Остановить Local LLM upstream если она была запущена прокси
        mgr = get_local_llm_manager()
        if mgr.process is not None and mgr.started_by_proxy:
            logger.info("Stopping Local LLM upstream (started by proxy)...")
            try:
                result = mgr.stop()
                logger.info(f"Local LLM upstream stopped: {result}")
            except Exception as e:
                logger.error("Error stopping Local LLM upstream: %s", e, exc_info=True)
        
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
    # Fix for Windows asyncio event loop issues  
    if sys.platform == 'win32':
        import asyncio
        # Use ProactorEventLoopPolicy for better Windows compatibility with aiohttp
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    print(f"{'=' * 50}")
    print(f"Local LLM upstream Proxy Service")
    print(f"{'=' * 50}")
    
    _install_cleanup_handlers()
    _setup_request_middleware()
    
    # Start the built-in promise daemon
    start_daemon(
        cleanup_interval_hours=CLEANUP_INTERVAL_HOURS,
        enable_cleanup=ENABLE_CLEANUP,
    )
    
    # Проверяем порт Local LLM upstream
    local_llm_upstream_host, local_llm_upstream_port = get_local_llm_upstream_host_port()
    print(f"\nПроверка портов:")
    print(f"  - Прокси порт: {PROXY_PORT}")
    print(f"  - Local LLM upstream хост: {local_llm_upstream_host}:{local_llm_upstream_port}")
    print(f"  - Health check interval: {HEALTH_CHECK_INTERVAL}s")
    
    # Автоматически убиваем процессы на обоих портах при старте
    kill_ports(PROXY_PORT, local_llm_upstream_port)
    
    if check_port_occupied(local_llm_upstream_host, local_llm_upstream_port):
        print(f"  [OK] Local LLM upstream available on port {local_llm_upstream_port}")
    else:
        if local_llm_upstream_port == 11434:
            print(f"  [!] Local LLM upstream port same as proxy port (11434)")
            print(f"    Local LLM upstream might be conflict. Please check manually.")
        else:
            print(f"  [X] Local LLM upstream NOT available on port {local_llm_upstream_port}")
            print(f"    Attempting to start Local LLM upstream automatically...")
            mgr = get_local_llm_manager()
            started = mgr.start()
            if started.get('status') in {'started', 'already_running'} and check_port_occupied(local_llm_upstream_host, local_llm_upstream_port):
                print(f"  [OK] Local LLM upstream available! ({started.get('status')})")
            else:
                print(f"  [X] Could not start Local LLM upstream automatically")
                print(f"    Please start Local LLM upstream manually or check LOCAL_LLM_UPSTREAM_URL")
    
    print(f"\nЗапуск прокси на порту {PROXY_PORT}...")
    print(f"Health endpoints:")
    print(f"  - /health       - Liveness probe")
    print(f"  - /health/local-llm-upstream - local HTTP LLM availability")
    print(f"  - /health/ready  - Readiness probe")
    print(f"  - /metrics       - Prometheus metrics")
    print(f"{'=' * 50}")
    
    try:
        from werkzeug.serving import WSGIRequestHandler
        from proxy.config import LOCAL_LLM_SERVER_HEADER
        
        class Local LLM upstreamRequestHandler(WSGIRequestHandler):
            server_version = LOCAL_LLM_SERVER_HEADER
            sys_version = ""
            
            def version_string(self) -> str:
                return LOCAL_LLM_SERVER_HEADER
        
        app.run(host='0.0.0.0', port=PROXY_PORT, debug=False, request_handler=Local LLM upstreamRequestHandler)
    except Exception as e:
        logger.error("Failed to start server with custom request handler: %s", e, exc_info=True)
        app.run(host='0.0.0.0', port=PROXY_PORT, debug=False)


if __name__ == '__main__':
    main()
