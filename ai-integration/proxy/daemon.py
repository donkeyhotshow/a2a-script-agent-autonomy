"""
Built-in Promise Queue Daemon
Polls pending promises and executes them automatically.
"""
import base64
import logging
import os
import sys
import threading
import time
from typing import Any, Dict, List, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import (
    PROXY_PORT,
    DAEMON_POLL_INTERVAL,
    DAEMON_EXECUTE_TIMEOUT,
    DAEMON_MAX_WORKERS,
    DAEMON_AUTO_EXECUTE,
    DAEMON_SKIP_SIMULATE,
    FORWARD_TIMEOUT,
)
from .cleanup import get_cleanup_manager
from .caching import get_cache
from .promises import (
    get_promise,
    _collect_pending_promises,
    _load_request_snapshot,
    _prepare_execute_body,
    _sanitize_execute_headers,
    _promise_set_done,
    _promise_reset_pending,
)

logger = logging.getLogger('ai-proxy.daemon')

# Default proxy URL (assumes daemon runs alongside proxy)
DEFAULT_PROXY_URL = f"http://localhost:{PROXY_PORT}"


class PromiseDaemon:
    """
    Built-in daemon that polls pending promises and executes them.
    """
    
    def __init__(
        self,
        proxy_url: str = DEFAULT_PROXY_URL,
        poll_interval: float = DAEMON_POLL_INTERVAL,
        execute_timeout: int = DAEMON_EXECUTE_TIMEOUT,
        max_workers: int = DAEMON_MAX_WORKERS,
        auto_execute: bool = DAEMON_AUTO_EXECUTE,
        cleanup_interval_hours: int = 24,  # Cleanup every 24 hours
        enable_cleanup: bool = True,
    ):
        self.proxy_url = proxy_url.rstrip('/')
        self.poll_interval = poll_interval
        self.execute_timeout = execute_timeout
        self.max_workers = max_workers
        self.auto_execute = auto_execute
        self.cleanup_interval_hours = cleanup_interval_hours
        self.enable_cleanup = enable_cleanup

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._executor = None
        self._consecutive_empty = 0
        self._last_cleanup = 0
        self._cleanup_manager = get_cleanup_manager() if enable_cleanup else None

        # Build requests session with retry strategy
        self._session = self._build_session()
    
    def _build_session(self) -> requests.Session:
        """Build HTTP session with retry strategy."""
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            status=3,
            connect=3,
            read=3,
            backoff_factor=0.3,
            status_forcelist=[429, 502, 503, 504],
            allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE"]),
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({"User-Agent": "ai-integration-builtin-daemon/1.0"})
        return session
    
    def start(self) -> None:
        """Start the daemon in a background thread."""
        if self._running:
            logger.warning("Daemon already running")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="PromiseDaemon")
        self._thread.start()
        logger.info(f"Promise daemon started (poll_interval={self.poll_interval}s, auto_execute={self.auto_execute})")
    
    def stop(self, timeout: float = 10.0) -> None:
        """Stop the daemon gracefully."""
        if not self._running:
            return
        
        logger.info("Stopping promise daemon...")
        self._running = False
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        
        if self._executor:
            self._executor.shutdown(wait=True)
        
        self._session.close()
        logger.info("Promise daemon stopped")
    
    def _run_loop(self) -> None:
        """Main daemon loop."""
        while self._running:
            try:
                self._process_cycle()

                # Periodic cleanup
                if self.enable_cleanup and self._should_run_cleanup():
                    self._run_cleanup()

            except Exception as e:
                logger.error(f"Daemon cycle error: {e}", exc_info=True)

            # Sleep between cycles
            time.sleep(max(0.1, self.poll_interval))
    
    def _process_cycle(self) -> None:
        """Process one polling cycle."""
        try:
            pending = self._fetch_pending()
        except Exception as e:
            logger.warning(f"Failed to fetch pending promises: {e}")
            pending = []
        
        if pending:
            self._consecutive_empty = 0
            for entry in pending:
                if not self._running:
                    break
                self._handle_promise(entry)
        else:
            self._consecutive_empty += 1
            if self._consecutive_empty % 10 == 0:
                logger.debug(f"No pending tickets (cycle {self._consecutive_empty})")

    def _should_run_cleanup(self) -> bool:
        """Check if it's time to run cleanup."""
        if not self.enable_cleanup or self._cleanup_manager is None:
            return False

        current_time = time.time()
        cleanup_interval_seconds = self.cleanup_interval_hours * 3600

        return (current_time - self._last_cleanup) >= cleanup_interval_seconds

    def _run_cleanup(self) -> None:
        """Run periodic cleanup."""
        try:
            logger.info("Running periodic cleanup...")
            results = self._cleanup_manager.run_full_cleanup()
            self._last_cleanup = time.time()

            # Log summary
            total_removed = sum(results.values())
            if total_removed > 0:
                logger.info(f"Cleanup completed: {total_removed} items removed")
            else:
                logger.debug("Cleanup completed: nothing to clean")

        except Exception as e:
            logger.error(f"Cleanup failed: {e}", exc_info=True)
    
    def _fetch_pending(self) -> List[Dict[str, Any]]:
        """Get pending promises via direct call (same process), no HTTP."""
        pending = _collect_pending_promises()
        result = []
        for rec in pending:
            try:
                import datetime
                created_iso = datetime.datetime.fromtimestamp(rec.created_at, datetime.timezone.utc).isoformat()
            except Exception:
                created_iso = None
            result.append({
                "promiseId": rec.promise_id,
                "status": rec.status,
                "created_at": created_iso,
                "created_at_unix": rec.created_at,
                "method": rec.method,
                "path": rec.path,
                "target_url": rec.target_url,
                "log_folder": rec.log_folder,
            })
        return result
    
    def _handle_promise(self, entry: Dict[str, Any]) -> None:
        """Handle a single pending promise."""
        promise_id = entry.get("promiseId")
        if not promise_id:
            return
        
        logger.info(f"Processing promise: {promise_id} - {entry.get('method', '?')} {entry.get('path', '?')}")
        
        if not self.auto_execute:
            logger.debug(f"Auto-execute disabled, skipping {promise_id}")
            return
        
        try:
            self._execute_promise(promise_id)
        except Exception as e:
            logger.error(f"Failed to execute promise {promise_id}: {e}")
    
    def _execute_promise(self, promise_id: str) -> None:
        """Execute a promise by calling /promise/<id>/execute."""
        # First verify the promise is still pending
        rec = get_promise(promise_id)
        if rec is None:
            logger.warning(f"Promise {promise_id} not found")
            return
        if rec.status != 'pending':
            logger.debug(f"Promise {promise_id} already processed (status={rec.status})")
            return
        
        # Check if promise has simulate config - if so, skip daemon execution (inline job handles it)
        # This can be disabled with DAEMON_SKIP_SIMULATE=false
        if rec.simulate is not None and DAEMON_SKIP_SIMULATE:
            logger.info(f"Promise {promise_id} has simulate config, skipping daemon execution")
            return
        
        # Load request snapshot
        request_snapshot = _load_request_snapshot(rec.log_folder)
        if not request_snapshot:
            logger.warning(f"Request snapshot missing for {promise_id}, will retry")
            _promise_reset_pending(promise_id)
            return
        
        # Prepare request
        args = dict(request_snapshot.get('args') or {})
        args.pop('promise', None)
        headers = _sanitize_execute_headers(request_snapshot.get('headers') or {})
        body_payload = _prepare_execute_body(request_snapshot.get('body'))
        
        # Build cache key
        cache = get_cache()
        cache_payload = {
            "url": rec.target_url,
            "method": rec.method,
            "args": args,
            "body": request_snapshot.get('body'),
        }
        cache_key = cache.build_key("ollama", cache_payload)
        
        # Check cache first
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            logger.info(f"Daemon {promise_id} served from cache")
            _promise_set_done(
                promise_id,
                status_code=cached_response.get('status_code', 200),
                headers=cached_response.get('headers', {}),
                body=base64.b64decode(cached_response.get('body_base64', '')) if cached_response.get('body_base64') else b''
            )
            return
        
        # Execute request (use FORWARD_TIMEOUT for Ollama, not execute_timeout)
        req_timeout = FORWARD_TIMEOUT
        try:
            if rec.method == 'GET':
                resp = requests.get(
                    rec.target_url, params=args, headers=headers,
                    timeout=req_timeout
                )
            elif rec.method == 'POST':
                resp = requests.post(
                    rec.target_url, params=args, headers=headers, data=body_payload,
                    timeout=req_timeout
                )
            elif rec.method == 'PUT':
                resp = requests.put(
                    rec.target_url, params=args, headers=headers, data=body_payload,
                    timeout=req_timeout
                )
            elif rec.method == 'DELETE':
                resp = requests.delete(
                    rec.target_url, params=args, headers=headers,
                    timeout=req_timeout
                )
            else:
                resp = requests.request(
                    rec.method, rec.target_url, params=args, headers=headers, data=body_payload,
                    timeout=req_timeout
                )
            
            # Cache successful responses
            if resp.status_code == 200:
                cache.set(cache_key, {
                    "status_code": resp.status_code,
                    "headers": dict(resp.headers),
                    "body_base64": base64.b64encode(resp.content).decode('utf-8') if resp.content else '',
                })
                logger.info(f"Daemon {promise_id} response cached")
            
            _promise_set_done(
                promise_id,
                status_code=resp.status_code,
                headers=dict(resp.headers),
                body=resp.content
            )
            logger.info(f"Promise {promise_id} executed → result {resp.status_code}")
            
        except requests.RequestException as e:
            _promise_reset_pending(promise_id)
            logger.error(f"Request failed for {promise_id}: {e}, will retry")


