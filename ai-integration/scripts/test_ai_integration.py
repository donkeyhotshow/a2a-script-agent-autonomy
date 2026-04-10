#!/usr/bin/env python3
"""
High-level smoke tests for the ai-integration layer.

Validates proxy health endpoints, the Local LLM upstream backend, and the promise daemon workflow.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Iterable, Tuple

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.tests.daemon_resilience import run_daemon_resilience_test
from scripts.tests.promise_chain import DEFAULT_PROXY_URL, run_promise_chain_test

DEFAULT_LOCAL_LLM_UPSTREAM_URL = "http://127.0.0.1:11434"


def _build_checks(proxy_url: str, local_llm_upstream_url: str) -> Iterable[Tuple[str, str]]:
    proxy_base = proxy_url.rstrip('/')
    upstream_tags_base = local_llm_upstream_url.rstrip('/')
    return (
        (f"{proxy_base}/health", "proxy liveness"),
        (f"{proxy_base}/health/ready", "proxy readiness check"),
        (f"{proxy_base}/health/local-llm-upstream", "proxy → local upstream availability"),
        (f"{upstream_tags_base}/api/tags", "direct Local LLM upstream tags"),
    )


def _check_endpoint(url: str, label: str, timeout: float) -> bool:
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
        logging.info("%s OK (status=%s)", label, payload.get("status", "n/a"))
        return True
    except requests.RequestException as exc:
        logging.error("%s failed (%s): %s", label, url, exc)
        return False


def run_health_verification(proxy_url: str, local_llm_upstream_url: str, timeout: float) -> bool:
    logging.info("Running ai-integration health checks...")
    passed = True
    for url, label in _build_checks(proxy_url, local_llm_upstream_url):
        passed &= _check_endpoint(url, label, timeout)
    return passed


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Smoke-test the ai-integration proxy, daemon, and Local LLM upstream connectivity."
    )
    parser.add_argument("--proxy-url", default=DEFAULT_PROXY_URL, help="AI proxy base URL.")
    parser.add_argument(
        "--local-llm-upstream-url",
        default=DEFAULT_LOCAL_LLM_UPSTREAM_URL,
        help="Direct local HTTP LLM base URL.",
    )
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout in seconds.")
    parser.add_argument(
        "--skip-promise",
        action="store_true",
        help="Skip the promise chain test (useful when Local LLM upstream is down).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging (DEBUG level).",
    )
    parser.add_argument(
        "--with-resilience",
        action="store_true",
        help="Run daemon disconnect/reconnect resilience test.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    success = run_health_verification(args.proxy_url, args.local_llm_upstream_url, args.timeout)

    if not args.skip_promise:
        logging.info("Running promise daemon chain test...")
        promise_check = run_promise_chain_test(proxy_url=args.proxy_url)
        success &= promise_check
    if args.with_resilience:
        logging.info("Running daemon resilience test...")
        resilience_check = run_daemon_resilience_test(proxy_url=args.proxy_url)
        success &= resilience_check

    if success:
        logging.info("ai-integration smoke tests passed.")
        return

    logging.error("ai-integration smoke tests failed.")
    sys.exit(1)


if __name__ == "__main__":
    main()
