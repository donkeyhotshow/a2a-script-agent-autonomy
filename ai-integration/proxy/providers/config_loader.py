"""
Providers Configuration Loader

Loads and manages provider configurations from JSON file.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .base import ProviderConfig


@dataclass
class ProvidersConfig:
    """Complete providers configuration"""
    providers: Dict[str, ProviderConfig] = field(default_factory=dict)
    default_provider: str = "ollama"
    fallback_chain: List[str] = field(default_factory=list)
    enable_fallback: bool = True
    provider_timeout: int = 30
    
    def get_provider(self, name: str) -> Optional[ProviderConfig]:
        """Get provider config by name"""
        return self.providers.get(name)
    
    def get_enabled_providers(self) -> List[ProviderConfig]:
        """Get all enabled providers sorted by priority"""
        enabled = [
            p for p in self.providers.values()
            if p.enabled
        ]
        return sorted(enabled, key=lambda p: p.priority)
    
    def get_fallback_chain(self) -> List[str]:
        """Get fallback chain with defaults"""
        if self.fallback_chain:
            return self.fallback_chain
        # Default: all enabled providers sorted by priority
        return [p.name for p in self.get_enabled_providers()]


def load_providers_config(config_path: Optional[str] = None) -> ProvidersConfig:
    """
    Load providers configuration from JSON file.
    
    Args:
        config_path: Path to config file. If None, uses default paths.
        
    Returns:
        ProvidersConfig instance
    """
    # Default config paths
    if config_path is None:
        config_paths = [
            os.environ.get('PROVIDERS_CONFIG', ''),
            'config/providers.json',
            'proxy/providers.json',
            os.path.expanduser('~/.config/a2a-ai-hub/providers.json'),
        ]
    else:
        config_paths = [config_path]
    
    # Find first existing config
    for path in config_paths:
        if path and os.path.isfile(path):
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                return _parse_config(data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Failed to load config from {path}: {e}")
                continue
    
    # Return default config if no file found
    return _default_config()


def _parse_config(data: Dict[str, Any]) -> ProvidersConfig:
    """Parse configuration from JSON data"""
    config = ProvidersConfig()
    
    # Parse providers
    providers_data = data.get('providers', {})
    for name, provider_data in providers_data.items():
        config.providers[name] = ProviderConfig(
            name=name,
            type=provider_data.get('type', 'openai'),
            url=provider_data.get('url', ''),
            enabled=provider_data.get('enabled', True),
            priority=provider_data.get('priority', 1),
            api_key=provider_data.get('api_key'),
            models=provider_data.get('models', []),
            fallback_models=provider_data.get('fallback_models', {}),
            timeout=provider_data.get('timeout', 30),
            max_retries=provider_data.get('max_retries', 3),
            retry_delay=provider_data.get('retry_delay', 1.0),
            rate_limit_rpm=provider_data.get('rate_limit_rpm'),
        )
    
    # Parse other settings
    config.default_provider = data.get('default_provider', 'ollama')
    config.fallback_chain = data.get('fallback_chain', [])
    config.enable_fallback = data.get('enable_fallback', True)
    config.provider_timeout = data.get('provider_timeout', 30)
    
    return config


def _default_config() -> ProvidersConfig:
    """Create default configuration"""
    config = ProvidersConfig()
    
    # Ollama (local)
    config.providers['ollama'] = ProviderConfig(
        name='ollama',
        type='ollama',
        url=os.environ.get('OLLAMA_HOST', 'http://localhost:11435'),
        enabled=True,
        priority=1,
        models=['qwen3:8b', 'mistral', 'codellama'],
        timeout=60,
    )
    
    # OpenRouter
    config.providers['openrouter'] = ProviderConfig(
        name='openrouter',
        type='openai',
        url='https://openrouter.ai/api/v1',
        enabled=bool(os.environ.get('OPENROUTER_API_KEY')),
        priority=2,
        api_key='${OPENROUTER_API_KEY}',
        models=[
            'meta-llama/llama-3-8b-instruct',
            'mistralai/mistral-7b-instruct',
            'google/gemma-7b-it',
        ],
        fallback_models={
            'qwen3:8b': 'meta-llama/llama-3-8b-instruct',
            'mistral': 'mistralai/mistral-7b-instruct',
        },
        timeout=30,
    )
    
    # Groq
    config.providers['groq'] = ProviderConfig(
        name='groq',
        type='openai',
        url='https://api.groq.com/openai/v1',
        enabled=bool(os.environ.get('GROQ_API_KEY')),
        priority=3,
        api_key='${GROQ_API_KEY}',
        models=[
            'qwen3-8b-8192',
            'qwen3-70b-8192',
            'mixtral-8x7b-32768',
        ],
        fallback_models={
            'qwen3:8b': 'qwen3-8b-8192',
            'mistral': 'mixtral-8x7b-32768',
        },
        timeout=30,
    )
    
    # HuggingFace (disabled by default)
    config.providers['huggingface'] = ProviderConfig(
        name='huggingface',
        type='huggingface',
        url='https://api-inference.huggingface.co',
        enabled=bool(os.environ.get('HF_TOKEN')),
        priority=4,
        api_key='${HF_TOKEN}',
        models=[
            'meta-llama/Llama-2-7b-chat-hf',
            'mistralai/Mistral-7B-v0.1',
        ],
        timeout=30,
    )
    
    # Cohere
    config.providers['cohere'] = ProviderConfig(
        name='cohere',
        type='openai',
        url='https://api.cohere.ai/v1',
        enabled=bool(os.environ.get('COHERE_API_KEY')),
        priority=5,
        api_key='${COHERE_API_KEY}',
        models=[
            'command-r',
            'command-r-plus',
        ],
        timeout=30,
    )
    
    # Default fallback chain
    config.fallback_chain = ['ollama', 'groq', 'openrouter']
    
    return config


def save_providers_config(config: ProvidersConfig, path: str):
    """
    Save providers configuration to JSON file.
    
    Args:
        config: ProvidersConfig to save
        path: Path to save to
    """
    data = {
        "providers": {},
        "default_provider": config.default_provider,
        "fallback_chain": config.fallback_chain,
        "enable_fallback": config.enable_fallback,
        "provider_timeout": config.provider_timeout,
    }
    
    for name, provider in config.providers.items():
        data["providers"][name] = {
            "type": provider.type,
            "url": provider.url,
            "enabled": provider.enabled,
            "priority": provider.priority,
            "api_key": provider.api_key,
            "models": provider.models,
            "fallback_models": provider.fallback_models,
            "timeout": provider.timeout,
            "max_retries": provider.max_retries,
            "retry_delay": provider.retry_delay,
            "rate_limit_rpm": provider.rate_limit_rpm,
        }
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
