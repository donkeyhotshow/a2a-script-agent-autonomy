"""
HuggingFace Inference API Provider

Provider for HuggingFace Inference API.
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


class HuggingFaceProvider(LLMProvider):
    """
    Provider for HuggingFace Inference API.
    
    Uses the inference API at https://api-inference.huggingface.co
    """
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = config.url.rstrip('/') if config.url else "https://api-inference.huggingface.co"
        self.api_key = config.get_api_key()
        self.session: Optional[aiohttp.ClientSession] = None
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.config.timeout),
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
        Generate text using HuggingFace Inference API.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Ensure model is in format: username/model-name
        if "/" not in resolved_model:
            # Try common prefixes
            resolved_model = f"meta-llama/{resolved_model}"
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "return_full_text": False,
            }
        }
        
        if max_tokens:
            payload["parameters"]["max_new_tokens"] = max_tokens
        
        # Add optional parameters
        if "top_p" in kwargs:
            payload["parameters"]["top_p"] = kwargs["top_p"]
        if "top_k" in kwargs:
            payload["parameters"]["top_k"] = kwargs["top_k"]
        if "repetition_penalty" in kwargs:
            payload["parameters"]["repetition_penalty"] = kwargs["repetition_penalty"]
        
        session = await self._get_session()
        
        try:
            async with session.post(
                f"{self.base_url}/models/{resolved_model}",
                json=payload
            ) as response:
                response.raise_for_status()
                data = await response.json()
                
                latency_ms = (time.time() - start_time) * 1000
                await self._track_request(success=True)
                
                # Handle different response formats
                generated_text = ""
                if isinstance(data, list) and len(data) > 0:
                    generated_text = data[0].get("generated_text", "")
                elif isinstance(data, dict):
                    generated_text = data.get("generated_text", "")
                
                return GenerationResult(
                    text=generated_text,
                    model=resolved_model,
                    provider=self.name,
                    usage={},  # HF doesn't provide usage stats
                    metadata={},
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
        Chat completion using HuggingFace's conversational models.
        
        Converts messages to a prompt format and uses generate.
        """
        # Convert messages to a single prompt
        prompt_parts = []
        for msg in messages:
            if msg.role == "system":
                prompt_parts.append(f"System: {msg.content}")
            elif msg.role == "user":
                prompt_parts.append(f"User: {msg.content}")
            elif msg.role == "assistant":
                prompt_parts.append(f"Assistant: {msg.content}")
        
        prompt_parts.append("Assistant:")
        prompt = "\n".join(prompt_parts)
        
        result = await self.generate(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        return result
    
    async def embeddings(
        self,
        texts: str | List[str],
        model: str,
        **kwargs
    ) -> EmbeddingResult:
        """
        Generate embeddings using HuggingFace Inference API.
        """
        start_time = time.time()
        resolved_model = self.resolve_model(model) or model
        
        # Ensure model is in format: username/model-name
        if "/" not in resolved_model:
            resolved_model = f"sentence-transformers/{resolved_model}"
        
        # Handle single text
        if isinstance(texts, str):
            texts = [texts]
        
        session = await self._get_session()
        
        try:
            embeddings = []
            for text in texts:
                payload = {"inputs": text}
                
                async with session.post(
                    f"{self.base_url}/models/{resolved_model}",
                    json=payload
                ) as response:
                    response.raise_for_status()
                    data = await response.json()
                    
                    # Handle different response formats
                    if isinstance(data, list):
                        embeddings.append(data)
                    elif isinstance(data, dict):
                        embeddings.append(data.get("embedding", []))
            
            latency_ms = (time.time() - start_time) * 1000
            await self._track_request(success=True)
            
            return EmbeddingResult(
                embeddings=embeddings,
                model=resolved_model,
                provider=self.name,
                usage={},
            )
        except Exception as e:
            await self._track_request(success=False)
            raise
    
    async def health_check(self) -> ProviderStatus:
        """
        Check HuggingFace API health.
        """
        if not self.api_key:
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY
        
        try:
            session = await self._get_session()
            async with session.get(
                "https://huggingface.co/api/whoami",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    self._health_status = ProviderStatus.HEALTHY
                    self._last_health_check = time.time()
                    return ProviderStatus.HEALTHY
                elif response.status in [401, 403]:
                    self._health_status = ProviderStatus.DEGRADED
                    return ProviderStatus.DEGRADED
                else:
                    self._health_status = ProviderStatus.UNHEALTHY
                    return ProviderStatus.UNHEALTHY
        except Exception as e:
            self._health_status = ProviderStatus.UNHEALTHY
            return ProviderStatus.UNHEALTHY
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
