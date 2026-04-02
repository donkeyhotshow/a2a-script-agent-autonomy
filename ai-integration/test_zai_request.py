import requests
import json
import time
import sys

# Test Z.AI integration with promise handling
BASE_URL = "http://localhost:11434"

def test_zai_request():
    """Test Z.AI request with promise handling"""
    
    # 1. Send chat request to Z.AI model
    payload = {
        "model": "glm-4.7-flash",
        "messages": [
            {"role": "user", "content": "Привет! Как дела? Ответь кратко."}
        ],
        "max_tokens": 50
    }
    
    print("=" * 60)
    print("Testing Z.AI Chat Completion with Promise")
    print("=" * 60)
    
    print("\n1. Sending request to Z.AI...")
    print(f"   URL: {BASE_URL}/v1/chat/completions")
    print(f"   Model: {payload['model']}")
    
    try:
        # Send request
        response = requests.post(
            f"{BASE_URL}/v1/chat/completions",
            json=payload,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 202:
            # Promise was created
            data = response.json()
            promise_id = data.get("promise_id") or data.get("id")
            print(f"\n2. Promise created: {promise_id}")
            
            # 2. Poll for promise status
            print("\n3. Polling for response (checking promise status)...")
            
            max_attempts = 30  # 30 attempts
            attempt = 0
            
            while attempt < max_attempts:
                attempt += 1
                print(f"   Attempt {attempt}/{max_attempts}...", end=" ")
                
                # Check promise status
                status_response = requests.get(
                    f"{BASE_URL}/promises/status",
                    timeout=5
                )
                
                if status_response.status_code == 200:
                    statuses = status_response.json()
                    
                    # Look for our promise
                    if promise_id in statuses:
                        promise_status = statuses[promise_id]
                        print(f"Status: {promise_status.get('status')}")
                        
                        if promise_status.get('status') == 'fulfilled':
                            print(f"\n   ✓ Promise fulfilled!")
                            result = promise_status.get('result')
                            if result:
                                print(f"\n4. Response from Z.AI:")
                                print(f"   Content: {result}")
                                return True
                    else:
                        print("waiting...")
                else:
                    print(f"error ({status_response.status_code})")
                
                time.sleep(1)
            
            print(f"\n✗ Promise never fulfilled after {max_attempts} seconds")
            return False
            
        elif response.status_code == 200:
            # Direct response
            print(f"\n2. Direct response received (no promise):")
            data = response.json()
            choice = data.get("choices", [{}])[0]
            content = choice.get("message", {}).get("content", "")
            print(f"   Content: {content}")
            return True
        else:
            print(f"\n✗ Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError as e:
        print(f"\n✗ Connection error: {e}")
        print(f"   Is proxy running on {BASE_URL}?")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == '__main__':
    success = test_zai_request()
    sys.exit(0 if success else 1)
