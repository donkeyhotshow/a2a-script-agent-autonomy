"""
Tests for OpenAI-compatible API wrapper
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from proxy.openai_wrapper import (
    _create_chat_response,
    _create_embedding_response,
    _create_models_response,
    _error_response,
)
from proxy.providers.base import GenerationResult, EmbeddingResult


class TestCreateChatResponse:
    """Test chat response creation"""
    
    def test_basic_response(self):
        """Test basic chat response"""
        result = GenerationResult(
            text="Hello!",
            model="gpt-4",
            provider="test",
            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        )
        
        response = _create_chat_response(result, "gpt-4")
        
        assert response["object"] == "chat.completion"
        assert response["model"] == "gpt-4"
        assert len(response["choices"]) == 1
        assert response["choices"][0]["message"]["content"] == "Hello!"
        assert response["usage"]["total_tokens"] == 15
    
    def test_response_with_finish_reason(self):
        """Test response with finish reason"""
        result = GenerationResult(
            text="Done",
            model="model",
            provider="test",
            metadata={"finish_reason": "stop"},
        )
        
        response = _create_chat_response(result, "model")
        
        assert response["choices"][0]["finish_reason"] == "stop"


class TestCreateEmbeddingResponse:
    """Test embedding response creation"""
    
    def test_single_embedding(self):
        """Test single embedding response"""
        result = EmbeddingResult(
            embeddings=[[0.1, 0.2, 0.3]],
            model="embed-model",
            provider="test",
        )
        
        response = _create_embedding_response(result, "embed-model")
        
        assert response["object"] == "list"
        assert len(response["data"]) == 1
        assert response["data"][0]["embedding"] == [0.1, 0.2, 0.3]
        assert response["model"] == "embed-model"
    
    def test_multiple_embeddings(self):
        """Test multiple embeddings response"""
        result = EmbeddingResult(
            embeddings=[[0.1, 0.2], [0.3, 0.4]],
            model="embed-model",
            provider="test",
        )
        
        response = _create_embedding_response(result, "embed-model")
        
        assert len(response["data"]) == 2
        assert response["data"][0]["index"] == 0
        assert response["data"][1]["index"] == 1


class TestCreateModelsResponse:
    """Test models list response creation"""
    
    def test_models_response(self):
        """Test creating models list response"""
        mock_router = MagicMock()
        mock_router.get_available_models.return_value = {
            "provider1": ["model-a", "model-b"],
            "provider2": ["model-c"],
        }
        
        response = _create_models_response(mock_router)
        
        assert response["object"] == "list"
        assert len(response["data"]) == 3
        
        # Check model IDs
        model_ids = [m["id"] for m in response["data"]]
        assert "model-a" in model_ids
        assert "model-b" in model_ids
        assert "model-c" in model_ids


class TestErrorResponse:
    """Test error response creation"""
    
    def test_error_response_format(self):
        """Test error response format"""
        response = _error_response("Test error", 400)
        
        data = json.loads(response.data)
        
        assert data["error"]["message"] == "Test error"
        assert data["error"]["type"] == "api_error"
        assert data["error"]["code"] == 400
        assert response.status_code == 400


# Integration tests with Flask test client
class TestOpenAIEndpoints:
    """Test OpenAI API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        from flask import Flask
        from proxy.openai_wrapper import openai_bp
        
        app = Flask(__name__)
        app.register_blueprint(openai_bp)
        
        return app.test_client()
    
    @pytest.fixture
    def mock_router(self):
        """Mock provider router"""
        with patch("proxy.openai_wrapper.get_router") as mock:
            router = MagicMock()
            
            # Mock async methods
            async def mock_chat(*args, **kwargs):
                return GenerationResult(
                    text="Test response",
                    model="test-model",
                    provider="test",
                    usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
                )
            
            async def mock_generate(*args, **kwargs):
                return GenerationResult(
                    text="Generated text",
                    model="test-model",
                    provider="test",
                )
            
            async def mock_embeddings(*args, **kwargs):
                return EmbeddingResult(
                    embeddings=[[0.1, 0.2, 0.3]],
                    model="embed-model",
                    provider="test",
                )
            
            router.chat = mock_chat
            router.generate = mock_generate
            router.embeddings = mock_embeddings
            router.get_available_models.return_value = {"test": ["model-1"]}
            router.get_provider_status.return_value = {
                "test": {
                    "name": "test",
                    "type": "openai",
                    "enabled": True,
                    "health": "healthy",
                    "models": ["model-1"],
                }
            }
            
            mock.return_value = router
            yield router
    
    def test_chat_completions_endpoint(self, client, mock_router):
        """Test /v1/chat/completions endpoint"""
        response = client.post('/chat/completions', json={
            "model": "test-model",
            "messages": [{"role": "user", "content": "Hello"}],
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["object"] == "chat.completion"
        assert len(data["choices"]) == 1
    
    def test_chat_completions_missing_messages(self, client, mock_router):
        """Test chat completions with missing messages"""
        response = client.post('/chat/completions', json={
            "model": "test-model",
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "messages required" in data["error"]["message"]
    
    def test_completions_endpoint(self, client, mock_router):
        """Test /v1/completions endpoint"""
        response = client.post('/completions', json={
            "model": "test-model",
            "prompt": "Hello",
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["object"] == "text_completion"
        assert data["choices"][0]["text"] == "Generated text"
    
    def test_embeddings_endpoint(self, client, mock_router):
        """Test /v1/embeddings endpoint"""
        response = client.post('/embeddings', json={
            "model": "embed-model",
            "input": "Hello world",
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["object"] == "list"
        assert len(data["data"]) == 1
    
    def test_list_models_endpoint(self, client, mock_router):
        """Test /v1/models endpoint"""
        response = client.get('/models')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["object"] == "list"
        assert len(data["data"]) == 1
        assert data["data"][0]["id"] == "model-1"
    
    def test_list_providers_endpoint(self, client, mock_router):
        """Test /v1/providers endpoint"""
        response = client.get('/providers')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["object"] == "list"
        assert len(data["data"]) == 1
        assert data["data"][0]["id"] == "test"
