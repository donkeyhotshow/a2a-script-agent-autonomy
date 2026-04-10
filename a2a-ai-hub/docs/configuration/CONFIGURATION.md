# AI Integration Configuration Documentation

## Overview

The AI Integration module (ai-integration) is configured through several files and environment variables. This document covers the configuration system, including environment variables, provider settings, and runtime parameters.

## Configuration Files

### 1. Environment Variables (.env)

The main configuration is done through `.env` file, based on `.env.example`. Copy `.env.example` to `.env` and fill in the required values.

#### Key Sections

**Proxy Server Configuration:**
- `PROXY_PORT=11434` - Port for the proxy server
- `PROXY_HOST=0.0.0.0` - Host binding for the proxy server

**Local LLM Upstream:**
- `LOCAL_LLM_UPSTREAM_URL=http://localhost:11435` - URL of local LLM server
- `LOCAL_LLM_MODEL=qwen3:8b` - Default model name for local LLM
- `LOCAL_LLM_TIMEOUT=120` - Timeout for local LLM requests (seconds)
- `LOCAL_LLM_MODELS_DIR=~/.a2a/local-llm-models` - Directory for model storage
- `LOCAL_LLM_KEEP_ALIVE=5m` - Keep alive duration
- `LOCAL_LLM_IDLE_TIMEOUT=300` - Idle timeout before stopping server
- `LOCAL_LLM_AUTO_START=true` - Auto-start local LLM server

**Storage Configuration:**
- `STORAGE_DIR=proxy_logs` - Main storage directory
- `PROMISES_DIR=proxy_logs/promises` - Directory for promise storage

**Request Handling:**
- `PROMISE_TTL_SECONDS=86400` - Promise time-to-live (24 hours)
- `PROMISE_MAX_WORKERS=8` - Maximum concurrent workers for promises

**AI Hub Configuration:**
- `AI_HUB_CONFIG=` - Path to JSON config file (optional)
- `LOCAL_LLM_SERVER_HEADER=compat-llm` - Header for local LLM identification

**Simulation:**
- `SIMULATION_ENABLED=false` - Enable/disable simulation mode
- `SIMULATION_DATA_PATH=simulation_data` - Path for simulation data

**Health Checks:**
- `HEALTH_CHECK_INTERVAL=5` - Health check interval (seconds)
- `HEALTH_CHECK_TIMEOUT=5` - Health check timeout (seconds)

**Logging:**
- `LOG_LEVEL=INFO` - Logging level
- `LOG_FORMAT=json` - Log format (json/text)

**LLM Provider Configuration:**
- `PROVIDERS_CONFIG=config/providers.json` - Path to providers configuration
- `DEFAULT_PROVIDER=z_ai` - Default provider name
- `ENABLE_FALLBACK=true` - Enable fallback between providers
- `PROVIDER_TIMEOUT=30` - Provider request timeout (seconds)

**Provider-Specific Settings:**

*Z.AI:*
- Keys stored in providers.json, not .env

*OpenRouter:*
- `OPENROUTER_API_KEY=` - API key
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `OPENROUTER_MODEL=openrouter/auto`

*Groq:*
- `GROQ_API_KEY=`
- `GROQ_BASE_URL=https://api.groq.com/openai/v1`
- `GROQ_MODEL=llama-3.1-8b-instant`

*HuggingFace:*
- `HF_TOKEN=`

*Cohere:*
- `COHERE_API_KEY=`
- `COHERE_BASE_URL=https://api.cohere.ai/v1`
- `COHERE_MODEL=command-r`

*Qwen (DashScope):*
- `QWEN_API_KEY=`
- `QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- `QWEN_MODEL=qwen-turbo`

*Mistral Codestral:*
- `MISTRAL_API_KEY=`
- `MISTRAL_BASE_URL=https://codestral.mistral.ai/v1`
- `MISTRAL_MODEL=codestral-latest`

*Together AI:*
- `TOGETHER_API_KEY=`
- `TOGETHER_BASE_URL=https://api.together.ai/v1`
- `TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo`

*Cerebras:*
- `CEREBRAS_API_KEY=`
- `CEREBRAS_BASE_URL=https://api.cerebras.ai/v1`
- `CEREBRAS_MODEL=llama-3.3-70b`

### 2. Providers Configuration (config/providers.json)

This JSON file defines LLM providers and their API keys. It's gitignored for security.

#### Structure

**api_keys array:** Pool of credentials
```json
{
  "id": "unique-identifier",
  "provider": "provider-name",
  "secret": "api-key-or-placeholder",
  "enabled": true,
  "priority": 1
}
```

**providers object:** Provider definitions
```json
{
  "provider_name": {
    "type": "provider-type",
    "url": "base-url",
    "api_key": "key-or-env-ref",
    "enabled": true,
    "priority": 1,
    "models": ["model1", "model2"],
    "fallback_models": {"source": "target"},
    "timeout": 30,
    "max_retries": 2
  }
}
```

#### Special Cases

**Local LLM:** Use `"secret": "__LOCAL_LLM_KEY_PLACEHOLDER__"`

**Environment Variables:** Use `"${ENV_VAR}"` syntax in config files

**Fallback Chain:** Defined in `fallback_chain` array for automatic failover

### 3. AI Hub Configuration (optional)

JSON file specified by `AI_HUB_CONFIG` with rules, mapping, and simulation settings.

See `docs/ai-hub.config.schema.json` for schema.

## Setup Instructions

1. Copy `.env.example` to `.env`
2. Fill in required API keys for desired providers
3. Copy `config/providers.example.json` to `config/providers.json`
4. Update `api_keys` and provider settings in `providers.json`
5. Test configuration with health checks

## Security Notes

- Never commit real API keys to repository
- Use environment variables for sensitive data
- `providers.json` is gitignored by default
- Store secrets securely (secrets manager, private overlays)

## Related Documentation

- [Providers and API Keys](PROVIDERS_AND_API_KEYS.md) - Detailed provider configuration
- [Testing](../TESTING.md) - Configuration testing
- [API Reference](../api-reference/PROXY_API.md) - HTTP API documentation