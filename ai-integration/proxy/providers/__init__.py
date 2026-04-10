"""
LLM Providers Module

Provides a unified interface for multiple LLM providers with fallback support.

Usage:
    from proxy.providers import ProviderRouter, get_router
    
    router = get_router()
    response = await router.generate(prompt="Hello", model="qwen3:8b")
"""

from .base import (
    LLMProvider,
    ProviderConfig,
    ProviderStatus,
    GenerationResult,
    ChatMessage,
    EmbeddingResult,
)
from .compat_llm_provider import CompatLlmProvider
from .openai_compatible_provider import OpenAICompatibleProvider
from .huggingface_provider import HuggingFaceProvider
from .router import ProviderRouter, get_router
from .config_loader import load_providers_config, ProvidersConfig

__all__ = [
    # Base classes
    "LLMProvider",
    "ProviderConfig",
    "ProviderStatus",
    "GenerationResult",
    "ChatMessage",
    "EmbeddingResult",
    # Provider implementations
    "CompatLlmProvider",
    "OpenAICompatibleProvider",
    "HuggingFaceProvider",
    # Router
    "ProviderRouter",
    "get_router",
    # Config
    "load_providers_config",
    "ProvidersConfig",
]
