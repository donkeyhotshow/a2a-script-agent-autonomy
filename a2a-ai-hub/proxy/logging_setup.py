"""
File logging under ai-integration/logs/ (works with uvicorn and python -m proxy).

Console output is unchanged; this adds a rotating file so start-all.bat still leaves traces.
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Optional

_log = logging.getLogger(__name__)


def _package_parent_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        _log.warning("Invalid integer env %s=%r; using %s", key, raw, default)
        return default


def ensure_file_log_handler() -> Optional[str]:
    """
    Append a RotatingFileHandler to the root logger if not already present.
    Returns the log file path, or None if file logging is disabled.
    """
    if os.environ.get("AI_INTEGRATION_LOG_DISABLE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        return None

    log_dir = os.environ.get("AI_INTEGRATION_LOG_DIR", "").strip()
    if not log_dir:
        log_dir = os.path.join(_package_parent_dir(), "logs")
    os.makedirs(log_dir, exist_ok=True)

    log_name = os.environ.get("AI_INTEGRATION_LOG_FILE", "ai-integration.log").strip() or "ai-integration.log"
    log_path = os.path.join(log_dir, log_name)

    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, None)
    if level is None:
        _log.warning("Invalid LOG_LEVEL=%r; using INFO", level_name)
        level = logging.INFO
    fmt = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    root = logging.getLogger()
    marker = "_a2a_ai_integration_file_log"
    for h in root.handlers:
        if getattr(h, marker, False):
            return log_path

    fh = RotatingFileHandler(
        log_path,
        maxBytes=_env_int("AI_INTEGRATION_LOG_MAX_BYTES", 10_485_760),
        backupCount=_env_int("AI_INTEGRATION_LOG_BACKUPS", 3),
        encoding="utf-8",
    )
    setattr(fh, marker, True)
    fh.setLevel(level)
    fh.setFormatter(fmt)
    root.addHandler(fh)
    if root.level == logging.NOTSET or root.level > level:
        root.setLevel(level)
    return log_path
