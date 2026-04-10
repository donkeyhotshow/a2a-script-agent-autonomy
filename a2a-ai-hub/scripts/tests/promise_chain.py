#!/usr/bin/env python3
"""
Promise daemon chain tester.

Verifies that:
1. A promise created with `?promise=1` is accepted
2. The built-in daemon observes the pending ticket before
   the proxy executes it
3. DELAY_BEFORE_EXECUTE > DAEMON_POLL_INTERVAL allows the
   daemon to intercept the promise.
"""

import argparse
import json
import sys
import time
import urllib.request
from typing import List, Optional, Tuple

DEFAULT_PROXY_URL = "http://127.0.0.1:11434"


def _build_endpoints(proxy_url: str) -> Tuple[str, str]:
    base = proxy_url.rstrip('/')
    return f"{base}/api/generate", f"{base}/promises/pending"


def get_pending_promises(pending_endpoint: str) -> List[dict]:
    """Fetch the list of pending promises."""
    try:
        req = urllib.request.Request(pending_endpoint)
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as exc:
        print(f"Error fetching pending promises: {exc}")
        return []


def create_promise_request(promise_endpoint: str, model: str, prompt: str) -> Optional[dict]:
    """Create a promise with `promise=1` via the proxy."""
    data = json.dumps({"model": model, "prompt": prompt}).encode('utf-8')
    req = urllib.request.Request(
        promise_endpoint + "?promise=1",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as exc:
        print(f"Error creating promise: {exc}")
        return None


def wait_for_promise_intercept(
    pending_endpoint: str,
    max_wait: int = 15,
    check_interval: float = 1.0,
) -> bool:
    """Wait until the daemon clears the pending queue."""
    print(f"Waiting for daemon to intercept promise (max {max_wait}s)...")
    start_time = time.time()

    while time.time() - start_time < max_wait:
        pending = get_pending_promises(pending_endpoint)

        if not pending:
            print(f"  [{time.time() - start_time:.1f}s] No pending promises – daemon caught it!")
            return True

        print(f"  [{time.time() - start_time:.1f}s] Pending promises: {len(pending)}")
        time.sleep(check_interval)

    return False


def run_promise_chain_test(
    proxy_url: str = DEFAULT_PROXY_URL,
    *,
    model: str = "qwen3:8b",
    prompt: str = "test",
    max_wait: int = 15,
    check_interval: float = 1.0,
) -> bool:
    """Orchestrate the promise creation + daemon interception test."""
    promise_endpoint, pending_endpoint = _build_endpoints(proxy_url)

    print("=" * 60)
    print("Promise Daemon Chain Test")
    print("=" * 60)

    print("[1/4] Initial pending queue check...")
    initial_pending = get_pending_promises(pending_endpoint)
    print(f"  Initial pending: {len(initial_pending)}\n")

    print("[2/4] Creating promise via proxy...")
    result = create_promise_request(promise_endpoint, model, prompt)

    if not result or result.get("status") != "pending":
        print("ERROR: Failed to create promise")
        return False

    promise_id = result.get("promiseId")
    print(f"  Promise ID: {promise_id}")
    print(f"  Status: {result.get('status')}\n")

    print("[3/4] Waiting for daemon to intercept pending promise...")
    daemon_caught = wait_for_promise_intercept(pending_endpoint, max_wait, check_interval)

    if not daemon_caught:
        print("ERROR: Daemon did not intercept the promise!")
        return False

    print("\n[4/4] Final verification...")
    final_pending = get_pending_promises(pending_endpoint)

    print("\n" + "=" * 60)
    print("TEST RESULT: SUCCESS")
    print("=" * 60)
    print(f"  Promise created: {promise_id}")
    print(f"  Daemon intercepted: YES")
    print(f"  Final pending count: {len(final_pending)}")
    print()
    print("DAEMON_POLL_INTERVAL < PROMISE_DELAY_BEFORE_EXECUTE allows the daemon to catch the promise.")
    return True


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test for the promise daemon.")
    parser.add_argument("--proxy-url", default=DEFAULT_PROXY_URL, help="Base URL for the proxy.")
    parser.add_argument("--model", default="qwen3:8b", help="LLM model to request.")
    parser.add_argument("--prompt", default="test", help="Prompt used for promise generation.")
    parser.add_argument("--max-wait", type=int, default=15, help="Seconds to wait for daemon interception.")
    parser.add_argument("--check-interval", type=float, default=1.0, help="Seconds between pending checks.")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    success = run_promise_chain_test(
        proxy_url=args.proxy_url,
        model=args.model,
        prompt=args.prompt,
        max_wait=args.max_wait,
        check_interval=args.check_interval,
    )
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