# Global daemon instance
_daemon_instance: Optional[PromiseDaemon] = None


def get_daemon() -> Optional[PromiseDaemon]:
    """Get the global daemon instance."""
    return _daemon_instance


def start_daemon(
    proxy_url: str = DEFAULT_PROXY_URL,
    poll_interval: float = DAEMON_POLL_INTERVAL,
    execute_timeout: int = DAEMON_EXECUTE_TIMEOUT,
    max_workers: int = DAEMON_MAX_WORKERS,
    auto_execute: bool = DAEMON_AUTO_EXECUTE,
    cleanup_interval_hours: int = 24,
    enable_cleanup: bool = True,
) -> Optional[PromiseDaemon]:
    """
    Start the built-in promise daemon.
    
    Returns the daemon instance.
    """
    global _daemon_instance
    
    if _daemon_instance is not None and _daemon_instance._running:
        logger.warning("Daemon already running")
        return _daemon_instance
    
    _daemon_instance = PromiseDaemon(
        proxy_url=proxy_url,
        poll_interval=poll_interval,
        execute_timeout=execute_timeout,
        max_workers=max_workers,
        auto_execute=auto_execute,
        cleanup_interval_hours=cleanup_interval_hours,
        enable_cleanup=enable_cleanup,
    )
    _daemon_instance.start()
    return _daemon_instance


def stop_daemon(timeout: float = 10.0) -> None:
    """Stop the built-in promise daemon."""
    global _daemon_instance
    
    if _daemon_instance is not None:
        _daemon_instance.stop(timeout=timeout)
        _daemon_instance = None
