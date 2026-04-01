"""
Cleanup Routes Module
Contains Flask route handlers for storage cleanup management
"""
import os

# Import app from parent module
from . import app


@app.route('/cleanup/stats', methods=['GET'])
def cleanup_stats():
    """Get storage statistics."""
    from .cleanup import get_cleanup_manager

    manager = get_cleanup_manager()
    stats = manager.get_storage_stats()

    return {
        "storage_stats": stats,
        "retention_settings": {
            "promise_retention_days": int(os.environ.get('PROMISE_RETENTION_DAYS', '7')),
            "log_retention_days": int(os.environ.get('LOG_RETENTION_DAYS', '30')),
            "result_retention_days": int(os.environ.get('RESULT_RETENTION_DAYS', '7')),
        }
    }


@app.route('/cleanup/run', methods=['POST'])
def cleanup_run():
    """Run manual cleanup."""
    from .cleanup import get_cleanup_manager

    manager = get_cleanup_manager()
    results = manager.run_full_cleanup()

    return {
        "status": "completed",
        "results": results,
        "total_removed": sum(results.values())
    }
