# Provider Parameters and Fallback Mechanisms

## Overview

The AI Integration proxy supports multiple LLM providers with sophisticated configuration and automatic fallback mechanisms. This document covers provider setup, parameters, routing logic, and failover strategies.

## Provider Architecture

### Provider Types

#### 1. Local LLM Upstream (`compat_llm`)

**Purpose**: Interface to local LLM servers (Ollama, LM Studio, etc.)

**Configuration:**
```json
{
  "type": "compat_llm",
  "url": "${LOCAL_LLM_UPSTREAM_URL:-http://localhost:11435}",
  "enabled": false,
  "priority": 1,
  "models": ["qwen3:8b"],
  "timeout": 0,
  "max_retries": 3
}
```

**Special Features:**
- No API key required (uses `__LOCAL_LLM_KEY_PLACEHOLDER__`)
- Direct HTTP proxy to local server
- Automatic startup via `LOCAL_LLM_AUTO_START`

#### 2. Z.AI (`z_ai`)

**Purpose**: Primary cloud provider with advanced features

**Configuration:**
```json
{
  "type": "z_ai",
  "url": "${Z_AI_BASE_URL:-https://api.z.ai/api/paas/v4/}",
  "api_key": "${Z_AI_API_KEY:-}",
  "enabled": true,
  "priority": 1,
  "models": ["${Z_AI_MODEL:-glm-4.7-flash}"],
  "fallback_models": {
    "qwen3:8b": "glm-4.7-flash"
  },
  "timeout": 0,
  "max_retries": 2,
  "request_delay_seconds": 10.0
}
```

**Features:**
- Rate limit handling with delays
- Model mapping for compatibility
- Primary provider in fallback chain

#### 3. OpenAI-Compatible Providers

**Supported Types:** `openai` (covers OpenRouter, Groq, Together, Cerebras, etc.)

**Common Configuration Pattern:**
```json
{
  "type": "openai",
  "url": "https://api.provider.com/v1",
  "api_key": "${PROVIDER_API_KEY:-}",
  "enabled": false,
  "priority": 2,
  "models": ["model-name"],
  "fallback_models": {
    "qwen3:8b": "provider-model"
  },
  "timeout": 0,
  "max_retries": 2
}
```

### Provider-Specific Parameters

#### OpenRouter
- **URL**: `https://openrouter.ai/api/v1`
- **Models**: 100+ models from various providers
- **Features**: Auto-routing, cost optimization
- **Rate Limits**: Per-provider limits apply

#### Groq
- **URL**: `https://api.groq.com/openai/v1`
- **Models**: `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
- **Features**: Fast inference, low latency
- **Rate Limits**: Generous limits, good for high volume

#### Together AI
- **URL**: `https://api.together.ai/v1`
- **Models**: `meta-llama/Llama-3.3-70B-Instruct-Turbo`
- **Features**: Community models, competitive pricing

#### Cerebras
- **URL**: `https://api.cerebras.ai/v1`
- **Models**: `llama-3.3-70b`
- **Features**: High-performance inference

#### Cohere
- **URL**: `https://api.cohere.ai/v1`
- **Models**: `command-r`, `command-r-plus`
- **Features**: Command-focused models

#### Qwen (DashScope)
- **URL**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- **Models**: `qwen-turbo`, `qwen-plus`
- **Features**: Alibaba's Qwen models

#### Mistral Codestral
- **URL**: `https://codestral.mistral.ai/v1`
- **Models**: `codestral-latest`
- **Features**: Code-focused generation

#### HuggingFace
- **URL**: `https://api-inference.huggingface.co`
- **API Key**: HuggingFace token
- **Features**: Open-source models
- **Limitations**: Rate limits, model availability

## Configuration Management

### Environment Variables

**Provider API Keys:**
```bash
# Primary providers
Z_AI_API_KEY=your_z_ai_key
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key

# Secondary providers
TOGETHER_API_KEY=your_together_key
CEREBRAS_API_KEY=your_cerebras_key
COHERE_API_KEY=your_cohere_key
QWEN_API_KEY=your_qwen_key
MISTRAL_API_KEY=your_mistral_key
HF_TOKEN=your_huggingface_token
```

