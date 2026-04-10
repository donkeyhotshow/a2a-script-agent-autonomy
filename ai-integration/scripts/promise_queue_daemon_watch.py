#!/usr/bin/env python3
"""Dev watcher for promise_queue_daemon.py.

Restarts the daemon when watched Python files change and auto-recovers on crash.
"""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLL_SECONDS = 1.0
DAEMON_ENTRY = REPO_ROOT / "scripts" / "promise_queue_daemon.py"
WATCH_DIRS = [
    REPO_ROOT / "scripts",
    REPO_ROOT / "proxy",
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Watch and restart promise queue daemon in dev mode.")
    p.add_argument("--poll-seconds", type=float, default=DEFAULT_POLL_SECONDS)
    p.add_argument(
        "--proxy-url",
        default=os.environ.get("PROMISE_PROXY_URL") or os.environ.get("PROXY_URL") or "http://localhost:11434",
    )
    p.add_argument("--interval", type=float, default=4.0)
    p.add_argument("--timeout", type=float, default=15.0)
    p.add_argument("--response-attempts", type=int, default=5)
    p.add_argument("--response-delay", type=float, default=0.6)
    p.add_argument("--log-level", default="INFO")
    return p.parse_args()


def iter_py_files() -> Iterable[Path]:
    for root in WATCH_DIRS:
        if not root.exists():
            continue
        for path in root.rglob("*.py"):
            yield path


def snapshot_mtimes() -> dict[str, float]:
    out: dict[str, float] = {}
    for path in iter_py_files():
        try:
            out[str(path)] = path.stat().st_mtime
        except OSError:
            continue
    return out


def build_cmd(args: argparse.Namespace) -> list[str]:
    return [
        sys.executable,
        str(DAEMON_ENTRY),
        "--proxy-url",
        args.proxy_url,
        "--interval",
        str(args.interval),
        "--timeout",
        str(args.timeout),
        "--response-attempts",
        str(args.response_attempts),
        "--response-delay",
        str(args.response_delay),
        "--log-level",
        args.log_level,
    ]


def stop_process(proc: subprocess.Popen[bytes] | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)


def main() -> None:
    args = parse_args()
    cmd = build_cmd(args)
    print(f"[promise-daemon-watch] starting with poll={args.poll_seconds}s")

    current = subprocess.Popen(cmd, cwd=str(REPO_ROOT))
    last = snapshot_mtimes()

    try:
        while True:
            time.sleep(max(0.25, args.poll_seconds))
            now = snapshot_mtimes()

            changed = False
            if now.keys() != last.keys():
                changed = True
            else:
                for key, value in now.items():
                    if last.get(key) != value:
                        changed = True
                        break

            if changed:
                print("[promise-daemon-watch] file change detected -> restarting daemon")
                stop_process(current)
                current = subprocess.Popen(cmd, cwd=str(REPO_ROOT))
                last = now
                continue

            if current.poll() is not None:
                code = current.returncode
                print(f"[promise-daemon-watch] daemon exited ({code}) -> restarting")
                current = subprocess.Popen(cmd, cwd=str(REPO_ROOT))
                last = now
    except KeyboardInterrupt:
        print("[promise-daemon-watch] stopping")
    finally:
        stop_process(current)


if __name__ == "__main__":
    main()
