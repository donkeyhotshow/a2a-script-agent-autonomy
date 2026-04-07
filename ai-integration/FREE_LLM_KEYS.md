# Free LLM API Keys — Complete List

## AI Integration (this repo)

1. Copy the **`.env format`** block below into `ai-integration/.env` (or export vars in your shell).
2. Ensure `config/providers.json` exists (`python scripts/ensure-providers-config.py` copies from `config/providers.example.json` once).
3. Merge any missing **`providers`** / **`api_keys`** entries from `config/providers.example.json` into your `providers.json`, then set `"enabled": true` for backends you want in `/api/tags` and routing.
4. Restart the proxy (e.g. repo root `start-all.bat`). Keys in `${VAR}` form are resolved from the environment when the JSON is loaded.

**Security:** keys committed or pasted in docs should be treated as leaked — rotate them at the provider.

## Working Keys (Tested)

### 1. Qwen / Alibaba
```
API_KEY=sk-71a6a894c1d04717a8cec0681752a164
BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
MODEL=qwen-turbo
```
```powershell
(Invoke-RestMethod -Uri "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer sk-71a6a894c1d04717a8cec0681752a164";"Content-Type"="application/json"} -Body '{"model":"qwen-turbo","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 2. Groq
```
API_KEY=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
BASE_URL=https://api.groq.com/openai/v1
MODEL=llama-3.1-8b-instant
```
```powershell
(Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer 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";"Content-Type"="application/json"} -Body '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 3. OpenRouter
```
API_KEY=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
BASE_URL=https://openrouter.ai/api/v1
MODEL=openrouter/auto
```
```powershell
(Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer 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";"Content-Type"="application/json"} -Body '{"model":"openrouter/auto","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 4. Z.ai / GLM
```
API_KEY=b97a7c5004e04c9b931e79a5efff859f.nrkEXF005xU4T9Br
BASE_URL=https://api.z.ai/api/paas/v4/
MODEL=glm-4.7-flash
```
```powershell
(Invoke-RestMethod -Uri "https://api.z.ai/api/paas/v4/chat/completions" -Method POST -Headers @{"Authorization"="Bearer b97a7c5004e04c9b931e79a5efff859f.nrkEXF005xU4T9Br";"Content-Type"="application/json"} -Body '{"model":"glm-4.7-flash","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 5. Mistral (Codestral)
```
API_KEY=PiesFLjffjwZofEftjgzLcVbNlgv94Tr
BASE_URL=https://codestral.mistral.ai/v1
MODEL=codestral-latest
```
```powershell
(Invoke-RestMethod -Uri "https://codestral.mistral.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer PiesFLjffjwZofEftjgzLcVbNlgv94Tr";"Content-Type"="application/json"} -Body '{"model":"codestral-latest","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 6. Together AI
```
API_KEY=key_CZfYhdJjK9NXPBkQEynTe
BASE_URL=https://api.together.ai/v1
MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
```
```powershell
(Invoke-RestMethod -Uri "https://api.together.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer key_CZfYhdJjK9NXPBkQEynTe";"Content-Type"="application/json"} -Body '{"model":"meta-llama/Llama-3.3-70B-Instruct-Turbo","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 7. Cerebras
```
API_KEY=csk-dhfryj8rcdr656mvdkptdv29j5cmjpd5d9yh8yx8j8jcrknp
BASE_URL=https://api.cerebras.ai/v1
MODEL=llama-3.3-70b
```
```powershell
(Invoke-RestMethod -Uri "https://api.cerebras.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer csk-dhfryj8rcdr656mvdkptdv29j5cmjpd5d9yh8yx8j8jcrknp";"Content-Type"="application/json"} -Body '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content
```

### 8. Cohere
```
API_KEY=WnFNt5UQK39iRBhjWNUdBTJZlhLM0HR3ifc0ESQa
BASE_URL=https://api.cohere.ai/v2
MODEL=command-a-03-2025
```
```powershell
(Invoke-RestMethod -Uri "https://api.cohere.ai/v2/chat" -Method POST -Headers @{"Authorization"="Bearer WnFNt5UQK39iRBhjWNUdBTJZlhLM0HR3ifc0ESQa";"Content-Type"="application/json"} -Body '{"model":"command-a-03-2025","messages":[{"role":"user","content":"ping"}]}').message.content[0].text
```

---

## .env format

```env
# Qwen
QWEN_API_KEY=sk-71a6a894c1d04717a8cec0681752a164
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo

# Groq
GROQ_API_KEY=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
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.1-8b-instant

# OpenRouter
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openrouter/auto

# Z.ai / GLM
ZAI_API_KEY=b97a7c5004e04c9b931e79a5efff859f.nrkEXF005xU4T9Br
ZAI_BASE_URL=https://api.z.ai/api/paas/v4/
ZAI_MODEL=glm-4.7-flash

# Mistral / Codestral
MISTRAL_API_KEY=PiesFLjffjwZofEftjgzLcVbNlgv94Tr
MISTRAL_BASE_URL=https://codestral.mistral.ai/v1
MISTRAL_MODEL=codestral-latest

# Together AI
TOGETHER_API_KEY=key_CZfYhdJjK9NXPBkQEynTe
TOGETHER_BASE_URL=https://api.together.ai/v1
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo

# Cerebras
CEREBRAS_API_KEY=csk-dhfryj8rcdr656mvdkptdv29j5cmjpd5d9yh8yx8j8jcrknp
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODEL=llama-3.3-70b

# Cohere
COHERE_API_KEY=WnFNt5UQK39iRBhjWNUdBTJZlhLM0HR3ifc0ESQa
COHERE_BASE_URL=https://api.cohere.ai/v2
COHERE_MODEL=command-a-03-2025

# HuggingFace (not working)
# HF_API_KEY=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
# HF_BASE_URL=https://router.huggingface.co/v1
# HF_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
```

---

## Best Models by Use Case

| Use Case | Model | Provider |
|----------|-------|----------|
| Code (fast) | llama-3.1-8b-instant | Groq |
| Code (quality) | qwen/qwen3-coder-480b-a35b-instruct:free | OpenRouter |
| Thinking/Reasoning | deepseek-r1-distill-llama-70b | Groq |
| General | openrouter/auto | OpenRouter |
| Ultra fast | llama-3.3-70b | Cerebras |