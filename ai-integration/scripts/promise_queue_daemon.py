#!/usr/bin/env python3
"""Daemon that polls the ai-integration proxy promise queue and delivers Qwen output."""
import argparse
import json
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


DEFAULT_PROXY_URL = os.environ.get("PROMISE_PROXY_URL") or os.environ.get("PROXY_URL") or "http://localhost:11435"
DEFAULT_POLL_INTERVAL = 4.0
DEFAULT_TIMEOUT = 15.0
DEFAULT_RESPONSE_ATTEMPTS = 5
DEFAULT_RESPONSE_RETRY_DELAY = 0.6
USER_AGENT = "ai-integration-promise-daemon/1.0"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Poll proxy tickets (promise queue) and optionally execute them against Ollama."
    )
    parser.add_argument(
        "--proxy-url",
        default=DEFAULT_PROXY_URL,
        help="Base URL for the ai-integration proxy (default taken from PROMISE_PROXY_URL/PROXY_URL).",
    )
    parser.add_argument("--interval", type=float, default=DEFAULT_POLL_INTERVAL, help="Seconds between polls when no tickets are pending.")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="HTTP timeout for proxy calls.")
    parser.add_argument("--response-attempts", type=int, default=DEFAULT_RESPONSE_ATTEMPTS, help="How many times to retry fetching the promise response.")
    parser.add_argument("--response-delay", type=float, default=DEFAULT_RESPONSE_RETRY_DELAY, help="Delay between response fetch attempts.")
    parser.add_argument("--no-auto-approve", action="store_true", help="Do not automatically call /promise/<id>/execute; only report pending tickets.")
    parser.add_argument("--dry-run", action="store_true", help="Even when auto-approve is enabled, skip the execute call and just log ticket details.")
    parser.add_argument("--max-empty-cycles", type=int, default=0, help="Stop after this many consecutive empty polls (0 runs forever).")
    parser.add_argument("--log-level", default="INFO", help="Logging level (DEBUG, INFO, WARNING, ERROR).")
    return parser.parse_args()


def build_session() -> requests.Session:
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        status=3,
        connect=3,
        read=3,
        backoff_factor=0.3,
        status_forcelist=[429, 502, 503, 504],
        allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE"]),
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def shorten_text(value: Any, limit: int = 800) -> str:
    if value is None:
        return ""
    text = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
    text = text.strip()
    if len(text) > limit:
        return text[:limit] + "…"
    return text


def preview_bytes(data: bytes, limit: int = 1600, max_lines: int = 12) -> str:
    if not data:
        return "<empty>"
    text = data.decode("utf-8", errors="replace")
    lines = text.strip().splitlines()
    if not lines:
        return ""
    snippet = "\n".join(lines[:max_lines])
    if len(snippet) > limit:
        snippet = snippet[:limit] + "\n…"
    return snippet


def fetch_pending(session: requests.Session, proxy_url: str, timeout: float) -> List[Dict[str, Any]]:
    url = f"{proxy_url.rstrip('/')}/promises/pending"
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list):
        raise ValueError("Unexpected payload for /promises/pending")
    return payload


def fetch_request_snapshot(
    session: requests.Session,
    proxy_url: str,
    promise_id: str,
    timeout: float,
) -> Optional[Dict[str, Any]]:
    url = f"{proxy_url.rstrip('/')}/promise/{promise_id}/request"
    try:
        response = session.get(url, timeout=timeout)
        if response.status_code != 200:
            logging.debug("Snapshot request returned %s for %s", response.status_code, promise_id)
            return None
        return response.json()
    except requests.RequestException as exc:
        logging.warning("Failed to load request snapshot for %s: %s", promise_id, exc)
        return None
    except ValueError:
        logging.warning("Request snapshot for %s is not JSON", promise_id)
        return None


