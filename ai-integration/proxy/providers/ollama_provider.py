"""
Ollama Provider Implementation

Provider for local Ollama instance.
"""

import aiohttp
import json
import time
import asyncio
import logging
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

logger = logging.getLogger('ai-proxy.ollama')

# Connection states for provider
class ProviderConnectionState:
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


class OllamaProvider(LLMProvider):
    """
    Provider for Ollama local LLM server.
    
    Supports generate, chat, and embeddings endpoints.
    Includes resilience with exponential backoff retry on provider disconnect.
    """
    
    # Exponential backoff configuration
    MAX_RETRIES = 5
    BACKOFF_DELAYS = [1, 2, 4, 8, 16, 30]  # Max 30 seconds
    BACKOFF_MAX = 30
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
        self._connection_state = ProviderConnectionState.DISCONNECTED
        self._last_error: Optional[str] = None
        self._recovery_attempts = 0
        self._last_successful_request: Optional[float] = None
    
    @property
    def connection_state(self) -> str:
        """Get current connection state"""
        return self._connection_state
    
    @property
    def last_error(self) -> Optional[str]:
        """Get last error message"""
        return self._last_error
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> aiohttp.ClientResponse:
        """
        Make HTTP request with exponential backoff retry logic.
        
        On provider disconnect:
        - Logs each connection attempt
        - Implements exponential backoff: 1s→2s→4s→8s→16s→30s (max)
        - After exhausting retries (5 attempts), marks promise as failed
        - If connection recovered, marks as "recovered"
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional arguments passed to aiohttp request
            
        Returns:
            aiohttp.ClientResponse object
            
        Raises:
            aiohttp.ClientError: After exhausting all retry attempts
        """
        session = await self._get_session()
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Check rate limit and request delay
        await self._check_rate_limit()
        await self._check_request_delay()
        
        last_exception = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                # Log connection attempt
                delay = self.BACKOFF_DELAYS[min(attempt, len(self.BACKOFF_DELAYS) - 1)]
                
                if self._connection_state == ProviderConnectionState.RECONNECTING:
                    logger.info(
                        f"[OllamaProvider] Attempt {attempt + 1}/{self.MAX_RETRIES} to reconnect to {url} "
                        f"(delay={delay}s, last_error={self._last_error})"
                    )
                elif attempt > 0:
                    logger.info(
                        f"[OllamaProvider] Retry attempt {attempt + 1}/{self.MAX_RETRIES} for {url} "
                        f"(delay={delay}s)"
                    )
                
                # Execute request
                async with session.request(method, url, **kwargs) as response:
                    response.raise_for_status()
                    
                    # Successful connection
                    if self._connection_state != ProviderConnectionState.CONNECTED:
                        if self._connection_state == ProviderConnectionState.RECONNECTING:
                            logger.info(
                                f"[OllamaProvider] Connection recovered to {url} after "
                                f"{self._recovery_attempts} attempts"
                            )
                        else:
                            logger.info(f"[OllamaProvider] Connected to {url}")
                        
                        self._connection_state = ProviderConnectionState.CONNECTED
                        self._recovery_attempts = 0
                    
                    self._last_successful_request = time.time()
                    self._last_error = None
                    return response
                    
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                last_exception = e
                self._last_error = str(e)
                
                # Set connection state
                if self._connection_state == ProviderConnectionState.CONNECTED:
                    logger.warning(
                        f"[OllamaProvider] Provider disconnected: {url} - {e}"
                    )
                    self._connection_state = ProviderConnectionState.RECONNECTING
                    self._recovery_attempts = 1
                else:
                    self._recovery_attempts += 1
                
                # Check if we should retry
                if attempt < self.MAX_RETRIES - 1:
                    logger.info(
                        f"[OllamaProvider] Connection attempt {attempt + 1} failed, "
                        f"waiting {delay}s before retry..."
                    )
                    await asyncio.sleep(delay)
                else:
                    # Exhausted all retries
                    logger.error(
                        f"[OllamaProvider] Failed to connect after {self.MAX_RETRIES} attempts: {url}"
                    )
                    self._connection_state = ProviderConnectionState.FAILED
        
        # All retries exhausted - raise the last exception
        raise last_exception
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp_llm_timeout(self.config.timeout)
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
        Generate text using Ollama's /api/generate endpoint.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        payload = {
            "model": resolved_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        # Add any additional options
        for key, value in kwargs.items():
            if key not in payload["options"]:
                payload["options"][key] = value
        
        try:
            response = await self._make_request(
                "POST",
                "/api/generate",
                json=payload
            )
            data = await response.json()
            
            latency_ms = (time.time() - start_time) * 1000
            await self._track_request(success=True)
            
            return GenerationResult(
                text=data.get("response", ""),
                model=resolved_model,
                provider=self.name,
                usage=data.get("usage", {}),
                metadata={
                    "done": data.get("done", False),
                    "total_duration": data.get("total_duration"),
                    "load_duration": data.get("load_duration"),
                    "prompt_eval_count": data.get("prompt_eval_count"),
                    "eval_count": data.get("eval_count"),
                },
                latency_ms=latency_ms,
            )
        except Exception as e:
            await self._track_request(success=False)
            raise
    
    async def chat(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Chat completion using Ollama's /api/chat endpoint.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Convert messages to Ollama format
        ollama_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        payload = {
            "model": resolved_model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        try:
            response = await self._make_request(
                "POST",
                "/api/chat",
                json=payload
            )
            data = await response.json()
            
            latency_ms = (time.time() - start_time) * 1000
            await self._track_request(success=True)
            
            message = data.get("message", {})
            return GenerationResult(
                text=message.get("content", ""),
                model=resolved_model,
                provider=self.name,
                usage=data.get("usage", {}),
                metadata={
                    "done": data.get("done", False),
                    "role": message.get("role"),
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
        Generate embeddings using Ollama's /api/embeddings endpoint.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Handle single text
        if isinstance(texts, str):
            texts = [texts]
        
        embeddings = []
        
        try:
            for text in texts:
                payload = {
                    "model": resolved_model,
                    "prompt": text,
                }
                
                response = await self._make_request(
                    "POST",
                    "/api/embeddings",
                    json=payload
                )
                data = await response.json()
                embeddings.append(data.get("embedding", []))
            
            latency_ms = (time.time() - start_time) * 1000
            await self._track_request(success=True)
            
            return EmbeddingResult(
                embeddings=embeddings,
                model=resolved_model,
                provider=self.name,
                usage={"prompt_tokens": sum(len(t.split()) for t in texts)},
            )
        except Exception as e:
            await self._track_request(success=False)
            raise
    
    async def health_check(self) -> ProviderStatus:
        """
        Check Ollama health by querying the tags endpoint.
        Uses the resilience logic for connection handling.
        """
        try:
            response = await self._make_request(
                "GET",
                "/api/tags",
                timeout=aiohttp.ClientTimeout(total=5)
            )
            data = await response.json()
            available_models = [m.get("name") for m in data.get("models", [])]
            
            # Update config with available models
            self.config.models = list(set(self.config.models + available_models))
            
            self._health_status = ProviderStatus.HEALTHY
            self._last_health_check = time.time()
            return ProviderStatus.HEALTHY
        except Exception as e:
            logger.warning("Ollama health_check failed: %s", e, exc_info=True)
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from Ollama"""
        try:
            response = await self._make_request("GET", "/api/tags")
            data = await response.json()
            return data.get("models", [])
        except Exception as e:
            logger.warning("list_models failed for Ollama: %s", e, exc_info=True)
            return []
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get Ollama provider capabilities"""
        caps = super().get_capabilities()
        caps["supports_streaming"] = True  # Ollama supports streaming
        caps["local"] = True
        caps["api_version"] = "ollama"
        return caps
