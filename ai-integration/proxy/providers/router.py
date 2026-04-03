"""
Provider Router

Routes requests to appropriate LLM providers with fallback support.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Type

from .base import (
    LLMProvider,
    ProviderConfig,
    ProviderStatus,
    GenerationResult,
    ChatMessage,
    EmbeddingResult,
)
from .ollama_provider import OllamaProvider
from .openai_compatible_provider import OpenAICompatibleProvider, OpenRouterProvider, GroqProvider, CohereProvider, ZAIProvider
from .huggingface_provider import HuggingFaceProvider
from .config_loader import load_providers_config, ProvidersConfig


# Provider type registry
PROVIDER_REGISTRY: Dict[str, Type[LLMProvider]] = {
    'ollama': OllamaProvider,
    'openai': OpenAICompatibleProvider,
    'openrouter': OpenRouterProvider,
    'groq': GroqProvider,
    'cohere': CohereProvider,
    'z_ai': ZAIProvider,
    'huggingface': HuggingFaceProvider,
}


class ProviderRouter:
    """
    Routes LLM requests to appropriate providers with fallback support.
    
    Features:
    - Automatic provider selection based on model availability
    - Fallback chain for reliability
    - Health checks and provider status tracking
    - Load balancing across providers
    """
    
    def __init__(self, config: Optional[ProvidersConfig] = None):
        self.config = config or load_providers_config()
        self._providers: Dict[str, LLMProvider] = {}
        self._initialized = False
        self._health_check_task: Optional[asyncio.Task] = None
        self._last_health_check: float = 0
    
    async def initialize(self):
        """Initialize all enabled providers"""
        if self._initialized:
            return
        
        for name, provider_config in self.config.providers.items():
            if provider_config.enabled:
                try:
                    provider = self._create_provider(provider_config)
                    if provider:
                        self._providers[name] = provider
                        # Run initial health check
                        await provider.health_check()
                except Exception as e:
                    print(f"Failed to initialize provider '{name}': {e}")
        
        self._initialized = True
    
    def _create_provider(self, config: ProviderConfig) -> Optional[LLMProvider]:
        """Create provider instance from config"""
        provider_class = PROVIDER_REGISTRY.get(config.type)
        if provider_class is None:
            print(f"Unknown provider type: {config.type}")
            return None
        return provider_class(config)
    
    async def close(self):
        """Close all provider connections"""
        for provider in self._providers.values():
            if hasattr(provider, 'close'):
                await provider.close()
        self._initialized = False
    
    def _resolve_model(self, model: str) -> str:
        """
        Resolve model name without destroying multi-provider selection.

        When Z.AI is default, only models that no registered provider claims
        are left unchanged (or mapped via the default provider's resolve_model).
        Ollama-local names like qwen3:8b must not be rewritten to the Z.AI default.
        """
        if not model or not str(model).strip():
            if not self._initialized:
                return (model or "").strip()
            return self._get_default_model()
        model = str(model).strip()
        if not self._initialized:
            return model
        for _name, provider in self._providers.items():
            if provider.supports_model(model):
                return model
        dp_name = self.config.default_provider
        if dp_name in self._providers:
            p = self._providers[dp_name]
            resolved = p.resolve_model(model)
            if resolved:
                return resolved
        return model

    def tag_entries_from_non_ollama_providers(self) -> list[dict[str, Any]]:
        """
        Ollama-shaped tag rows for models declared on non-Ollama providers (e.g. z_ai).
        Live Ollama /api/tags is merged separately in the proxy handler.
        """
        out: list[dict[str, Any]] = []
        if not self._initialized:
            return out
        for name, provider in self._providers.items():
            if provider.config.type == "ollama":
                continue
            if not provider.config.enabled:
                continue
            for m in provider.config.models:
                if not m or not str(m).strip():
                    continue
                mid = str(m).strip()
                out.append({
                    "name": mid,
                    "model": mid,
                    "modified_at": "",
                    "size": 0,
                    "digest": "",
                    "details": {},
                    "provider": name,
                })
        return out
    
    # ========================================================================
    # Core Routing Methods
    # ========================================================================
    
    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        preferred_provider: Optional[str] = None,
        enable_fallback: Optional[bool] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Generate text with automatic provider selection and fallback.
        
        Args:
            prompt: Input prompt
            model: Model name (uses default if not specified)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            preferred_provider: Preferred provider name
            enable_fallback: Whether to use fallback chain
            **kwargs: Additional parameters
            
        Returns:
            GenerationResult with generated text
        """
        if not self._initialized:
            await self.initialize()
        
        model = model or self._get_default_model()
        model = self._resolve_model(model)  # Apply model redirects
        enable_fallback = enable_fallback if enable_fallback is not None else self.config.enable_fallback
        
        # Get providers to try
        providers = self._get_provider_chain(model, preferred_provider, enable_fallback)
        
        if not providers:
            raise ProviderNotAvailableError(f"No provider available for model: {model}")
        
        # Try each provider in chain
        last_error = None
        for provider_name, provider in providers:
            try:
                result = await provider.generate(
                    prompt=prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                return result
            except Exception as e:
                last_error = e
                print(f"Provider '{provider_name}' failed: {e}")
                continue
        
        raise ProviderNotAvailableError(
            f"All providers failed for model '{model}'. Last error: {last_error}"
        )
    
    async def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        preferred_provider: Optional[str] = None,
        enable_fallback: Optional[bool] = None,
        **kwargs
    ) -> GenerationResult:
        """
        Chat completion with automatic provider selection and fallback.
        """
        if not self._initialized:
            await self.initialize()
        
        model = model or self._get_default_model()
        model = self._resolve_model(model)  # Apply model redirects
        enable_fallback = enable_fallback if enable_fallback is not None else self.config.enable_fallback
        
        providers = self._get_provider_chain(model, preferred_provider, enable_fallback)
        
        if not providers:
            raise ProviderNotAvailableError(f"No provider available for model: {model}")
        
        last_error = None
        for provider_name, provider in providers:
            try:
                result = await provider.chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                return result
            except Exception as e:
                last_error = e
                print(f"Provider '{provider_name}' failed: {e}")
                continue
        
        raise ProviderNotAvailableError(
            f"All providers failed for model '{model}'. Last error: {last_error}"
        )
    
    async def embeddings(
        self,
        texts: str | List[str],
        model: Optional[str] = None,
        preferred_provider: Optional[str] = None,
        enable_fallback: Optional[bool] = None,
        **kwargs
    ) -> EmbeddingResult:
        """
        Generate embeddings with automatic provider selection and fallback.
        """
        if not self._initialized:
            await self.initialize()
        
        # Use embedding-specific default model
        model = model or self._get_default_embedding_model()
        enable_fallback = enable_fallback if enable_fallback is not None else self.config.enable_fallback
        
        providers = self._get_provider_chain(model, preferred_provider, enable_fallback)
        
        if not providers:
            raise ProviderNotAvailableError(f"No provider available for model: {model}")
        
        last_error = None
        for provider_name, provider in providers:
            try:
                result = await provider.embeddings(
                    texts=texts,
                    model=model,
                    **kwargs
                )
                return result
            except Exception as e:
                last_error = e
                print(f"Provider '{provider_name}' failed: {e}")
                continue
        
        raise ProviderNotAvailableError(
            f"All providers failed for model '{model}'. Last error: {last_error}"
        )
    
    # ========================================================================
    # Provider Chain Logic
    # ========================================================================
    
    def _get_provider_chain(
        self,
        model: str,
        preferred_provider: Optional[str] = None,
        enable_fallback: bool = True
    ) -> List[tuple[str, LLMProvider]]:
        """
        Get ordered list of providers to try for a model.
        
        Returns:
            List of (provider_name, provider_instance) tuples
        """
        providers = []
        seen = set()
        
        # 1. Preferred provider
        if preferred_provider and preferred_provider in self._providers:
            provider = self._providers[preferred_provider]
            if provider.supports_model(model):
                providers.append((preferred_provider, provider))
                seen.add(preferred_provider)
        
        # 2. Providers from fallback chain that support the model
        if enable_fallback:
            for provider_name in self.config.get_fallback_chain():
                if provider_name in seen:
                    continue
                if provider_name in self._providers:
                    provider = self._providers[provider_name]
                    if provider.supports_model(model):
                        providers.append((provider_name, provider))
                        seen.add(provider_name)
        
        # 3. Any other provider that supports the model (sorted by priority)
        sorted_configs = sorted(
            self.config.providers.values(),
            key=lambda p: p.priority
        )
        for config in sorted_configs:
            if config.name in seen:
                continue
            if config.name in self._providers:
                provider = self._providers[config.name]
                if provider.supports_model(model):
                    providers.append((config.name, provider))
                    seen.add(config.name)
        
        return providers
    
    def _get_default_model(self) -> str:
        """Get default model from config"""
        # First, try default provider's first model
        default_provider = self.config.get_provider(self.config.default_provider)
        if default_provider and default_provider.models:
            return default_provider.models[0]
        
        # Fallback to first available model
        for provider in self._providers.values():
            if provider.config.models:
                return provider.config.models[0]
        
        return "qwen3:8b"  # Ultimate fallback
    
    def _get_default_embedding_model(self) -> str:
        """Get default embedding model"""
        # Common embedding models by provider
        embedding_models = {
            'ollama': 'nomic-embed-text',
            'openrouter': 'sentence-transformers/all-MiniLM-L6-v2',
        }
        
        for provider_name, model in embedding_models.items():
            if provider_name in self._providers:
                provider = self._providers[provider_name]
                if provider.supports_model(model):
                    return model
        
        # Fallback to default model
        return self._get_default_model()
    
    # ========================================================================
    # Health & Status
    # ========================================================================
    
    async def run_health_checks(self):
        """Run health checks for all providers"""
        tasks = []
        for name, provider in self._providers.items():
            tasks.append(self._check_provider_health(name, provider))
        await asyncio.gather(*tasks, return_exceptions=True)
        self._last_health_check = time.time()
    
    async def _check_provider_health(self, name: str, provider: LLMProvider):
        """Check health of a single provider"""
        try:
            await provider.health_check()
        except Exception as e:
            print(f"Health check failed for '{name}': {e}")
    
    def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        return {
            name: provider.get_status()
            for name, provider in self._providers.items()
        }
    
    def get_available_models(self) -> Dict[str, List[str]]:
        """Get all available models grouped by provider"""
        return {
            name: provider.config.models
            for name, provider in self._providers.items()
            if provider.config.enabled
        }
    
    async def enable_provider(self, name: str) -> bool:
        """Enable a provider"""
        if name not in self.config.providers:
            return False
        
        self.config.providers[name].enabled = True
        
        if name not in self._providers:
            try:
                provider = self._create_provider(self.config.providers[name])
                if provider:
                    self._providers[name] = provider
                    await provider.health_check()
            except Exception as e:
                print(f"Failed to enable provider '{name}': {e}")
                return False
        
        return True
    
    async def disable_provider(self, name: str) -> bool:
        """Disable a provider"""
        if name not in self.config.providers:
            return False
        
        self.config.providers[name].enabled = False
        
        if name in self._providers:
            provider = self._providers[name]
            if hasattr(provider, 'close'):
                await provider.close()
            del self._providers[name]
        
        return True


class ProviderNotAvailableError(Exception):
    """Raised when no provider is available for a request"""
    pass


# Global router instance
_router: Optional[ProviderRouter] = None


def get_router() -> ProviderRouter:
    """Get or create global router instance"""
    global _router
    if _router is None:
        _router = ProviderRouter()
    return _router


def reset_router():
    """Reset global router (useful for testing)"""
    global _router
    _router = None
