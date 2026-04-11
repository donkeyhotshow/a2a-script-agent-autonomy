# LLM Providers Module

Universal LLM wrapper with support for multiple providers and automatic fallback.

## Supported Providers

| Provider | Type | Free Tier | API Key Required |
|----------|------|-----------|------------------|
| **Local LLM upstream** | Local | Unlimited | No |
| **OpenRouter** | OpenAI-compatible | 5000 credits | Yes |
| **Groq** | OpenAI-compatible | Daily limits | Yes |
| **HuggingFace** | Custom | 1000 req/month | Yes |
| **Cohere** | OpenAI-compatible | $5 credits | Yes |

## Quick Start

```python
from proxy.providers import get_router, ChatMessage

# Get router instance
router = get_router()

# Generate text
result = await router.generate(
    prompt="What is the capital of France?",
    model="qwen3:8b"
)
print(result.text)

# Chat completion
messages = [
    ChatMessage(role="system", content="You are a helpful assistant."),
    ChatMessage(role="user", content="Hello!"),
]
result = await router.chat(messages=messages, model="qwen3:8b")
print(result.text)

# Embeddings
result = await router.embeddings(texts=["Hello world"], model="nomic-embed-text")
print(result.embeddings)
```

## Configuration

### Environment Variables

```bash
# Provider API Keys
OPENROUTER_API_KEY=sk-or-...
GROQ_API_KEY=gsk_...
HF_TOKEN=hf_...
COHERE_API_KEY=...

# Router Settings
DEFAULT_PROVIDER=compat_llm
ENABLE_FALLBACK=true
PROVIDERS_CONFIG=config/providers.json
```

### Configuration File

Create `config/providers.json`:

```json
{
  "providers": {
    "compat_llm": {
      "type": "compat_llm",
      "url": "http://localhost:11435",
      "enabled": true,
      "priority": 1,
      "models": ["qwen3:8b", "mistral"]
    },
    "openrouter": {
      "type": "openai",
      "url": "https://openrouter.ai/api/v1",
      "api_key": "${OPENROUTER_API_KEY}",
      "enabled": true,
      "priority": 2,
      "models": ["meta-llama/llama-3-8b-instruct"],
      "fallback_models": {
        "qwen3:8b": "meta-llama/llama-3-8b-instruct"
      }
    }
  },
  "default_provider": "compat_llm",
  "fallback_chain": ["compat_llm", "groq", "openrouter"]
}
```

## OpenAI-Compatible API

The proxy provides OpenAI-compatible endpoints:

```bash
# Chat completions
curl http://localhost:11435/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:8b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# List models
curl http://localhost:11435/v1/models

# Provider status
curl http://localhost:11435/v1/providers
```

## Fallback Chain

When a provider fails, the router automatically tries the next provider in the chain:

```
Request → Local LLM upstream (fails) → Groq (fails) → OpenRouter (succeeds)
```

Configure the fallback chain in `providers.json`:

```json
{
  "fallback_chain": ["compat_llm", "groq", "openrouter"]
}
```

## Provider Status

Check provider health:

```python
status = router.get_provider_status()
print(status)
# {
#   "compat_llm": {"health": "healthy", "models": [...]},
#   "groq": {"health": "healthy", "models": [...]},
# }
```

Enable/disable providers dynamically:

```python
await router.enable_provider("groq")
await router.disable_provider("openrouter")
```

## Architecture

```
Request → ProviderRouter → Provider Chain
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Local LLM upstreamProvider    OpenAICompatibleProvider
                    ↑                   ↑
            Local Local LLM upstream      OpenRouter/Groq/Cohere
```

## Testing

Run tests:

```bash
cd a2a-ai-hub
pytest tests/providers/ -v
```
