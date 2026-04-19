"""Execution sandbox — isolates worker calls with timeout and error capture."""
import asyncio
from typing import Any, Awaitable, Callable, Optional, TypeVar

from core.logger import get_logger
from core.error_handler import WorkerError, handle

_log = get_logger("platform.sandbox")

T = TypeVar("T")


async def run_with_timeout(
    coro: Awaitable[T],
    timeout: float = 60.0,
    context: str = "sandbox",
) -> T:
    """Run *coro* with a wall-clock timeout. Raises WorkerError on timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        msg = f"Worker timed out after {timeout}s in [{context}]"
        _log.error(msg)
        raise WorkerError(msg)
    except Exception as exc:
        handle(exc, context)
        raise WorkerError(str(exc)) from exc
