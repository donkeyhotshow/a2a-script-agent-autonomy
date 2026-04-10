import os, requests, time
from circuit_breaker import CircuitBreaker

class ModelRouter:
    """Пробует модели по порядку. Если одна недоступна — переходит к следующей."""

    def __init__(self):
        self.chain = [
            {
                "name": "qwen3:8b",
                "url":  f"http://localhost:{os.getenv('OLLAMA_PORT', 11435)}/api/generate",
                "type": "ollama",
                "cb":   CircuitBreaker(failure_threshold=3, recovery_timeout=60),
            },
            {
                "name": "deepseek-v3",
                "url":  "https://api.deepseek.com/v1/chat/completions",
                "type": "openai",
                "key":  os.getenv("DEEPSEEK_API_KEY"),
                "cb":   CircuitBreaker(failure_threshold=2, recovery_timeout=300),
            }
        ]

    def generate(self, prompt, system_prompt=None):
        last_error = None
        for model in self.chain:
            try:
                return model["cb"].call(self._request, model, prompt, system_prompt)
            except Exception as e:
                print(f"Model {model['name']} failed: {e}")
                last_error = e
                continue
        
        raise RuntimeError(f"All models failed. Last error: {last_error}")

    def _request(self, model, prompt, system_prompt):
        if model["type"] == "ollama":
            resp = requests.post(model["url"], json={
                "model": model["name"],
                "prompt": prompt,
                "system": system_prompt,
                "stream": False
            }, timeout=120)
            resp.raise_for_status()
            return resp.json()["response"]
        
        elif model["type"] == "openai":
            resp = requests.post(model["url"], 
                headers={"Authorization": f"Bearer {model['key']}"},
                json={
                    "model": model["name"],
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                }, timeout=60)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
