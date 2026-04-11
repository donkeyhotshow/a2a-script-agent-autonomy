# Virtual Model Report

- generated_at: `2026-02-24T12:21:05Z`
- base_url: `http://localhost:11435`
- model: `rnj-L`

## Health

### Request

```json
{
  "method": "GET",
   "url": "http://localhost:11434/health",
  "params": {},
  "json": null
}
```

### Response (200, 3542ms)

```json
{
  "status_code": 200,
  "elapsed_ms": 3542,
  "headers": {
    "Server": "compat_llm",
    "Date": "Tue, 24 Feb 2026 12:21:17 GMT",
    "Content-Type": "application/json",
    "Content-Length": "359",
    "Connection": "close"
  }
}
```

### Body (json)

```json
{
  "ai_hub_config": "C:\\workspace\\org-carrier\\a2a-script-agent\\a2a-ai-hub\\docs\\ai-hub.config.example.json",
  "ai_hub_rules": 3,
  "local_llm_upstream_available": false,
  "local_llm_upstream_host": "http://localhost:11435",
  "local_llm_upstream_port": 11435,
  "promise": {
    "dir": "proxy_logs\\promises",
    "max_workers": 8,
    "ttl_seconds": 86400
  },
   "proxy_port": 11434,
  "status": "running",
  "storage_dir": "proxy_logs"
}
```

## Tags (api/tags)

### Request

```json
{
  "method": "GET",
  "url": "http://localhost:11435/api/tags",
  "params": {},
  "json": null
}
```

### Response (200, 4038ms)

```json
{
  "status_code": 200,
  "elapsed_ms": 4038,
  "headers": {
    "Server": "compat_llm",
    "Date": "Tue, 24 Feb 2026 12:21:21 GMT",
    "Content-Type": "application/json",
    "Content-Length": "226",
    "Connection": "close"
  }
}
```

### Body (json)

```json
{
  "models": [
    {
      "name": "rnj-L",
      "model": "rnj-L",
      "modified_at": "2026-02-24T00:00:00Z",
      "size": 0,
      "digest": "sha256:virtual-rnj-l",
      "details": {
        "family": "mistral",
        "parameter_size": "large",
        "quantization_level": "Q4_K_M"
      }
    }
  ]
}
```

## Show (api/show?model=...)

### Request

```json
{
  "method": "GET",
  "url": "http://localhost:11435/api/show",
  "params": {
    "model": "rnj-L"
  },
  "json": null
}
```

### Response (200, 8ms)

```json
{
  "status_code": 200,
  "elapsed_ms": 8,
  "headers": {
    "Server": "compat_llm",
    "Date": "Tue, 24 Feb 2026 12:21:21 GMT",
    "Content-Type": "application/json",
    "Content-Length": "882",
    "Connection": "close"
  }
}
```

### Body (json)

```json
{
  "model": "rnj-L",
  "license": "virtual",
  "details": {
    "family": "mistral",
    "parameter_size": "large",
    "quantization_level": "Q4_K_M"
  },
  "capabilities": {
    "chat": true,
    "tools": true,
    "tool_choice": true,
    "json": true,
    "structured_output": true,
    "vision": false,
    "stream": true,
    "embeddings": true,
    "modes": [
      "chat",
      "generate",
      "embeddings",
      "tools",
      "json"
    ]
  },
  "parameters": "temperature 0.7\nnum_ctx 32768\nnum_predict 2048",
  "template": "{{ .Prompt }}",
  "modelfile": "# virtual model rnj-L (simulated as top Mistral)\nFROM mistral\n",
  "tools": [
    {
      "name": "web_search",
      "description": "Search the web for fresh information",
      "input_schema": {
        "type": "object",
        "properties": {
          "q": {
            "type": "string"
          }
        },
        "required": [
          "q"
        ]
      }
    },
    {
      "name": "calc",
      "description": "Deterministic calculator",
      "input_schema": {
        "type": "object",
        "properties": {
          "expr": {
            "type": "string"
          }
        },
        "required": [
          "expr"
        ]
      }
    }
  ]
}
```

## Generate (sync, simulated prompt)

### Request

```json
{
  "method": "POST",
  "url": "http://localhost:11435/api/generate",
  "params": {},
  "json": {
    "model": "rnj-L",
    "prompt": "SIMULATE: smoke test rnj-L",
    "stream": false
  }
}
```

### Response (200, 58ms)

```json
{
  "status_code": 200,
  "elapsed_ms": 58,
  "headers": {
    "Server": "compat_llm",
    "Date": "Tue, 24 Feb 2026 12:21:21 GMT",
    "Content-Type": "application/json",
    "Content-Length": "135",
    "Connection": "close"
  }
}
```

### Body (json)

```json
{
  "model": "rnj-L",
  "created_at": "2026-02-24T12:21:21.868800+00:00",
  "response": "SIMULATED: SIMULATE: smoke test rnj-L",
  "done": true
}
```

## Generate (promise=1)

### Request

```json
{
  "method": "POST",
  "url": "http://localhost:11435/api/generate",
  "params": {
    "promise": "1"
  },
  "json": {
    "model": "rnj-L",
    "prompt": "SIMULATE: promise smoke test rnj-L",
    "stream": false
  }
}
```

### Response (202, 13ms)

```json
{
  "status_code": 202,
  "elapsed_ms": 13,
  "headers": {
    "Server": "compat_llm",
    "Date": "Tue, 24 Feb 2026 12:21:21 GMT",
    "Content-Type": "application/json",
    "Content-Length": "70",
    "Connection": "close"
  }
}
```

### Body (json)

```json
{
  "promiseId": "4c72aea1c0c44bc9a1db6469425ca745",
  "status": "pending"
}
```

## Promise result

```json
{
  "promiseId": "4c72aea1c0c44bc9a1db6469425ca745",
  "status": {
    "request": {
      "method": "GET",
      "url": "http://localhost:11435/promise/4c72aea1c0c44bc9a1db6469425ca745",
      "params": {},
      "json": null
    },
    "response": {
      "status_code": 200,
      "elapsed_ms": 28,
      "headers": {
        "Server": "compat_llm",
        "Date": "Tue, 24 Feb 2026 12:21:21 GMT",
        "Content-Type": "application/json",
        "Content-Length": "131",
        "Connection": "close"
      },
      "json": {
        "promiseId": "4c72aea1c0c44bc9a1db6469425ca745",
        "result_content_type": "application/json",
        "result_status_code": 200,
        "status": "done"
      },
      "text": null
    }
  },
  "result": {
    "request": {
      "method": "GET",
      "url": "http://localhost:11435/promise/4c72aea1c0c44bc9a1db6469425ca745/response",
      "params": {},
      "json": null
    },
    "response": {
      "status_code": 200,
      "elapsed_ms": 19,
      "headers": {
        "Server": "compat_llm",
        "Date": "Tue, 24 Feb 2026 12:21:22 GMT",
        "Content-Type": "application/json",
        "Content-Length": "143",
        "X-Promise-Id": "4c72aea1c0c44bc9a1db6469425ca745",
        "X-Promise-Status": "done",
        "Connection": "close"
      },
      "json": {
        "model": "rnj-L",
        "created_at": "2026-02-24T12:21:21.933993+00:00",
        "response": "SIMULATED: SIMULATE: promise smoke test rnj-L",
        "done": true
      },
      "text": null
    }
  }
}
```
