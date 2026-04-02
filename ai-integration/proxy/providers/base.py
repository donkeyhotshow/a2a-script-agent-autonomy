"""
Base LLM Provider Interface

Abstract base class for all LLM providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union, AsyncIterator
from enum import Enum
import asyncio
import time


class ProviderStatus(Enum):
    """Provider health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    DISABLED = "disabled"
    UNKNOWN = "unknown"


@dataclass
class ProviderConfig:
    """Configuration for an LLM provider"""
    name: str
    type: str  # 'ollama', 'openai', 'huggingface'
    url: str
    enabled: bool = True
    priority: int = 1
    api_key: Optional[str] = None
    models: List[str] = field(default_factory=list)
    fallback_models: Dict[str, str] = field(default_factory=dict)
    timeout: int = 0  # 0 = no aiohttp total limit on LLM requests
    max_retries: int = 3
    retry_delay: float = 1.0
    rate_limit_rpm: Optional[int] = None  # Requests per minute
    
    def get_api_key(self) -> Optional[str]:
        """Get API key, resolving environment variable references"""
        if self.api_key and self.api_key.startswith('${') and self.api_key.endswith('}'):
            import os
            env_var = self.api_key[2:-1]
            return os.environ.get(env_var)
        return self.api_key


@dataclass
class GenerationResult:
    """Result from a generation request"""
    text: str
    model: str
    provider: str
    usage: Dict[str, int] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    latency_ms: float = 0.0


@dataclass
class ChatMessage:
    """Chat message for chat completions"""
    role: str  # 'system', 'user', 'assistant'
    content: str


@dataclass
class EmbeddingResult:
    """Result from an embedding request"""
    embeddings: List[List[float]]
    model: str
    provider: str
    usage: Dict[str, int] = field(default_factory=dict)


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    All providers must implement this interface for compatibility with the router.
    """
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.name = config.name
        self._last_health_check: Optional[float] = None
        self._health_status = ProviderStatus.UNKNOWN
        self._request_count = 0
        self._error_count = 0
        self._lock = asyncio.Lock()
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Generate text from a prompt.
        
        Args:
            prompt: The input prompt
            model: Model name to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Returns:
            GenerationResult with generated text and metadata
        """
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Chat completion with message history.
        
        Args:
            messages: List of chat messages
            model: Model name to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Returns:
            GenerationResult with assistant's response
        """
        pass
    
    @abstractmethod
    async def embeddings(
        self,
        texts: Union[str, List[str]],
        model: str,
        **kwargs
    ) -> EmbeddingResult:
        """
        Generate embeddings for text(s).
        
        Args:
            texts: Text or list of texts to embed
            model: Embedding model name
            **kwargs: Additional provider-specific parameters
            
        Returns:
            EmbeddingResult with embedding vectors
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> ProviderStatus:
        """
        Check provider health status.
        
        Returns:
            ProviderStatus enum value
        """
        pass
    
    def supports_model(self, model: str) -> bool:
        """
        Check if provider supports a specific model.
        
        Args:
            model: Model name to check
            
        Returns:
            True if model is supported
        """
        # Check direct model support
        if model in self.config.models:
            return True
        # Check fallback model mapping
        if model in self.config.fallback_models:
            return True
        return False
    
    def resolve_model(self, model: str) -> Optional[str]:
        """
        Resolve a model name to the provider's equivalent.
        
        Args:
            model: Requested model name
            
        Returns:
            Provider-specific model name or None if not supported
        """
        if model in self.config.models:
            return model
        if model in self.config.fallback_models:
            return self.config.fallback_models[model]
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get provider status information"""
        status = {
            "name": self.name,
            "type": self.config.type,
            "enabled": self.config.enabled,
            "priority": self.config.priority,
            "health": self._health_status.value,
            "last_health_check": self._last_health_check,
            "request_count": self._request_count,
            "error_count": self._error_count,
            "models": self.config.models,
            "supports_fallback": bool(self.config.fallback_models),
        }
        
        # Add connection state if provider has it (for OllamaProvider)
        if hasattr(self, 'connection_state'):
            status["connection_state"] = self.connection_state
            status["last_error"] = self.last_error
        
        return status
    
    async def _track_request(self, success: bool = True):
        """Track request metrics"""
        async with self._lock:
            self._request_count += 1
            if not success:
                self._error_count += 1
    
    async def _with_retry(self, operation, *args, **kwargs):
        """Execute operation with retry logic"""
        last_exception = None
        for attempt in range(self.config.max_retries):
            try:
                return await operation(*args, **kwargs)
            except Exception as e:
                last_exception = e
                await self._track_request(success=False)
                if attempt < self.config.max_retries - 1:
                    delay = self.config.retry_delay * (2 ** attempt)  # Exponential backoff
                    await asyncio.sleep(delay)
        raise last_exception
