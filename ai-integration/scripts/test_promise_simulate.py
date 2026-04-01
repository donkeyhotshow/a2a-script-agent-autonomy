#!/usr/bin/env python3
"""
Test script for Promise + Simulate flow.
Sends a request with simulate config and promise=1, then polls for the result.
"""
import sys
import time
import requests
import json

PROXY_URL = "http://localhost:11435"
DEFAULT_TIMEOUT = 30  # seconds
POLL_INTERVAL = 1  # second


def send_promise_request(model: str = "llama3.2", prompt: str = "test", 
                        simulate: dict = None, stream: bool = False) -> str:
    """Send a request with promise=1 and optional simulate config."""
    if simulate is None:
        simulate = {"delay_ms": 2000, "response": f"SIMULATED_RESPONSE_{int(time.time())}"}
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": stream,
    }
    
    # Add simulate config if provided
    if simulate:
        payload["simulate"] = simulate
    
    url = f"{PROXY_URL}/api/generate?promise=1"
    
    print(f"[TEST] Sending request to {url}")
    print(f"[TEST] Payload: {json.dumps(payload)}")
    
    response = requests.post(url, json=payload, timeout=10)
    
    if response.status_code == 202:
        data = response.json()
        promise_id = data.get("promiseId")
        print(f"[TEST] Promise created: {promise_id}")
        return promise_id
    else:
        print(f"[TEST] ERROR: Got status {response.status_code}: {response.text}")
        return None


def wait_for_promise(promise_id: str, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Poll for promise status until done or timeout."""
    url = f"{PROXY_URL}/promise/{promise_id}"
    start_time = time.time()
    
    print(f"[TEST] Waiting for promise {promise_id} (timeout={timeout}s)...")
    
    while time.time() - start_time < timeout:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            status = data.get("status")
            print(f"[TEST] Status: {status}")
            
            if status == "done":
                return data
            elif status == "error":
                print(f"[TEST] ERROR: {data.get('error')}")
                return data
        else:
            print(f"[TEST] ERROR: Got status {response.status_code}")
        
        time.sleep(POLL_INTERVAL)
    
    print(f"[TEST] TIMEOUT after {timeout}s")
    return None


def get_promise_response(promise_id: str) -> str:
    """Get the actual response content from a promise."""
    url = f"{PROXY_URL}/promise/{promise_id}/response"
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        return response.text
    else:
        print(f"[TEST] ERROR getting response: status {response.status_code}")
        return None


def run_test(model: str = "llama3.2", prompt: str = "test",
             simulate: dict = None, expected_response: str = None) -> bool:
    """Run the full test flow."""
    print("=" * 60)
    print(f"[TEST] Starting Promise + Simulate Test")
    print(f"[TEST] Model: {model}, Prompt: {prompt}")
    print("=" * 60)
    
    # Create promise with simulate
    promise_id = send_promise_request(model, prompt, simulate)
    
    if not promise_id:
        print("[TEST] FAILED: Could not create promise")
        return False
    
    # Wait for promise to complete
    result = wait_for_promise(promise_id)
    
    if not result:
        print("[TEST] FAILED: Promise timed out")
        return False
    
    if result.get("status") != "done":
        print(f"[TEST] FAILED: Promise status is {result.get('status')}")
        return False
    
    # Get response
    response_text = get_promise_response(promise_id)
    
    if response_text is None:
        print("[TEST] FAILED: Could not get response")
        return False
    
    print(f"[TEST] Response: {response_text}")
    
    # Verify response
    if expected_response:
        if expected_response in response_text:
            print(f"[TEST] SUCCESS: Response contains expected text '{expected_response}'")
            return True
        else:
            print(f"[TEST] FAILED: Expected '{expected_response}' in response")
            return False
    
    print("[TEST] SUCCESS: Promise completed with simulated response!")
    return True


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Promise + Simulate flow")
    parser.add_argument("--model", default="llama3.2", help="Model name")
    parser.add_argument("--prompt", default="test", help="Prompt text")
    parser.add_argument("--simulate-delay", type=int, default=2000, help="Simulate delay in ms")
    parser.add_argument("--simulate-response", default=None, help="Simulate response text")
    parser.add_argument("--expected", default=None, help="Expected text in response")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="Timeout in seconds")
    
    args = parser.parse_args()
    
    # Build simulate config
    simulate = {
        "delay_ms": args.simulate_delay,
        "response": args.simulate_response or f"SIMULATED_RESPONSE_{int(time.time())}"
    }
    
    # Run test
    success = run_test(
        model=args.model,
        prompt=args.prompt,
        simulate=simulate,
        expected_response=args.expected
    )
    
    if success:
        print("\n[TEST] ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n[TEST] TESTS FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
