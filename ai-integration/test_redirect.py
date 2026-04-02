import requests
import json

# Test model redirect
# Note: Do not override Z_AI_API_KEY - let the proxy use the .env value
payload = {
    "model": "any-random-model-name",
    "messages": [
        {"role": "user", "content": "Hello, who are you?"}
    ]
}

print("Sending request with model: 'any-random-model-name'")
print("Expected redirect: glm-4.7-flash")
print("(Proxy will use Z_AI_API_KEY from .env file)\n")

try:
    response = requests.post(
        "http://localhost:11434/v1/chat/completions",
        json=payload,
        timeout=10
    )
    
    if response.status_code == 202:
        print(f"Status: 202 (Promise created)")
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    elif response.status_code == 200:
        print(f"Status: 200 (Direct response)")
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"Status: {response.status_code}")
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
            
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

