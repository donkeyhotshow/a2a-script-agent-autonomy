#!/usr/bin/env python3
"""
Daemon resilience check for Local LLM upstream disconnect/reconnect flow.
"""

from __future__ import annotations

import argparse
import time
from typing import Any, Dict

import requests

DEFAULT_PROXY_URL = "http://127.0.0.1:11434"


def _get_json(url: str, timeout: float = 10.0) -> Dict[str, Any]:
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _post_json(url: str, timeout: float = 20.0) -> Dict[str, Any]:
    response = requests.post(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


def run_daemon_resilience_test(proxy_url: str = DEFAULT_PROXY_URL, wait_seconds: float = 2.5) -> bool:
    base = proxy_url.rstrip("/")

    print("[1/5] Initial daemon status")
    daemon_before = _get_json(f"{base}/daemon/status")
    if not daemon_before.get("running"):
        print("FAIL: daemon is not running before test")
        return False

    print("[2/5] Stop Local LLM upstream")
    stop_result = _post_json(f"{base}/compat_llm/stop")
    print(f"  stop result: {stop_result.get('status')}")
    time.sleep(wait_seconds)

    print("[3/5] Validate proxy alive and daemon still running")
    health_down = _get_json(f"{base}/health")
    daemon_down = _get_json(f"{base}/daemon/status")
    if not daemon_down.get("running"):
        print("FAIL: daemon stopped after provider disconnect")
        return False
    if health_down.get("status") != "running":
        print("FAIL: proxy is not running after provider disconnect")
        return False

    print("[4/5] Start Local LLM upstream")
    start_result = _get_json(f"{base}/compat_llm/start", timeout=60.0)
    print(f"  start result: {start_result.get('status')}")
    time.sleep(wait_seconds)

    print("[5/5] Validate recovered health and daemon status")
    health_up = _get_json(f"{base}/health")
    daemon_up = _get_json(f"{base}/daemon/status")
    if not daemon_up.get("running"):
        print("FAIL: daemon is not running after provider reconnect")
        return False
    if not health_up.get("local_llm_upstream_available"):
        print("FAIL: provider did not recover after reconnect")
        return False

    print("PASS: daemon resilience disconnect/reconnect verified")
    return True


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test daemon resilience on provider disconnect/reconnect.")
    parser.add_argument("--proxy-url", default=DEFAULT_PROXY_URL, help="AI proxy base URL")
    parser.add_argument("--wait-seconds", type=float, default=2.5, help="Wait after stop/start")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    ok = run_daemon_resilience_test(proxy_url=args.proxy_url, wait_seconds=args.wait_seconds)
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
