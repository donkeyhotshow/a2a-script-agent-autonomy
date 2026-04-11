#!/usr/bin/env python3
"""
Cleanup routine for old pending/promise/log artifacts.

Cleans up:
- Logs (proxy_logs/): files older than 7 days
- Pending tickets: records older than 14 days
- Completed promises: records older than 30 days

Usage:
    python cleanup-old-artifacts.py --logs-dir proxy_logs
    python cleanup-old-artifacts.py --logs-dir proxy_logs --dry-run
    python cleanup-old-artifacts.py --logs-dir proxy_logs --log-days 7 --pending-days 14 --completed-days 30
"""

import argparse
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('cleanup-old-artifacts')


class CleanupArtifacts:
    """Handles cleanup of old artifacts in a2a-ai-hub storage."""

    def __init__(
        self,
        logs_dir: str = 'proxy_logs',
        pending_days: int = 14,
        completed_days: int = 30,
        logs_days: int = 7
    ):
        self.logs_dir = Path(logs_dir)
        self.promises_dir = self.logs_dir / 'promises'
        self.pending_days = pending_days
        self.completed_days = completed_days
        self.logs_days = logs_days

        # Track deleted items for logging
        self._deleted_logs: List[str] = []
        self._deleted_pending: List[str] = []
        self._deleted_completed: List[str] = []
        self._deleted_cache: List[str] = []

    def cleanup_cache(self) -> int:
        """Remove cache files older than logs_days (7 days by default)."""
        cache_dir = self.logs_dir / 'cache'
        
        if not cache_dir.exists():
            logger.info(f"Cache directory does not exist: {cache_dir}")
            return 0

        cutoff_time = time.time() - (self.logs_days * 86400)
        deleted_count = 0

        logger.info(f"Cleaning cache files older than {self.logs_days} days")

        for subdir in cache_dir.iterdir():
            if not subdir.is_dir():
                continue
                
            for cache_file in subdir.iterdir():
                if not cache_file.is_file():
                    continue
                    
                try:
                    mtime = cache_file.stat().st_mtime
                    if mtime < cutoff_time:
                        cache_file.unlink()
                        deleted_count += 1
                        logger.debug(f"Removed old cache file: {cache_file.name}")
                except Exception as e:
                    logger.warning(f"Error processing cache file {cache_file.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old cache files (>{self.logs_days} days)")

        return deleted_count

    def cleanup_logs(self) -> int:
        """Remove log directories/files older than logs_days."""
        if not self.logs_dir.exists():
            logger.info(f"Logs directory does not exist: {self.logs_dir}")
            return 0

        requests_dir = self.logs_dir / 'requests'
        if not requests_dir.exists():
            logger.info(f"Requests directory does not exist: {requests_dir}")
            return 0

        cutoff_time = time.time() - (self.logs_days * 86400)
        deleted_count = 0

        logger.info(f"Cleaning logs older than {self.logs_days} days from {requests_dir}")

        for item in requests_dir.iterdir():
            if not item.is_dir():
                continue

            # Check if directory starts with request_ (typical log folder pattern)
            if item.name.startswith('request_'):
                try:
                    mtime = item.stat().st_mtime
                    if mtime < cutoff_time:
                        shutil.rmtree(item)
                        deleted_count += 1
                        self._deleted_logs.append(item.name)
                        logger.debug(f"Removed old log directory: {item.name}")
                except Exception as e:
                    logger.warning(f"Error processing log directory {item.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old log directories (>{self.logs_days} days)")

        return deleted_count

    def cleanup_pending_tickets(self) -> int:
        """Remove pending promises older than pending_days."""
        if not self.promises_dir.exists():
            logger.info(f"Promises directory does not exist: {self.promises_dir}")
            return 0

        cutoff_time = time.time() - (self.pending_days * 86400)
        deleted_count = 0

        logger.info(f"Cleaning pending promises older than {self.pending_days} days")

        for promise_dir in self.promises_dir.iterdir():
            if not promise_dir.is_dir():
                continue

            try:
                # Read meta.json to get status and creation time
                meta_file = promise_dir / 'meta.json'
                if meta_file.exists():
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)

                    status = meta.get('status', '')
                    created_at = meta.get('created_at', 0)

                    # Only delete pending promises
                    if status == 'pending' and created_at > 0:
                        age_seconds = time.time() - created_at
                        if age_seconds > (self.pending_days * 86400):
                            shutil.rmtree(promise_dir)
                            deleted_count += 1
                            self._deleted_pending.append(promise_dir.name)
                            logger.debug(f"Removed old pending promise: {promise_dir.name}")
                else:
                    # Fallback to directory mtime
                    mtime = promise_dir.stat().st_mtime
                    if mtime < cutoff_time:
                        # Check if it looks like a pending promise (no result file)
                        result_files = list(promise_dir.glob('*.json'))
                        if len(result_files) == 1 and result_files[0].name == 'meta.json':
                            shutil.rmtree(promise_dir)
                            deleted_count += 1
                            self._deleted_pending.append(promise_dir.name)
                            logger.debug(f"Removed old pending promise (no meta): {promise_dir.name}")

            except Exception as e:
                logger.warning(f"Error processing promise {promise_dir.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old pending promises (>{self.pending_days} days)")

        return deleted_count

    def cleanup_completed_promises(self) -> int:
        """Remove completed promises older than completed_days."""
        if not self.promises_dir.exists():
            logger.info(f"Promises directory does not exist: {self.promises_dir}")
            return 0

        cutoff_time = time.time() - (self.completed_days * 86400)
        deleted_count = 0

        logger.info(f"Cleaning completed promises older than {self.completed_days} days")

        for promise_dir in self.promises_dir.iterdir():
            if not promise_dir.is_dir():
                continue

            try:
                meta_file = promise_dir / 'meta.json'
                if meta_file.exists():
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)

                    status = meta.get('status', '')
                    created_at = meta.get('created_at', 0)

                    # Only delete completed promises
                    if status == 'done' and created_at > 0:
                        age_seconds = time.time() - created_at
                        if age_seconds > (self.completed_days * 86400):
                            shutil.rmtree(promise_dir)
                            deleted_count += 1
                            self._deleted_completed.append(promise_dir.name)
                            logger.debug(f"Removed old completed promise: {promise_dir.name}")

            except Exception as e:
                logger.warning(f"Error processing promise {promise_dir.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old completed promises (>{self.completed_days} days)")

        return deleted_count

    def run_full_cleanup(self) -> dict:
        """Run complete cleanup of all artifact types."""
        logger.info("Starting full cleanup...")

        results = {
            'cache_removed': self.cleanup_cache(),
            'logs_removed': self.cleanup_logs(),
            'pending_removed': self.cleanup_pending_tickets(),
            'completed_removed': self.cleanup_completed_promises(),
        }

        total = sum(results.values())
        logger.info(f"Full cleanup completed: {total} items removed")

        return results

    def get_deleted_items(self) -> dict:
        """Return list of deleted items for reporting."""
        return {
            'cache': self._deleted_cache,
            'logs': self._deleted_logs,
            'pending': self._deleted_pending,
            'completed': self._deleted_completed
        }


