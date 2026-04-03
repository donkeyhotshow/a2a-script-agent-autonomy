"""
OpenAI-Compatible Provider Implementation

Provider for OpenAI-compatible APIs (OpenRouter, Groq, Cohere, etc.).
"""

import aiohttp
import json
import time
from typing import Any, Dict, List, Optional

from .base import (
    LLMProvider,
    ProviderConfig,
    ProviderStatus,
    GenerationResult,
    ChatMessage,
    EmbeddingResult,
)
from .http_utils import aiohttp_llm_timeout


class OpenAICompatibleProvider(LLMProvider):
    """
    Provider for OpenAI-compatible APIs.
    
    Works with:
    - OpenRouter (openrouter.ai)
    - Groq (groq.com)
    - Cohere (cohere.com)
    - Any OpenAI-compatible endpoint
    """
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.url.rstrip('/')
        self.api_key = config.get_api_key()
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Provider-specific headers
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        # Add provider-specific headers
        if "openrouter" in self.base_url:
            self.headers["HTTP-Referer"] = "https://a2a-ai-hub.local"
            self.headers["X-Title"] = "A2A AI Hub"
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp_llm_timeout(self.config.timeout),
                headers=self.headers
            )
        return self.session
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Generate text using chat completions API (converts prompt to chat format).
        """
        # Convert generate request to chat format
        messages = [ChatMessage(role="user", content=prompt)]
        return await self.chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    
    async def chat(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Chat completion using OpenAI-compatible /chat/completions endpoint.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Convert messages to OpenAI format
        openai_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        payload: Dict[str, Any] = {
            "model": resolved_model,
            "messages": openai_messages,
            "temperature": temperature,
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        # Add optional parameters
        for key in ["top_p", "frequency_penalty", "presence_penalty", "stop", "stream"]:
            if key in kwargs:
                payload[key] = kwargs[key]
        
        session = await self._get_session()
        
        try:
            await self._check_rate_limit()
            await self._check_request_delay()
            
            async with session.post(
                f"{self.base_url}/chat/completions",
                json=payload
            ) as response:
                response.raise_for_status()
                data = await response.json()
                
                latency_ms = (time.time() - start_time) * 1000
                await self._track_request(success=True)
                
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                usage = data.get("usage", {})
                
                return GenerationResult(
                    text=message.get("content", ""),
                    model=resolved_model,
                    provider=self.name,
                    usage=usage,
                    metadata={
                        "finish_reason": choice.get("finish_reason"),
                        "id": data.get("id"),
                        "created": data.get("created"),
                    },
                    latency_ms=latency_ms,
                )
        except Exception as e:
            await self._track_request(success=False)
            raise
    
    async def embeddings(
        self,
        texts: str | List[str],
        model: str,
        **kwargs
    ) -> EmbeddingResult:
        """
        Generate embeddings using OpenAI-compatible /embeddings endpoint.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Handle single text
        if isinstance(texts, str):
            texts = [texts]
        
        payload = {
            "model": resolved_model,
            "input": texts,
        }
        
        session = await self._get_session()
        
        try:
            await self._check_rate_limit()
            await self._check_request_delay()
            
            async with session.post(
                f"{self.base_url}/embeddings",
                json=payload
            ) as response:
                response.raise_for_status()
                data = await response.json()
                
                latency_ms = (time.time() - start_time) * 1000
                await self._track_request(success=True)
                
                embeddings = [
                    item.get("embedding", [])
                    for item in data.get("data", [])
                ]
                
                return EmbeddingResult(
                    embeddings=embeddings,
                    model=resolved_model,
                    provider=self.name,
                    usage=data.get("usage", {}),
                )
        except Exception as e:
            await self._track_request(success=False)
            raise
    
    async def health_check(self) -> ProviderStatus:
        """
        Check provider health by querying models endpoint or making a test request.
        """
        if not self.api_key:
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY
        
        try:
            session = await self._get_session()
            
            # Try to list models (most OpenAI-compatible APIs support this)
            async with session.get(
                f"{self.base_url}/models",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    self._health_status = ProviderStatus.HEALTHY
                    self._last_health_check = time.time()
                    return ProviderStatus.HEALTHY
                elif response.status in [401, 403]:
                    # Auth error - provider is up but credentials are wrong
                    self._health_status = ProviderStatus.DEGRADED
                    return ProviderStatus.DEGRADED
                else:
                    self._health_status = ProviderStatus.UNHEALTHY
                    return ProviderStatus.UNHEALTHY
        except Exception as e:
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from the provider"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.base_url}/models") as response:
                response.raise_for_status()
                data = await response.json()
                return data.get("data", [])
        except Exception:
            return []
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get OpenAI-compatible provider capabilities"""
        caps = super().get_capabilities()
        caps["supports_streaming"] = True
        caps["api_version"] = "openai-v1"
        return caps


# Convenience classes for specific providers

class OpenRouterProvider(OpenAICompatibleProvider):
    """OpenRouter-specific provider with additional features"""
    
    def __init__(self, config: ProviderConfig):
        # Set default URL if not provided
        if not config.url or config.url == "${OPENROUTER_URL}":
            config.url = "https://openrouter.ai/api/v1"
        super().__init__(config)


class GroqProvider(OpenAICompatibleProvider):
    """Groq-specific provider with optimizations"""
    
    def __init__(self, config: ProviderConfig):
        # Set default URL if not provided
        if not config.url or config.url == "${GROQ_URL}":
            config.url = "https://api.groq.com/openai/v1"
        super().__init__(config)


class CohereProvider(OpenAICompatibleProvider):
    """Cohere-specific provider"""
    
    def __init__(self, config: ProviderConfig):
        # Set default URL if not provided
        if not config.url or config.url == "${COHERE_URL}":
            config.url = "https://api.cohere.ai/v1"
        super().__init__(config)


class ZAIProvider(OpenAICompatibleProvider):
    """Z.AI-specific provider"""
    
    def __init__(self, config: ProviderConfig):
        # Set default URL if not provided
        if not config.url or config.url.startswith("${Z_AI"):
            config.url = "https://api.z.ai/api/paas/v4/"
        super().__init__(config)

        # Z.AI specific headers or configurations can be added here
        # Override auth header for Z.AI
        if self.api_key:
            self.headers["API-Key"] = self.api_key
