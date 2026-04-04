"""
Tests for providers configuration loader
"""

import json
import os
import tempfile
import pytest

from proxy.providers.config_loader import (
    load_providers_config,
    save_providers_config,
    _parse_config,
    _default_config,
    ProvidersConfig,
)
from proxy.providers.base import ProviderConfig


class TestParseConfig:
    """Test configuration parsing"""
    
    def test_parse_basic_config(self):
        """Test parsing basic configuration"""
        data = {
            "providers": {
                "test": {
                    "type": "openai",
                    "url": "https://api.test.com",
                    "enabled": True,
                    "priority": 1,
                    "models": ["model-1"],
                }
            },
            "default_provider": "test",
            "fallback_chain": ["test"],
            "enable_fallback": True,
        }
        
        config = _parse_config(data)
        
        assert config.default_provider == "test"
        assert config.enable_fallback is True
        assert "test" in config.providers
        assert config.providers["test"].type == "openai"
    
    def test_parse_with_fallback_models(self):
        """Test parsing with fallback models"""
        data = {
            "providers": {
                "test": {
                    "type": "openai",
                    "url": "https://api.test.com",
                    "fallback_models": {
                        "old-model": "new-model"
                    },
                }
            },
        }
        
        config = _parse_config(data)
        
        assert config.providers["test"].fallback_models["old-model"] == "new-model"
    
    def test_parse_full_config(self):
        """Test parsing complete configuration"""
        data = {
            "providers": {
                "provider1": {
                    "type": "ollama",
                    "url": "http://localhost:11434",
                    "enabled": True,
                    "priority": 1,
                    "api_key": None,
                "models": ["qwen3:8b", "mistral"],
                    "fallback_models": {},
                    "timeout": 60,
                    "max_retries": 3,
                    "retry_delay": 1.0,
                    "rate_limit_rpm": None,
                }
            },
            "default_provider": "provider1",
            "fallback_chain": ["provider1"],
            "enable_fallback": True,
            "provider_timeout": 30,
        }
        
        config = _parse_config(data)
        
        provider = config.providers["provider1"]
        assert provider.timeout == 60
        assert provider.max_retries == 3
        assert provider.retry_delay == 1.0


class TestDefaultConfig:
    """Test default configuration generation"""
    
    def test_default_has_ollama(self):
        """Test default config includes Ollama"""
        config = _default_config()
        
        assert "ollama" in config.providers
        assert config.providers["ollama"].type == "ollama"
        assert config.default_provider == "z_ai"
    
    def test_default_has_cloud_providers(self):
        """Test default config includes cloud providers"""
        config = _default_config()
        
        assert "openrouter" in config.providers
        assert "groq" in config.providers
        assert "huggingface" in config.providers
        assert "cohere" in config.providers
    
    def test_default_fallback_chain(self):
        """Test default fallback chain"""
        config = _default_config()
        
        assert config.fallback_chain == ["z_ai", "ollama", "groq", "openrouter"]


class TestLoadProvidersConfig:
    """Test loading configuration from file"""
    
    def test_load_from_file(self, tmp_path):
        """Test loading from JSON file"""
        config_file = tmp_path / "providers.json"
        config_data = {
            "providers": {
                "custom": {
                    "type": "openai",
                    "url": "https://custom.api.com",
                }
            },
            "default_provider": "custom",
        }
        config_file.write_text(json.dumps(config_data))
        
        config = load_providers_config(str(config_file))
        
        assert config.default_provider == "custom"
        assert "custom" in config.providers
    
    def test_load_nonexistent_file_returns_default(self):
        """Test that loading nonexistent file returns default config"""
        config = load_providers_config("/nonexistent/path/providers.json")
        
        # Should return default config with ollama
        assert "ollama" in config.providers
    
    def test_load_invalid_json_returns_default(self, tmp_path):
        """Test that loading invalid JSON returns default config"""
        config_file = tmp_path / "providers.json"
        config_file.write_text("invalid json {{")
        
        config = load_providers_config(str(config_file))
        
        # Should return default config
        assert "ollama" in config.providers


class TestSaveProvidersConfig:
    """Test saving configuration to file"""
    
    def test_save_and_load_roundtrip(self, tmp_path):
        """Test saving and loading configuration"""
        config_file = tmp_path / "providers.json"
        
        config = ProvidersConfig()
        config.providers["test"] = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
        )
        config.default_provider = "test"
        
        save_providers_config(config, str(config_file))
        
        # Load and verify
        loaded = load_providers_config(str(config_file))
        assert loaded.default_provider == "test"
        assert "test" in loaded.providers


class TestProvidersConfigMethods:
    """Test ProvidersConfig helper methods"""
    
    def test_get_provider(self):
        """Test getting provider by name"""
        config = ProvidersConfig()
        config.providers["test"] = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
        )
        
        provider = config.get_provider("test")
        assert provider is not None
        assert provider.name == "test"
        
        missing = config.get_provider("nonexistent")
        assert missing is None
    
    def test_get_enabled_providers(self):
        """Test getting enabled providers sorted by priority"""
        config = ProvidersConfig()
        config.providers["p1"] = ProviderConfig(
            name="p1",
            type="openai",
            url="https://p1.com",
            priority=2,
            enabled=True,
        )
        config.providers["p2"] = ProviderConfig(
            name="p2",
            type="openai",
            url="https://p2.com",
            priority=1,
            enabled=True,
        )
        config.providers["p3"] = ProviderConfig(
            name="p3",
            type="openai",
            url="https://p3.com",
            enabled=False,
        )
        
        enabled = config.get_enabled_providers()
        
        assert len(enabled) == 2
        assert enabled[0].name == "p2"  # Lower priority first
        assert enabled[1].name == "p1"
    
    def test_get_fallback_chain_custom(self):
        """Test getting custom fallback chain"""
        config = ProvidersConfig()
        config.fallback_chain = ["a", "b", "c"]
        
        assert config.get_fallback_chain() == ["a", "b", "c"]
    
    def test_get_fallback_chain_default(self):
        """Test getting default fallback chain from enabled providers"""
        config = ProvidersConfig()
        config.fallback_chain = []
        config.providers["p1"] = ProviderConfig(
            name="p1",
            type="openai",
            url="https://p1.com",
            priority=2,
            enabled=True,
        )
        config.providers["p2"] = ProviderConfig(
            name="p2",
            type="openai",
            url="https://p2.com",
            priority=1,
            enabled=True,
        )
        
        chain = config.get_fallback_chain()
        
        assert chain == ["p2", "p1"]