**Provider URLs:**
```bash
Z_AI_BASE_URL=https://api.z.ai/api/paas/v4/
GROQ_BASE_URL=https://api.groq.com/openai/v1
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Provider JSON Structure

#### API Keys Pool
```json
{
  "api_keys": [
    {
      "id": "provider-primary",
      "provider": "provider_name",
      "secret": "${ENV_VAR}",
      "enabled": true,
      "priority": 1
    },
    {
      "id": "provider-secondary",
      "provider": "provider_name",
      "secret": "fallback_key",
      "enabled": true,
      "priority": 2
    }
  ]
}
```

#### Providers Configuration
```json
{
  "providers": {
    "provider_name": {
      "type": "openai",
      "url": "https://api.provider.com/v1",
      "enabled": true,
      "priority": 1,
      "models": ["model1", "model2"],
      "timeout": 30,
      "max_retries": 2
    }
  }
}
```

## Routing and Model Resolution

### Model Matching Logic

1. **Exact Match**: Request model matches provider model list
2. **Fallback Mapping**: Use `fallback_models` mapping
3. **Default Provider**: Use `default_provider` if no match

**Example Fallback Mapping:**
```json
{
  "fallback_models": {
    "qwen3:8b": "meta-llama/llama-3-8b-instruct",
    "mistral": "mistralai/mistral-7b-instruct"
  }
}
```

### Provider Priority

- **Lower number = higher priority**
- `priority: 1` tried first
- Automatic fallback on failure

**Default Fallback Chain:**
```
z_ai (1) → groq (2) → openrouter (3) → qwen_dashscope (4)
→ mistral_codestral (5) → together (6) → cerebras (7)
→ cohere (8) → huggingface (9) → compat_llm (10)
```

## Fallback Mechanisms

### Rate Limit Handling

**Detection Patterns:**
- HTTP 429 status
- `error.code == 1302` (Z.AI specific)
- Rate limit error messages

**Response:**
- Switch to next API key in pool (same provider)
- If all keys exhausted, fallback to next provider
- Add request delays for rate-limited providers

### Timeout and Retry Logic

**Configuration:**
- `timeout`: Request timeout (0 = use provider default)
- `max_retries`: Number of retry attempts
- `request_delay_seconds`: Delay between requests (Z.AI specific)

**Retry Strategy:**
- Exponential backoff
- Provider-specific delays
- Circuit breaker pattern

### Error Classification

**Retryable Errors:**
- Network timeouts
- 5xx server errors
- Rate limiting (with delay)

**Non-Retryable Errors:**
- 4xx client errors (except 429)
- Authentication failures
- Invalid requests

## Monitoring and Debugging

### Provider Health Checks

**Per-Provider Status:**
- API key validity
- Rate limit status
- Service availability
- Response latency

**Metrics Collection:**
- Request success/failure rates
- Latency percentiles
- Error classification
- Provider utilization

### Debugging Tools

**Request Logging:**
- Routing decisions in `routing.json`
- API key usage tracking
- Fallback events logging

**Health Endpoints:**
- `GET /health` - Overall proxy health
- `GET /health/compat_llm` - Local LLM upstream status
- Provider-specific health checks

## Best Practices

### Configuration

1. **Start with Z.AI**: Most reliable primary provider
2. **Add 2-3 fallbacks**: Groq + OpenRouter for coverage
3. **Monitor usage**: Track costs and performance
4. **Regular key rotation**: Prevent rate limit issues

### Security

1. **Environment variables**: Never commit real keys
2. **Key rotation**: Regular key updates
3. **Access control**: Restrict API key access
4. **Audit logging**: Track key usage

### Performance

1. **Local first**: Use `compat_llm` for development
2. **Fast fallbacks**: Groq for low-latency needs
3. **Cost optimization**: OpenRouter for budget-conscious usage
4. **Load balancing**: Distribute across multiple keys

## Troubleshooting

### Common Issues

**"Provider not available"**
- Check API key validity
- Verify provider service status
- Review network connectivity

**"Rate limit exceeded"**
- Add more API keys to pool
- Increase request delays
- Switch to different provider

**"Model not found"**
- Check `fallback_models` mapping
- Add model to provider configuration
- Use different model name

**"Timeout errors"**
- Increase `timeout` values
- Check network latency
- Reduce concurrent requests

### Diagnostic Commands

```bash
# Test provider configuration
python debug_config.py

# Check routing decisions
curl -X POST http://localhost:11434/api/tags -d '{"model": "qwen3:8b"}'

# Monitor promise queue
curl http://localhost:11434/promises/pending

# Check health status
curl http://localhost:11434/health
```