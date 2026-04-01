"""
Test Promise Daemon Script

This script tests the promise daemon functionality by:
1. Sending a request with ?promise=1 to the proxy
2. Waiting for the daemon to intercept the promise
3. Checking the execution result
4. Printing status and result

Usage:
    python scripts/test_promise_daemon.py [--host HOST] [--port PORT]
"""
import argparse
import json
import os
import sys
import time
import requests


def wait_for_promise(
    host: str,
    port: int,
    promise_id: str,
    timeout: int = 60,
    poll_interval: float = 1.0
) -> dict:
    """
    Wait for promise to be processed.
    
    Args:
        host: Proxy host
        port: Proxy port
        promise_id: The promise ID to wait for
        timeout: Maximum time to wait in seconds
        poll_interval: How often to poll for status
    
    Returns:
        Final promise status dict
    """
    start_time = time.time()
    base_url = f"http://{host}:{port}"
    
    while time.time() - start_time < timeout:
        # Check promise status
        response = requests.get(f"{base_url}/promise/{promise_id}")
        
        if response.status_code == 200:
            status_data = response.json()
            status = status_data.get("status")
            
            if status == "done":
                return status_data
            elif status == "error":
                return status_data
            # else: still pending
        
        elif response.status_code == 404:
            # Promise not found yet - maybe not created
            pass
        
        time.sleep(poll_interval)
    
    return {"error": "timeout", "message": f"Promise {promise_id} did not complete within {timeout} seconds"}


def get_promise_response(host: str, port: int, promise_id: str) -> requests.Response:
    """Get the promise response body."""
    base_url = f"http://{host}:{port}"
    return requests.get(f"{base_url}/promise/{promise_id}/response")


def check_promise_in_pending(host: str, port: int, promise_id: str) -> bool:
    """Check if promise is in pending list."""
    base_url = f"http://{host}:{port}"
    response = requests.get(f"{base_url}/promises/pending")
    
    if response.status_code == 200:
        pending = response.json()
        return any(p.get("promiseId") == promise_id for p in pending)
    
    return False


def send_promise_request(
    host: str,
    port: int,
    path: str = "/api/generate",
    model: str = "llama3.2",
    prompt: str = "Hello, world!"
) -> dict:
    """
    Send a request with promise=1 to the proxy.
    
    Args:
        host: Proxy host
        port: Proxy port
        path: API path
        model: Model name
        prompt: Prompt to send
    
    Returns:
        Dict with promiseId and initial status
    """
    base_url = f"http://{host}:{port}"
    
    # Check simulation mode from environment
    use_simulation = os.environ.get("SIMULATION_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # Prepare request body
    body = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    
    # Add simulation config if enabled
    if use_simulation:
        body["promise"] = True
    
    # Send request with ?promise=1
    url = f"{base_url}{path}?promise=1"
    response = requests.post(url, json=body, timeout=30)
    
    return {
        "status_code": response.status_code,
        "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else {"raw": response.text}
    }


def main():
    parser = argparse.ArgumentParser(description="Test Promise Daemon")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Proxy host (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=11435,
        help="Proxy port (default: 11435)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Timeout for waiting for promise (default: 60 seconds)"
    )
    parser.add_argument(
        "--path",
        default="/api/generate",
        help="API path to test (default: /api/generate)"
    )
    parser.add_argument(
        "--model",
        default="llama3.2",
        help="Model to use (default: llama3.2)"
    )
    parser.add_argument(
        "--prompt",
        default="Hello, world!",
        help="Prompt to send (default: 'Hello, world!')"
    )
    
    args = parser.parse_args()
    
    base_url = f"http://{args.host}:{args.port}"
    
    print("=" * 60)
    print("Promise Daemon Test")
    print("=" * 60)
    print(f"Proxy URL: {base_url}")
    print(f"Test path: {args.path}")
    print(f"Model: {args.model}")
    print()
    
    # Step 1: Check proxy health
    print("[1/5] Checking proxy health...")
    try:
        health_response = requests.get(f"{base_url}/health", timeout=5)
        if health_response.status_code == 200:
            print(f"      [OK] Proxy is running")
            print(f"        {health_response.json()}")
        else:
            print(f"      ✗ Proxy health check failed: {health_response.status_code}")
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"      ✗ Cannot connect to proxy: {e}")
        sys.exit(1)
    
    # Step 2: Send request with ?promise=1
    print("\n[2/5] Sending request with ?promise=1...")
    try:
        result = send_promise_request(
            host=args.host,
            port=args.port,
            path=args.path,
            model=args.model,
            prompt=args.prompt
        )
        print(f"      Status: {result['status_code']}")
        print(f"      Response: {result['data']}")
        
        promise_id = result['data'].get('promiseId')
        if not promise_id:
            print("      ✗ No promiseId in response")
            sys.exit(1)
        
        print(f"      [OK] Promise ID: {promise_id}")
    except requests.exceptions.RequestException as e:
        print(f"      ✗ Request failed: {e}")
        sys.exit(1)
    
    # Step 3: Wait for daemon to intercept the promise
    print(f"\n[3/5] Waiting for daemon to intercept promise (timeout: {args.timeout}s)...")
    time.sleep(2)  # Give daemon time to poll
    
    # Check if promise appears in pending list
    if check_promise_in_pending(args.host, args.port, promise_id):
        print(f"      [OK] Promise {promise_id} found in pending list")
    else:
        print(f"      [!] Promise {promise_id} not found in pending list (may have already been processed)")
    
    # Step 4: Wait for promise to complete
    print(f"\n[4/5] Waiting for promise to complete...")
    final_status = wait_for_promise(
        host=args.host,
        port=args.port,
        promise_id=promise_id,
        timeout=args.timeout
    )
    
    print(f"      Status: {final_status.get('status')}")
    if 'error' in final_status:
        print(f"      Error: {final_status}")
    else:
        print(f"      [OK] Promise completed successfully")
    
    # Step 5: Get result
    print(f"\n[5/5] Getting result...")
    try:
        response = get_promise_response(args.host, args.port, promise_id)
        
        print(f"      Status Code: {response.status_code}")
        
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '')
            print(f"      Content-Type: {content_type}")
            
            if content_type.startswith('application/json'):
                data = response.json()
                print(f"      [OK] Result (JSON):")
                # Pretty print the result
                print(json.dumps(data, indent=4, ensure_ascii=False)[:500])
            else:
                text = response.text[:500]
                print(f"      [OK] Result (text):")
                print(text)
        else:
            print(f"      [X] Failed to get response: {response.status_code}")
            print(f"      Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"      ✗ Failed to get response: {e}")
    
    # Final summary
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)
    print(f"Promise ID: {promise_id}")
    print(f"Final Status: {final_status.get('status', 'unknown')}")
    
    if final_status.get('status') == 'done':
        print("\n[OK] TEST PASSED")
        sys.exit(0)
    else:
        print("\n[FAIL] TEST FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
