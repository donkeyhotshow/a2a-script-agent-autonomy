#!/usr/bin/env python3
"""
Composed AI integration chain test.

Runs health checks → metrics → simulation probes → promise daemon before
validating that logs were persisted, giving one command that represents “the big
chain”.
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

from scripts.tests.promise_chain import DEFAULT_PROXY_URL, run_promise_chain_test  # noqa: E402

DEFAULT_METRICS_KEYWORDS = [
    "ai_proxy_requests_total",
    "ai_proxy_request_duration_seconds",
    "ai_proxy_errors_total",
    "ai_proxy_uptime_seconds",
]


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the full ai-integration smoke chain (health → metrics → simul → promise)."
    )
    parser.add_argument("--proxy-url", default=DEFAULT_PROXY_URL, help="Base URL for the proxy.")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout for checks.")
    parser.add_argument("--skip-simulation", action="store_true", help="Skip simulation endpoints.")
    parser.add_argument("--skip-promise", action="store_true", help="Skip the promise chain check.")
    parser.add_argument("--check-logs", action="store_true", help="Ensure proxy_logs contain request folders.")
    parser.add_argument("--verbose", action="store_true", help="Show DEBUG logging.")
    return parser.parse_args()


def _build_health_checks(proxy_url: str) -> Iterable[Tuple[str, str]]:
    base = proxy_url.rstrip("/")
    return (
        (f"{base}/health", "Proxy health"),
        (f"{base}/health/ready", "Proxy readiness"),
        (f"{base}/health/ollama", "Proxy → Ollama availability"),
    )


def check_health(proxy_url: str, timeout: float) -> bool:
    logging.info("Step 1: Running health probes...")
    healthy = True
    for url, label in _build_health_checks(proxy_url):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            payload = resp.json()
            logging.info("%s OK (status=%s)", label, payload.get("status", "n/a"))
        except requests.RequestException as exc:
            logging.error("%s failed (%s): %s", label, url, exc)
            healthy = False
    return healthy


def check_metrics(proxy_url: str, timeout: float) -> bool:
    url = f"{proxy_url.rstrip('/')}/metrics"
    logging.info("Step 2: Checking metrics endpoint (%s)...", url)
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        text = resp.text
        missing = [k for k in DEFAULT_METRICS_KEYWORDS if k not in text]
        if missing:
            logging.warning("Metrics endpoint missing expected counters: %s", missing)
            return False
        logging.info("Metrics endpoint returned expected keywords.")
        return True
    except requests.RequestException as exc:
        logging.error("Metrics check failed: %s", exc)
        return False


def check_simulation(proxy_url: str, timeout: float) -> bool:
    urls = [
        (f"{proxy_url.rstrip('/')}/simulation/status", "simulation status"),
        (f"{proxy_url.rstrip('/')}/simulation/test", "simulation test"),
        (f"{proxy_url.rstrip('/')}/simulation/force-real", "simulation force-real"),
    ]
    success = True
    for url, label in urls:
        try:
            if label == "simulation status":
                resp = requests.get(url, timeout=timeout)
            else:
                resp = requests.post(url, json={"force_simulation": True}, timeout=timeout)
            if resp.status_code == 404:
                logging.debug("%s not supported (404).", label)
                continue
            resp.raise_for_status()
            logging.info("%s OK (code=%s)", label, resp.status_code)
        except requests.RequestException as exc:
            logging.warning("%s probe skipped/failed: %s", label, exc)
            success = False
    return success


def check_log_storage(project_root: Path) -> bool:
    path = project_root / "proxy_logs"
    if not path.exists():
        logging.warning("proxy_logs directory (%s) does not exist.", path)
        return False
    entries = list(path.glob("request_*"))
    if not entries:
        logging.warning("No request_* directories found under proxy_logs.")
        return False
    logging.info("Found %d request_* directories under proxy_logs.", len(entries))
    return True


def main() -> None:
    args = _parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Running AI integration chain smoke test (proxy=%s)", args.proxy_url)
    success = True

    success &= check_health(args.proxy_url, args.timeout)
    success &= check_metrics(args.proxy_url, args.timeout)

    if not args.skip_simulation:
        logging.info("Step 3: Checking simulation endpoints...")
        success &= check_simulation(args.proxy_url, args.timeout)
    else:
        logging.info("Skipping simulation endpoints (flag).")

    if args.check_logs:
        success &= check_log_storage(Path(__file__).resolve().parent.parent)

    if not args.skip_promise:
        logging.info("Step 4: Running promise chain...")
        success &= run_promise_chain_test(proxy_url=args.proxy_url)
    else:
        logging.info("Skipping promise chain (flag).")

    if success:
        logging.info("AI integration chain smoke test passed.")
        return

    logging.error("AI integration chain smoke test failed.")
    sys.exit(1)


if __name__ == "__main__":
    main()
