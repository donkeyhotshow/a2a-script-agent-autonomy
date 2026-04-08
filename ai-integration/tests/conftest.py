"""Shared pytest hooks for ai-integration."""

import pytest


@pytest.fixture(autouse=True)
def _stop_promise_daemon_between_tests():
    """Avoid background daemon mutating temp PROMISES_DIR in tests."""
    try:
        from proxy.daemon import stop_daemon

        stop_daemon()
    except Exception:
        pass
    yield
    try:
        from proxy.daemon import stop_daemon

        stop_daemon()
    except Exception:
        pass
