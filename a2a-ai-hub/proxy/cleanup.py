"""
Cleanup utilities for a2a-ai-hub proxy.

Handles automatic cleanup of old promises, results, and logs based on TTL settings.
"""
import logging
import os
import shutil
import time
from pathlib import Path
from typing import Dict, List, Optional

from .config import PROMISE_TTL_SECONDS, STORAGE_DIR

logger = logging.getLogger('ai-proxy.cleanup')

# Additional cleanup settings
LOG_RETENTION_DAYS = int(os.environ.get('LOG_RETENTION_DAYS', '30'))
RESULT_RETENTION_DAYS = int(os.environ.get('RESULT_RETENTION_DAYS', '7'))
PROMISE_RETENTION_DAYS = int(os.environ.get('PROMISE_RETENTION_DAYS', '7'))


class CleanupManager:
    """
    Manages cleanup of old files and directories in the proxy storage.
    """

    def __init__(self, storage_dir: str = STORAGE_DIR):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)

    def cleanup_old_promises(self, max_age_days: Optional[int] = None) -> int:
        """
        Remove promise directories older than max_age_days.

        Args:
            max_age_days: Maximum age in days. If None, uses PROMISE_RETENTION_DAYS.

        Returns:
            Number of promises removed.
        """
        if max_age_days is None:
            max_age_days = PROMISE_RETENTION_DAYS

        promises_dir = self.storage_dir / 'promises'
        if not promises_dir.exists():
            return 0

        max_age_seconds = max_age_days * 86400  # 24 * 60 * 60
        current_time = time.time()
        deleted_count = 0

        for promise_dir in promises_dir.iterdir():
            if not promise_dir.is_dir():
                continue

            try:
                # Check meta.json for creation time
                meta_file = promise_dir / 'meta.json'
                if meta_file.exists():
                    import json
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        created_at = meta.get('created_at', 0)
                else:
                    # Fallback to directory mtime
                    created_at = promise_dir.stat().st_mtime

                age_seconds = current_time - created_at
                if age_seconds > max_age_seconds:
                    shutil.rmtree(promise_dir)
                    deleted_count += 1
                    logger.debug(f"Removed old promise: {promise_dir.name}")

            except Exception as e:
                logger.warning(f"Error processing promise {promise_dir.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old promises (>{max_age_days} days)")
        return deleted_count

    def cleanup_old_logs(self, max_age_days: Optional[int] = None) -> int:
        """
        Remove old log directories.

        Args:
            max_age_days: Maximum age in days. If None, uses LOG_RETENTION_DAYS.

        Returns:
            Number of log directories removed.
        """
        if max_age_days is None:
            max_age_days = LOG_RETENTION_DAYS

        max_age_seconds = max_age_days * 86400
        current_time = time.time()
        deleted_count = 0

        def _prune_request_dirs(base: Path) -> None:
            nonlocal deleted_count
            if not base.is_dir():
                return
            for item in base.iterdir():
                if not item.is_dir() or not item.name.startswith('request_'):
                    continue
                try:
                    age_seconds = current_time - item.stat().st_mtime
                    if age_seconds > max_age_seconds:
                        shutil.rmtree(item)
                        deleted_count += 1
                        logger.debug(f"Removed old log directory: {item.name}")
                except Exception as e:
                    logger.warning(f"Error processing log directory {item.name}: {e}")

        _prune_request_dirs(self.storage_dir / 'requests')
        # Legacy: request_* lived directly under STORAGE_DIR before requests/ subfolder
        _prune_request_dirs(self.storage_dir)

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old log directories (>{max_age_days} days)")
        return deleted_count

    def cleanup_old_results(self, max_age_days: Optional[int] = None) -> int:
        """
        Remove old result files.

        Args:
            max_age_days: Maximum age in days. If None, uses RESULT_RETENTION_DAYS.

        Returns:
            Number of result files removed.
        """
        if max_age_days is None:
            max_age_days = RESULT_RETENTION_DAYS

        results_dir = self.storage_dir / 'results'
        if not results_dir.exists():
            return 0

        max_age_seconds = max_age_days * 86400
        current_time = time.time()
        deleted_count = 0

        for result_file in results_dir.iterdir():
            if not result_file.is_file():
                continue

            try:
                age_seconds = current_time - result_file.stat().st_mtime
                if age_seconds > max_age_seconds:
                    result_file.unlink()
                    deleted_count += 1
                    logger.debug(f"Removed old result file: {result_file.name}")

            except Exception as e:
                logger.warning(f"Error processing result file {result_file.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old result files (>{max_age_days} days)")
        return deleted_count

    def get_storage_stats(self) -> Dict[str, int]:
        """
        Get statistics about storage usage.

        Returns:
            Dictionary with counts and sizes.
        """
        stats = {
            'promises_count': 0,
            'logs_count': 0,
            'results_count': 0,
            'total_size_mb': 0
        }

        try:
            # Count promises
            promises_dir = self.storage_dir / 'promises'
            if promises_dir.exists():
                stats['promises_count'] = len(list(promises_dir.rglob('*')))

            # Count log directories (canonical requests/ + legacy top-level request_*)
            _req = self.storage_dir / 'requests'
            log_dirs = []
            if _req.is_dir():
                log_dirs.extend(
                    d for d in _req.iterdir() if d.is_dir() and d.name.startswith('request_')
                )
            log_dirs.extend(
                d for d in self.storage_dir.iterdir()
                if d.is_dir() and d.name.startswith('request_')
            )
            stats['logs_count'] = len(log_dirs)

            # Count results
            results_dir = self.storage_dir / 'results'
            if results_dir.exists():
                stats['results_count'] = len(list(results_dir.iterdir()))

            # Calculate total size
            total_size = 0
            for item in self.storage_dir.rglob('*'):
                if item.is_file():
                    total_size += item.stat().st_size
            stats['total_size_mb'] = round(total_size / (1024 * 1024), 2)

        except OSError as e:
            logger.warning("Error calculating storage stats: %s", e, exc_info=True)

        return stats

    def run_full_cleanup(self) -> Dict[str, int]:
        """
        Run complete cleanup of all old files.

        Returns:
            Dictionary with cleanup results.
        """
        logger.info("Starting full cleanup...")

        results = {
            'promises_removed': self.cleanup_old_promises(),
            'logs_removed': self.cleanup_old_logs(),
            'results_removed': self.cleanup_old_results(),
        }

        total_removed = sum(results.values())
        if total_removed > 0:
            logger.info(f"Full cleanup completed: {total_removed} items removed")
        else:
            logger.info("Full cleanup completed: nothing to clean")

        return results


# Global cleanup manager instance
_cleanup_manager: Optional[CleanupManager] = None


def get_cleanup_manager() -> CleanupManager:
    """Get the global cleanup manager instance."""
    global _cleanup_manager
    if _cleanup_manager is None:
        _cleanup_manager = CleanupManager()
    return _cleanup_manager


def schedule_periodic_cleanup(interval_hours: int = 24) -> None:
    """
    Schedule periodic cleanup to run automatically.

    Args:
        interval_hours: How often to run cleanup (in hours).
    """
    import threading

    def cleanup_worker():
        while True:
            try:
                manager = get_cleanup_manager()
                manager.run_full_cleanup()
            except Exception as e:
                logger.error("Periodic cleanup failed: %s", e, exc_info=True)

            # Sleep for interval
            time.sleep(interval_hours * 3600)

    thread = threading.Thread(target=cleanup_worker, daemon=True, name="CleanupWorker")
    thread.start()
    logger.info(f"Scheduled periodic cleanup every {interval_hours} hours")