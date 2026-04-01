"""
OpenAI-Compatible API Wrapper

Provides OpenAI-compatible REST API endpoints for the multi-provider router.
This allows using the router with any OpenAI-compatible client.
"""

import json
import time
import asyncio
import threading
from typing import Any, Dict, List, Optional
from flask import Blueprint, request, Response, stream_with_context

from .providers import get_router, ChatMessage
from .providers.router import ProviderNotAvailableError

# Create blueprint
openai_bp = Blueprint('openai', __name__, url_prefix='/v1')


def _run_async(coro):
    """
    Execute coroutine from sync Flask handlers.
    If an event loop is already running in this thread, run in a helper thread.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    holder = {"result": None, "error": None}

    def _runner():
        try:
            holder["result"] = asyncio.run(coro)
        except Exception as exc:
            holder["error"] = exc

    t = threading.Thread(target=_runner, daemon=True)
    t.start()
    t.join()

    if holder["error"] is not None:
        raise holder["error"]
    return holder["result"]


def _create_chat_response(
    result,
    model: str,
    stream: bool = False
) -> Dict[str, Any]:
    """Create OpenAI-compatible chat completion response"""
    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": result.text,
            },
            "finish_reason": result.metadata.get("finish_reason", "stop"),
        }],
        "usage": result.usage or {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        },
    }


def _create_streaming_chunk(
    content: str,
    model: str,
    finish_reason: Optional[str] = None
) -> str:
    """Create SSE chunk for streaming response"""
    chunk = {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "delta": {"content": content} if content else {},
            "finish_reason": finish_reason,
        }],
    }
    return f"data: {json.dumps(chunk)}\n\n"


def _create_embedding_response(
    result,
    model: str
) -> Dict[str, Any]:
    """Create OpenAI-compatible embedding response"""
    data = []
    for i, embedding in enumerate(result.embeddings):
        data.append({
            "object": "embedding",
            "embedding": embedding,
            "index": i,
        })
    
    return {
        "object": "list",
        "data": data,
        "model": model,
        "usage": result.usage or {
            "prompt_tokens": 0,
            "total_tokens": 0,
        },
    }


def _create_models_response(router) -> Dict[str, Any]:
    """Create OpenAI-compatible models list response"""
    data = []
    available_models = router.get_available_models()
    
    for provider_name, models in available_models.items():
        for model in models:
            data.append({
                "id": model,
                "object": "model",
                "created": int(time.time()),
                "owned_by": provider_name,
            })
    
    return {
        "object": "list",
        "data": data,
    }


# =============================================================================
# API Endpoints
# =============================================================================

@openai_bp.route('/chat/completions', methods=['POST'])
def chat_completions():
    """
    OpenAI-compatible chat completions endpoint.
    
    Request body:
        {
            "model": "qwen3:8b",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello!"}
            ],
            "temperature": 0.7,
            "max_tokens": 100,
            "stream": false
        }
    """
    try:
        data = request.get_json()
        if not data:
            return _error_response("Request body required", 400)
        
        model = data.get('model')
        messages = data.get('messages', [])
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens')
        stream = data.get('stream', False)
        
        if not messages:
            return _error_response("messages required", 400)
        
        # Convert messages to ChatMessage objects
        chat_messages = []
        for msg in messages:
            chat_messages.append(ChatMessage(
                role=msg.get('role', 'user'),
                content=msg.get('content', '')
            ))
        
        # Get router and make request
        router = get_router()
        
        result = _run_async(router.chat(
            messages=chat_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        ))
        
        if stream:
            # Streaming response
            def generate():
                # Send content word by word for streaming effect
                words = result.text.split(' ')
                for i, word in enumerate(words):
                    content = word + (' ' if i < len(words) - 1 else '')
                    yield _create_streaming_chunk(content, result.model or model)
                yield _create_streaming_chunk('', result.model or model, 'stop')
                yield "data: [DONE]\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/plain',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                }
            )
        else:
            # Non-streaming response
            response_data = _create_chat_response(result, result.model or model)
            return Response(
                json.dumps(response_data),
                mimetype='application/json'
            )
            
    except ProviderNotAvailableError as e:
        return _error_response(str(e), 503)
    except Exception as e:
        return _error_response(f"Internal error: {str(e)}", 500)


@openai_bp.route('/completions', methods=['POST'])
def completions():
    """
    OpenAI-compatible completions endpoint (legacy).
    
    Converts to chat format internally.
    """
    try:
        data = request.get_json()
        if not data:
            return _error_response("Request body required", 400)
        
        model = data.get('model')
        prompt = data.get('prompt', '')
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens')
        
        if not prompt:
            return _error_response("prompt required", 400)
        
        router = get_router()
        
        result = _run_async(router.generate(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        ))
        
        response_data = {
            "id": f"cmpl-{int(time.time())}",
            "object": "text_completion",
            "created": int(time.time()),
            "model": result.model or model,
            "choices": [{
                "text": result.text,
                "index": 0,
                "finish_reason": result.metadata.get("finish_reason", "stop"),
            }],
            "usage": result.usage or {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            },
        }
        
        return Response(
            json.dumps(response_data),
            mimetype='application/json'
        )
        
    except ProviderNotAvailableError as e:
        return _error_response(str(e), 503)
    except Exception as e:
        return _error_response(f"Internal error: {str(e)}", 500)


@openai_bp.route('/embeddings', methods=['POST'])
def embeddings():
    """
    OpenAI-compatible embeddings endpoint.
    
    Request body:
        {
            "model": "nomic-embed-text",
            "input": "The food was delicious and the waiter..."
        }
    """
    try:
        data = request.get_json()
        if not data:
            return _error_response("Request body required", 400)
        
        model = data.get('model')
        input_text = data.get('input', '')
        
        if not input_text:
            return _error_response("input required", 400)
        
        router = get_router()
        
        result = _run_async(router.embeddings(
            texts=input_text,
            model=model,
        ))
        
        response_data = _create_embedding_response(result, result.model or model)
        
        return Response(
            json.dumps(response_data),
            mimetype='application/json'
        )
        
    except ProviderNotAvailableError as e:
        return _error_response(str(e), 503)
    except Exception as e:
        return _error_response(f"Internal error: {str(e)}", 500)


@openai_bp.route('/models', methods=['GET'])
def list_models():
    """
    OpenAI-compatible models list endpoint.
    """
    try:
        router = get_router()
        response_data = _create_models_response(router)
        
        return Response(
            json.dumps(response_data),
            mimetype='application/json'
        )
    except Exception as e:
        return _error_response(f"Internal error: {str(e)}", 500)


# =============================================================================
# Helper Functions
# =============================================================================

def _error_response(message: str, status_code: int) -> Response:
    """Create error response"""
    error_data = {
        "error": {
            "message": message,
            "type": "api_error",
            "code": status_code,
        }
    }
    return Response(
        json.dumps(error_data),
        status=status_code,
        mimetype='application/json'
    )


# =============================================================================
# Provider Management Endpoints
# =============================================================================

@openai_bp.route('/providers', methods=['GET'])
def list_providers():
    """List all providers and their status"""
    try:
        router = get_router()
        status = router.get_provider_status()
        
        return Response(
            json.dumps({
                "object": "list",
                "data": [
                    {
                        "id": name,
                        "type": info["type"],
                        "enabled": info["enabled"],
                        "health": info["health"],
                        "models": info["models"],
                    }
                    for name, info in status.items()
                ]
            }),
            mimetype='application/json'
        )
    except Exception as e:
        return _error_response(str(e), 500)


@openai_bp.route('/providers/<name>/enable', methods=['POST'])
def enable_provider(name: str):
    """Enable a provider"""
    try:
        router = get_router()
        
        success = _run_async(router.enable_provider(name))
        
        if success:
            return Response(
                json.dumps({"status": "enabled", "provider": name}),
                mimetype='application/json'
            )
        else:
            return _error_response(f"Failed to enable provider: {name}", 400)
            
    except Exception as e:
        return _error_response(str(e), 500)


@openai_bp.route('/providers/<name>/disable', methods=['POST'])
def disable_provider(name: str):
    """Disable a provider"""
    try:
        router = get_router()
        
        success = _run_async(router.disable_provider(name))
        
        if success:
            return Response(
                json.dumps({"status": "disabled", "provider": name}),
                mimetype='application/json'
            )
        else:
            return _error_response(f"Failed to disable provider: {name}", 400)
            
    except Exception as e:
        return _error_response(str(e), 500)
