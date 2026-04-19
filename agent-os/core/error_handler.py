"""Centralised error handling for agent-os."""
import traceback
from core.logger import get_logger

_log = get_logger("error_handler")


class AgentError(Exception):
    """Base error for agent-os."""


class WorkerError(AgentError):
    """Error raised by a worker during execution."""


class AgentMemoryError(AgentError):  # noqa: N818 — intentionally named with Error suffix
    """Error raised by the memory layer."""


def handle(exc: Exception, context: str = "") -> None:
    """Log an exception with context. Does not suppress."""
    prefix = f"[{context}] " if context else ""
    _log.error("%s%s: %s", prefix, type(exc).__name__, exc)
    _log.debug(traceback.format_exc())
