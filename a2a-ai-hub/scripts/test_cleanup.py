#!/usr/bin/env python3
"""
Test cleanup functionality for a2a-ai-hub proxy.
"""

import argparse
import json
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def test_cleanup_stats(proxy_url: str) -> bool:
    """Test cleanup stats endpoint."""
    try:
        response = requests.get(f"{proxy_url}/cleanup/stats", timeout=10)
        response.raise_for_status()

        data = response.json()
        print("[OK] Cleanup stats endpoint works")
        print(f"  Storage stats: {json.dumps(data.get('storage_stats', {}), indent=2)}")
        print(f"  Retention settings: {json.dumps(data.get('retention_settings', {}), indent=2)}")
        return True
    except Exception as e:
        print(f"[FAIL] Cleanup stats failed: {e}")
        return False


def test_cleanup_run(proxy_url: str) -> bool:
    """Test manual cleanup run."""
    try:
        response = requests.post(f"{proxy_url}/cleanup/run", timeout=30)
        response.raise_for_status()

        data = response.json()
        print("[OK] Manual cleanup run completed")
        print(f"  Status: {data.get('status')}")
        print(f"  Results: {json.dumps(data.get('results', {}), indent=2)}")
        print(f"  Total removed: {data.get('total_removed', 0)}")
        return True
    except Exception as e:
        print(f"[FAIL] Manual cleanup run failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Test cleanup functionality")
    parser.add_argument("--proxy-url", default="http://127.0.0.1:11435", help="Proxy base URL")
    args = parser.parse_args()

    print("Testing cleanup functionality...")
    print(f"Proxy URL: {args.proxy_url}")
    print()

    success = True

    # Test stats endpoint
    success &= test_cleanup_stats(args.proxy_url)
    print()

    # Test manual cleanup
    success &= test_cleanup_run(args.proxy_url)
    print()

    if success:
        print("[OK] All cleanup tests passed!")
        return 0
    else:
        print("[FAIL] Some cleanup tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())