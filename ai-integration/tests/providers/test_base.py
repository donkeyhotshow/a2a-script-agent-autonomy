"""
Tests for base provider classes
"""

import pytest
from proxy.providers.base import (
    ProviderConfig,
    ProviderStatus,
    LLMProvider,
    GenerationResult,
    ChatMessage,
    EmbeddingResult,
)


class TestProviderConfig:
    """Test ProviderConfig dataclass"""
    
    def test_basic_config(self):
        """Test basic provider configuration"""
        config = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
        )
        assert config.name == "test"
        assert config.type == "openai"
        assert config.url == "https://api.test.com"
        assert config.enabled is True
        assert config.priority == 1
    
    def test_config_with_env_var(self, monkeypatch):
        """Test API key resolution from environment variable"""
        monkeypatch.setenv("TEST_API_KEY", "secret123")
        
        config = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
            api_key="${TEST_API_KEY}",
        )
        
        assert config.get_api_key() == "secret123"
    
    def test_config_with_direct_api_key(self):
        """Test direct API key (no env var)"""
        config = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
            api_key="direct_key",
        )
        
        assert config.get_api_key() == "direct_key"
    
    def test_config_with_fallback_models(self):
        """Test fallback model configuration"""
        config = ProviderConfig(
            name="test",
            type="openai",
            url="https://api.test.com",
            models=["model-a", "model-b"],
            fallback_models={"legacy-model": "model-a"},
        )
        
        assert "model-a" in config.models
        assert config.fallback_models["legacy-model"] == "model-a"


class TestProviderStatus:
    """Test ProviderStatus enum"""
    
    def test_status_values(self):
        """Test all status values exist"""
        assert ProviderStatus.HEALTHY.value == "healthy"
        assert ProviderStatus.DEGRADED.value == "degraded"
        assert ProviderStatus.UNHEALTHY.value == "unhealthy"
        assert ProviderStatus.DISABLED.value == "disabled"
        assert ProviderStatus.UNKNOWN.value == "unknown"


class TestGenerationResult:
    """Test GenerationResult dataclass"""
    
    def test_basic_result(self):
        """Test basic generation result"""
        result = GenerationResult(
            text="Hello world",
            model="gpt-4",
            provider="openai",
        )
        assert result.text == "Hello world"
        assert result.model == "gpt-4"
        assert result.provider == "openai"
    
    def test_result_with_usage(self):
        """Test result with usage stats"""
        result = GenerationResult(
            text="Test",
            model="model",
            provider="test",
            usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        )
        assert result.usage["total_tokens"] == 30


class TestChatMessage:
    """Test ChatMessage dataclass"""
    
    def test_message_creation(self):
        """Test chat message creation"""
        msg = ChatMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
    
    def test_system_message(self):
        """Test system message creation"""
        msg = ChatMessage(role="system", content="You are helpful")
        assert msg.role == "system"


class TestEmbeddingResult:
    """Test EmbeddingResult dataclass"""
    
    def test_single_embedding(self):
        """Test single embedding result"""
        result = EmbeddingResult(
            embeddings=[[0.1, 0.2, 0.3]],
            model="embed-model",
            provider="test",
        )
        assert len(result.embeddings) == 1
        assert result.embeddings[0] == [0.1, 0.2, 0.3]
    
    def test_multiple_embeddings(self):
        """Test multiple embeddings result"""
        result = EmbeddingResult(
            embeddings=[[0.1, 0.2], [0.3, 0.4]],
            model="embed-model",
            provider="test",
        )
        assert len(result.embeddings) == 2