def get_storage_stats(logs_dir: Path) -> dict:
    """Get current storage statistics."""
    stats = {
        'log_dirs': 0,
        'pending_promises': 0,
        'completed_promises': 0,
        'cache_files': 0,
        'total_size_mb': 0
    }

    if not logs_dir.exists():
        return stats

    # Count log directories
    promises_dir = logs_dir / 'promises'
    requests_dir = logs_dir / 'requests'
    if requests_dir.exists():
        for item in requests_dir.iterdir():
            if item.is_dir() and item.name.startswith('request_'):
                stats['log_dirs'] += 1

    # Count cache files
    cache_dir = logs_dir / 'cache'
    if cache_dir.exists():
        for subdir in cache_dir.iterdir():
            if subdir.is_dir():
                for cache_file in subdir.iterdir():
                    if cache_file.is_file():
                        stats['cache_files'] += 1

    # Count promises
    if promises_dir.exists():
        for promise_dir in promises_dir.iterdir():
            if not promise_dir.is_dir():
                continue
            try:
                meta_file = promise_dir / 'meta.json'
                if meta_file.exists():
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                    status = meta.get('status', '')
                    if status == 'pending':
                        stats['pending_promises'] += 1
                    elif status == 'done':
                        stats['completed_promises'] += 1
            except Exception as e:
                logger.warning(
                    "get_storage_stats: skipped promise dir %s: %s",
                    promise_dir.name,
                    e,
                    exc_info=True,
                )

    # Calculate total size
    total_size = 0
    for item in logs_dir.rglob('*'):
        if item.is_file():
            total_size += item.stat().st_size
    stats['total_size_mb'] = round(total_size / (1024 * 1024), 2)

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cleanup old pending/promise/log artifacts from a2a-ai-hub storage."
    )

    # Path arguments
    parser.add_argument(
        '--logs-dir',
        default='proxy_logs',
        help="Base storage directory containing logs and promises (default: proxy_logs)"
    )

    # Time period arguments
    parser.add_argument(
        '--logs-days',
        type=int,
        default=7,
        help="Retention period for log directories in days (default: 7)"
    )
    parser.add_argument(
        '--pending-days',
        type=int,
        default=14,
        help="Retention period for pending promises in days (default: 14)"
    )
    parser.add_argument(
        '--completed-days',
        type=int,
        default=30,
        help="Retention period for completed promises in days (default: 30)"
    )

    # Options
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help="Enable verbose output"
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    logs_dir = Path(args.logs_dir)
    logger.info(f"Cleanup artifacts from: {logs_dir.absolute()}")
    logger.info(f"Retention periods - Logs: {args.logs_days}d, Pending: {args.pending_days}d, Completed: {args.completed_days}d")

    # Get before stats
    before_stats = get_storage_stats(logs_dir)
    logger.info(f"Current storage: {before_stats['log_dirs']} log dirs, {before_stats['pending_promises']} pending, {before_stats['completed_promises']} completed, {before_stats['cache_files']} cache files, {before_stats['total_size_mb']} MB")

    if args.dry_run:
        # Simulate cleanup without actually deleting
        cleanup = CleanupArtifacts(
            logs_dir=str(logs_dir),
            pending_days=args.pending_days,
            completed_days=args.completed_days,
            logs_days=args.logs_days
        )

        # Calculate what would be deleted (without actually deleting)
        logger.info("[DRY RUN] Would delete:")
        logger.info(f"  - Logs older than {args.logs_days} days")
        logger.info(f"  - Pending promises older than {args.pending_days} days")
        logger.info(f"  - Completed promises older than {args.completed_days} days")

        # Preview what would be deleted
        cutoff_logs = time.time() - (args.logs_days * 86400)
        cutoff_pending = time.time() - (args.pending_days * 86400)
        cutoff_completed = time.time() - (args.completed_days * 86400)

        preview_logs = []
        preview_pending = []
        preview_completed = []
        preview_cache = []

        # Check cache
        cache_dir = logs_dir / 'cache'
        cutoff_logs = time.time() - (args.logs_days * 86400)
        if cache_dir.exists():
            for subdir in cache_dir.iterdir():
                if not subdir.is_dir():
                    continue
                for cache_file in subdir.iterdir():
                    if not cache_file.is_file():
                        continue
                    try:
                        if cache_file.stat().st_mtime < cutoff_logs:
                            preview_cache.append(cache_file.name)
                    except Exception as e:
                        logger.warning(
                            "dry-run cache preview: stat failed %s: %s",
                            cache_file,
                            e,
                            exc_info=True,
                        )

        # Check logs
        requests_dir = logs_dir / 'requests'
        if requests_dir.exists():
            for item in requests_dir.iterdir():
                if item.is_dir() and item.name.startswith('request_'):
                    if item.stat().st_mtime < cutoff_logs:
                        preview_logs.append(item.name)

        # Check promises
        promises_dir = logs_dir / 'promises'
        if promises_dir.exists():
            for promise_dir in promises_dir.iterdir():
                if not promise_dir.is_dir():
                    continue
                try:
                    meta_file = promise_dir / 'meta.json'
                    if meta_file.exists():
                        with open(meta_file, 'r', encoding='utf-8') as f:
                            meta = json.load(f)
                        status = meta.get('status', '')
                        created_at = meta.get('created_at', 0)
                        if status == 'pending' and created_at > 0 and created_at < cutoff_pending:
                            preview_pending.append(promise_dir.name)
                        elif status == 'done' and created_at > 0 and created_at < cutoff_completed:
                            preview_completed.append(promise_dir.name)
                except Exception as e:
                    logger.warning(
                        "dry-run: skipped promise dir %s: %s",
                        promise_dir.name,
                        e,
                        exc_info=True,
                    )

        print(json.dumps({
            'mode': 'dry-run',
            'logs_dir': str(logs_dir),
            'retention_days': {
                'logs': args.logs_days,
                'pending': args.pending_days,
                'completed': args.completed_days
            },
            'would_delete': {
                'cache': preview_cache,
                'logs': preview_logs,
                'pending': preview_pending,
                'completed': preview_completed
            },
            'counts': {
                'cache': len(preview_cache),
                'logs': len(preview_logs),
                'pending': len(preview_pending),
                'completed': len(preview_completed)
            },
            'before': before_stats
        }, indent=2))

        return 0

    # Run actual cleanup
    cleanup = CleanupArtifacts(
        logs_dir=str(logs_dir),
        pending_days=args.pending_days,
        completed_days=args.completed_days,
        logs_days=args.logs_days
    )

    results = cleanup.run_full_cleanup()
    deleted_items = cleanup.get_deleted_items()

    # Get after stats
    after_stats = get_storage_stats(logs_dir)

    output = {
        'mode': 'cleanup',
        'logs_dir': str(logs_dir),
        'retention_days': {
            'cache': args.logs_days,
            'logs': args.logs_days,
            'pending': args.pending_days,
            'completed': args.completed_days
        },
        'removed': results,
        'deleted_items': deleted_items,
        'before': before_stats,
        'after': after_stats,
        'timestamp': datetime.now().isoformat()
    }

    print(json.dumps(output, indent=2))

    return 0


if __name__ == '__main__':
    raise SystemExit(main())