def execute_promise(session: requests.Session, proxy_url: str, promise_id: str, timeout: float) -> Optional[Dict[str, Any]]:
    url = f"{proxy_url.rstrip('/')}/promise/{promise_id}/execute"
    try:
        response = session.post(url, timeout=timeout)
        payload = None
        try:
            payload = response.json()
        except ValueError:
            payload = None
        if not response.ok:
            logging.warning("Execute returned %s for %s: %s", response.status_code, promise_id, payload or response.text[:200])
            return None
        logging.info("Promise %s executed → result %s", promise_id, payload.get("result_status_code") if isinstance(payload, dict) else "ok")
        return payload
    except requests.RequestException as exc:
        logging.warning("Execution failed for %s: %s", promise_id, exc)
        return None


def fetch_response(
    session: requests.Session,
    proxy_url: str,
    promise_id: str,
    timeout: float,
    attempts: int,
    delay: float,
) -> Optional[requests.Response]:
    url = f"{proxy_url.rstrip('/')}/promise/{promise_id}/response"
    last_response: Optional[requests.Response] = None
    for attempt in range(attempts):
        try:
            response = session.get(url, timeout=timeout)
        except requests.RequestException as exc:
            logging.warning("Failed to fetch response for %s: %s", promise_id, exc)
            return None
        if response.status_code == 200:
            return response
        if response.status_code == 202:
            last_response = response
            logging.debug("Response for %s still pending (attempt %s)", promise_id, attempt + 1)
            time.sleep(delay)
            continue
        last_response = response
        break
    return last_response


def describe_pending(entry: Dict[str, Any]) -> str:
    return f"{entry.get('method', 'UNK')} {entry.get('path', '…')} (created {entry.get('created_at')})"


def handle_promise(session: requests.Session, args: argparse.Namespace, entry: Dict[str, Any]) -> None:
    promise_id = entry.get("promiseId")
    if not promise_id:
        return
    logging.info("Ticket %s – %s", promise_id, describe_pending(entry))
    snapshot = fetch_request_snapshot(session, args.proxy_url, promise_id, args.timeout)
    if snapshot:
        _b = snapshot.get("body", "")
        if isinstance(_b, (dict, list)):
            _b = json.dumps(_b, ensure_ascii=False)
        logging.debug("Request body: %s", shorten_text(str(_b), limit=1000))
    if args.dry_run or args.no_auto_approve:
        logging.info("Auto-approve disabled; skipping execution for %s", promise_id)
        return
    execute_payload = execute_promise(session, args.proxy_url, promise_id, args.timeout)
    if execute_payload is None:
        logging.warning("Skipping response fetch because execution failed for %s", promise_id)
        return
    response = fetch_response(session, args.proxy_url, promise_id, args.timeout, args.response_attempts, args.response_delay)
    if response is None:
        logging.warning("No response returned for %s", promise_id)
        return
    body_preview = preview_bytes(response.content)
    logging.info("Qwen output for %s:\n%s", promise_id, body_preview)


def run_daemon(args: argparse.Namespace) -> None:
    session = build_session()
    consecutive_empty = 0
    while True:
        try:
            pending = fetch_pending(session, args.proxy_url, args.timeout)
        except (requests.RequestException, ValueError) as exc:
            logging.warning("Failed to poll pending tickets: %s", exc)
            pending = []
        if pending:
            consecutive_empty = 0
            for entry in pending:
                handle_promise(session, args, entry)
        else:
            consecutive_empty += 1
            logging.debug("No pending tickets (cycle %s).", consecutive_empty)
            if args.max_empty_cycles > 0 and consecutive_empty >= args.max_empty_cycles:
                logging.info("No tickets for %s cycles; exiting.", consecutive_empty)
                break
        time.sleep(max(0.1, args.interval))


def main() -> None:
    args = parse_args()
    logging.basicConfig(
        stream=sys.stdout,
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="[%(asctime)s] %(levelname)s: %(message)s",
    )
    logging.info("Starting promise queue daemon (%s)", args.proxy_url)
    try:
        run_daemon(args)
    except KeyboardInterrupt:
        logging.info("Interrupted, exiting.")


if __name__ == "__main__":
    main()
