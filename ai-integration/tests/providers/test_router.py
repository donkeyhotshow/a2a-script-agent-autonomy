"""
Tests for ProviderRouter
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from proxy.providers.router import (
    ProviderRouter,
    get_router,
    reset_router,
    PROVIDER_REGISTRY,
    ProviderNotAvailableError,
)
from proxy.providers.base import (
    ProviderConfig,
    ProviderStatus,
    LLMProvider,
    GenerationResult,
    ChatMessage,
    EmbeddingResult,
)
from proxy.providers.config_loader import ProvidersConfig


class MockProvider(LLMProvider):
    """Mock provider for testing"""
    
    async def generate(self, prompt, model, **kwargs):
        return GenerationResult(
            text=f"Generated: {prompt}",
            model=model,
            provider=self.name,
        )
    
    async def chat(self, messages, model, **kwargs):
        return GenerationResult(
            text="Chat response",
            model=model,
            provider=self.name,
        )
    
    async def embeddings(self, texts, model, **kwargs):
        return EmbeddingResult(
            embeddings=[[0.1, 0.2, 0.3]],
            model=model,
            provider=self.name,
        )
    
    async def health_check(self):
        self._health_status = ProviderStatus.HEALTHY
        return ProviderStatus.HEALTHY


class TestProviderRouter:
    """Test ProviderRouter functionality"""
    
    @pytest.fixture
    def mock_config(self):
        """Create mock configuration"""
        config = ProvidersConfig()
        config.providers["mock1"] = ProviderConfig(
            name="mock1",
            type="mock",
            url="https://mock1.com",
            enabled=True,
            priority=1,
            models=["model-a"],
        )
        config.providers["mock2"] = ProviderConfig(
            name="mock2",
            type="mock",
            url="https://mock2.com",
            enabled=True,
            priority=2,
            models=["model-b"],
            fallback_models={"model-a": "model-b"},
        )
        config.default_provider = "mock1"
        config.fallback_chain = ["mock1", "mock2"]
        return config
    
    @pytest.fixture
    def router(self, mock_config):
        """Create router with mock config"""
        reset_router()
        
        # Register mock provider
        PROVIDER_REGISTRY["mock"] = MockProvider
        
        router = ProviderRouter(mock_config)
        return router
    
    @pytest.mark.asyncio
    async def test_initialize_creates_providers(self, router):
        """Test initialization creates provider instances"""
        await router.initialize()
        
        assert "mock1" in router._providers
        assert "mock2" in router._providers
        assert isinstance(router._providers["mock1"], MockProvider)
    
    @pytest.mark.asyncio
    async def test_generate_uses_preferred_provider(self, router):
        """Test generate uses preferred provider"""
        await router.initialize()
        
        result = await router.generate(
            prompt="Hello",
            model="model-a",
            preferred_provider="mock1",
        )
        
        assert result.provider == "mock1"
        assert result.model == "model-a"
    
    @pytest.mark.asyncio
    async def test_generate_with_fallback(self, router):
        """Test generate falls back to next provider"""
        await router.initialize()
        
        # Make mock1 fail
        router._providers["mock1"].generate = AsyncMock(
            side_effect=Exception("Mock1 failed")
        )
        
        result = await router.generate(
            prompt="Hello",
            model="model-b",
        )
        
        # Should fallback to mock2
        assert result.provider == "mock2"
    
    @pytest.mark.asyncio
    async def test_generate_raises_when_all_fail(self, router):
        """Test generate raises error when all providers fail"""
        await router.initialize()
        
        # Make all providers fail
        for provider in router._providers.values():
            provider.generate = AsyncMock(side_effect=Exception("Failed"))
        
        with pytest.raises(ProviderNotAvailableError):
            await router.generate(prompt="Hello", model="model-a")
    
    @pytest.mark.asyncio
    async def test_chat_delegates_to_provider(self, router):
        """Test chat delegates to provider"""
        await router.initialize()
        
        messages = [ChatMessage(role="user", content="Hello")]
        result = await router.chat(messages=messages, model="model-a")
        
        assert result.text == "Chat response"
    
    @pytest.mark.asyncio
    async def test_embeddings_delegates_to_provider(self, router):
        """Test embeddings delegates to provider"""
        await router.initialize()
        
        result = await router.embeddings(texts="Hello", model="model-a")
        
        assert len(result.embeddings) == 1
        assert result.embeddings[0] == [0.1, 0.2, 0.3]
    
    def test_get_provider_chain(self, router):
        """Test getting provider chain"""
        router._providers = {
            "mock1": MockProvider(router.config.providers["mock1"]),
            "mock2": MockProvider(router.config.providers["mock2"]),
        }
        
        chain = router._get_provider_chain("model-a", preferred_provider="mock1")
        
        assert chain[0][0] == "mock1"
        # mock2 also lists model-a via fallback_models → model-b
        assert any(name == "mock2" for name, _ in chain)
    
    def test_get_provider_chain_with_fallback(self, router):
        """Test getting provider chain with fallback models"""
        router._providers = {
            "mock1": MockProvider(router.config.providers["mock1"]),
            "mock2": MockProvider(router.config.providers["mock2"]),
        }
        
        # model-a has fallback to model-b in mock2
        chain = router._get_provider_chain("model-a", enable_fallback=True)
        
        assert len(chain) >= 1
        # mock1 should be first (direct support)
        assert chain[0][0] == "mock1"
    
    def test_get_default_model(self, router):
        """Test getting default model"""
        router._providers = {
            "mock1": MockProvider(router.config.providers["mock1"]),
        }
        
        default = router._get_default_model()
        
        assert default == "model-a"
    
    def test_get_provider_status(self, router):
        """Test getting provider status"""
        router._providers = {
            "mock1": MockProvider(router.config.providers["mock1"]),
        }
        
        status = router.get_provider_status()
        
        assert "mock1" in status
        assert status["mock1"]["name"] == "mock1"
    
    def test_get_available_models(self, router):
        """Test getting available models"""
        router._providers = {
            "mock1": MockProvider(router.config.providers["mock1"]),
            "mock2": MockProvider(router.config.providers["mock2"]),
        }
        
        models = router.get_available_models()
        
        assert "mock1" in models
        assert "model-a" in models["mock1"]
    
    @pytest.mark.asyncio
    async def test_enable_provider(self, router):
        """Test enabling a provider"""
        router._providers = {}
        
        success = await router.enable_provider("mock1")
        
        assert success is True
        assert "mock1" in router._providers
    
    @pytest.mark.asyncio
    async def test_disable_provider(self, router):
        """Test disabling a provider"""
        router._providers = {"mock1": MockProvider(router.config.providers["mock1"])}
        
        success = await router.disable_provider("mock1")
        
        assert success is True
        assert "mock1" not in router._providers
        assert router.config.providers["mock1"].enabled is False


class TestGetRouter:
    """Test get_router singleton"""
    
    def test_get_router_returns_same_instance(self):
        """Test get_router returns singleton"""
        reset_router()
        
        router1 = get_router()
        router2 = get_router()
        
        assert router1 is router2
    
    def test_reset_router_creates_new_instance(self):
        """Test reset_router creates new instance"""
        reset_router()
        
        router1 = get_router()
        reset_router()
        router2 = get_router()
        
        assert router1 is not router2


class TestProviderRegistry:
    """Test provider type registry"""
    
    def test_registry_has_ollama(self):
        """Test registry includes ollama"""
        assert "ollama" in PROVIDER_REGISTRY
    
    def test_registry_has_openai(self):
        """Test registry includes openai"""
        assert "openai" in PROVIDER_REGISTRY
    
    def test_registry_has_huggingface(self):
        """Test registry includes huggingface"""
        assert "huggingface" in PROVIDER_REGISTRY
