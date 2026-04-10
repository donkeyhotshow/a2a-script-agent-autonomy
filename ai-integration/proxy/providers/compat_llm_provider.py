"""
Compat LLM provider — HTTP client for local /api/generate, /api/chat, /api/embeddings.
"""

import aiohttp
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

logger = logging.getLogger('ai-proxy.compat_llm')

# Connection states for provider
class ProviderConnectionState:
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


class CompatLlmProvider(LLMProvider):
    """
    Provider for a local HTTP LLM server exposing /api/generate, /api/chat, /api/embeddings.
    Includes resilience with exponential backoff retry on provider disconnect.
    """

    MAX_RETRIES = 5
    BACKOFF_DELAYS = [1, 2, 4, 8, 16, 30]
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
        return self._connection_state

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> aiohttp.ClientResponse:
        session = await self._get_session()
        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        await self._check_rate_limit()
        await self._check_request_delay()

        last_exception = None

        for attempt in range(self.MAX_RETRIES):
            try:
                delay = self.BACKOFF_DELAYS[min(attempt, len(self.BACKOFF_DELAYS) - 1)]

                if self._connection_state == ProviderConnectionState.RECONNECTING:
                    logger.info(
                        "[CompatLlmProvider] Attempt %s/%s to reconnect to %s (delay=%ss, last_error=%s)",
                        attempt + 1, self.MAX_RETRIES, url, delay, self._last_error,
                    )
                elif attempt > 0:
                    logger.info(
                        "[CompatLlmProvider] Retry attempt %s/%s for %s (delay=%ss)",
                        attempt + 1, self.MAX_RETRIES, url, delay,
                    )

                async with session.request(method, url, **kwargs) as response:
                    response.raise_for_status()

                    if self._connection_state != ProviderConnectionState.CONNECTED:
                        if self._connection_state == ProviderConnectionState.RECONNECTING:
                            logger.info(
                                "[CompatLlmProvider] Connection recovered to %s after %s attempts",
                                url, self._recovery_attempts,
                            )
                        else:
                            logger.info("[CompatLlmProvider] Connected to %s", url)

                        self._connection_state = ProviderConnectionState.CONNECTED
                        self._recovery_attempts = 0

                    self._last_successful_request = time.time()
                    self._last_error = None
                    return response

            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                last_exception = e
                self._last_error = str(e)

                if self._connection_state == ProviderConnectionState.CONNECTED:
                    logger.warning("[CompatLlmProvider] Provider disconnected: %s - %s", url, e)
                    self._connection_state = ProviderConnectionState.RECONNECTING
                    self._recovery_attempts = 1
                else:
                    self._recovery_attempts += 1

                if attempt < self.MAX_RETRIES - 1:
                    logger.info(
                        "[CompatLlmProvider] Connection attempt %s failed, waiting %ss before retry...",
                        attempt + 1, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "[CompatLlmProvider] Failed to connect after %s attempts: %s",
                        self.MAX_RETRIES, url,
                    )
                    self._connection_state = ProviderConnectionState.FAILED

        raise last_exception

    async def _get_session(self) -> aiohttp.ClientSession:
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
        except Exception:
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
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model

        chat_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        payload = {
            "model": resolved_model,
            "messages": chat_messages,
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
        except Exception:
            await self._track_request(success=False)
            raise

    async def embeddings(
        self,
        texts: str | List[str],
        model: str,
        **kwargs
    ) -> EmbeddingResult:
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model

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
        except Exception:
            await self._track_request(success=False)
            raise

    async def health_check(self) -> ProviderStatus:
        try:
            response = await self._make_request(
                "GET",
                "/api/tags",
                timeout=aiohttp.ClientTimeout(total=5)
            )
            data = await response.json()
            available_models = [m.get("name") for m in data.get("models", [])]

            self.config.models = list(set(self.config.models + available_models))

            self._health_status = ProviderStatus.HEALTHY
            self._last_health_check = time.time()
            return ProviderStatus.HEALTHY
        except Exception as e:
            logger.warning("Compat LLM health_check failed: %s", e, exc_info=True)
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            response = await self._make_request("GET", "/api/tags")
            data = await response.json()
            return data.get("models", [])
        except Exception as e:
            logger.warning("list_models failed: %s", e, exc_info=True)
            return []

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    def get_capabilities(self) -> Dict[str, Any]:
        caps = super().get_capabilities()
        caps["supports_streaming"] = True
        caps["local"] = True
        caps["api_version"] = "compat-llm"
        return caps
