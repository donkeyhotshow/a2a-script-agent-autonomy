"""
Proxy Routes Module
Contains all Flask route handlers

This module imports routes from separate functional modules:
- health_routes.py: Health check endpoints
- metrics_routes.py: Prometheus metrics endpoint
- local_llm_routes.py: local upstream LLM process endpoints
- promise_routes.py: Promise/async request management endpoints
- daemon_routes.py: Daemon management endpoints
- cleanup_routes.py: Storage cleanup endpoints
"""
import os
import json
import logging

from flask import Flask, request, Response, send_from_directory
from werkzeug.exceptions import BadRequest

# Setup logger
logger = logging.getLogger(__name__)

# Import from other modules
from . import app

# Import all route modules (this registers the routes with the app)
from . import health_routes
from . import metrics_routes
from . import local_llm_routes
from . import promise_routes
from . import daemon_routes
from . import cleanup_routes


# ============================================================================
# High-level AI API (v1) - kept in main routes.py
# ============================================================================

@app.route('/api/v1/generate', methods=['POST'])
def api_v1_generate():
    """
    High-level text generation endpoint.

    Normalizes the underlying local / OpenAI style responses into a simple
    shape consumed by the Node.js A2A server:
        { "text": string, "tokensUsed"?: number, "raw"?: any }
    """
    from .proxy_handler import handle_proxy_request
    from .promises import _json_bytes  # local import to avoid cycles
    from .caching import get_cache, build_v1_api_cache_key

    cache = get_cache()

    try:
        payload = request.get_json(force=True, silent=False)
    except BadRequest as e:
        return Response(
            _json_bytes(
                {
                    "error": "invalid_json",
                    "message": getattr(e, "description", None) or str(e),
                }
            ),
            status=400,
            mimetype="application/json",
        )
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        return Response(
            _json_bytes(
                {
                    "error": "expected_json_object",
                    "got": type(payload).__name__,
                }
            ),
            status=400,
            mimetype="application/json",
        )
    cache_key = build_v1_api_cache_key(cache, "generate", "api/generate", payload)
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(_json_bytes(cached), status=200, mimetype='application/json')

    # Reuse the existing proxy logic (rules, simulation, logging, promises disabled)
    upstream_response = handle_proxy_request('api/generate', request)

    status = upstream_response.status_code
    content_type = upstream_response.headers.get('Content-Type', '')
    body_bytes = upstream_response.get_data()
    body_text = body_bytes.decode('utf-8', errors='replace') if body_bytes else ''

    # Pass through non-OK statuses with a normalized error envelope
    if status != 200 or 'application/json' not in content_type:
        out = {
            "error": "upstream_error",
            "status": status,
            "body": body_text[:2000],
        }
        return Response(_json_bytes(out), status=status, mimetype='application/json')

    try:
        data = json.loads(body_text)
    except json.JSONDecodeError as e:
        logger.warning("api/v1/generate: upstream body is not JSON: %s", e)
        out = {
            "error": "invalid_upstream_json",
            "status": 502,
            "body": body_text[:2000],
        }
        return Response(_json_bytes(out), status=502, mimetype='application/json')

    text = None
    tokens_used = None

    if isinstance(data, dict):
        # Local LLM upstream-style
        if isinstance(data.get('response'), str):
            text = data['response']

        # OpenAI chat completion style
        if text is None and isinstance(data.get('choices'), list) and data['choices']:
            choice0 = data['choices'][0]
            if isinstance(choice0, dict):
                msg = choice0.get('message')
                if isinstance(msg, dict) and isinstance(msg.get('content'), str):
                    text = msg['content']
                elif isinstance(choice0.get('text'), str):
                    text = choice0['text']

        # Simple message/content
        if text is None and isinstance(data.get('message'), dict):
            msg = data['message']
            if isinstance(msg.get('content'), str):
                text = msg['content']

        usage = data.get('usage')
        if isinstance(usage, dict) and isinstance(usage.get('total_tokens'), (int, float)):
            tokens_used = int(usage['total_tokens'])

    if text is None:
        logger.warning("api/v1/generate: no extractable text in upstream JSON")
        out = {
            "error": "no_text_in_response",
            "status": 502,
            "raw": data,
        }
        return Response(_json_bytes(out), status=502, mimetype='application/json')

    out = {
        "text": text,
        "tokensUsed": tokens_used,
        "raw": data,
    }

    # Cache only successful, well-formed responses
    if status == 200:
        cache.set(cache_key, out)

    return Response(_json_bytes(out), status=200, mimetype='application/json')


@app.route('/api/v1/embed', methods=['POST'])
def api_v1_embed():
    """
    High-level embedding endpoint.

    Normalizes upstream embedding responses into:
        { "embedding": number[], "raw"?: any }
    """
    from .proxy_handler import handle_proxy_request
    from .promises import _json_bytes  # local import to avoid cycles
    from .caching import get_cache, build_v1_api_cache_key

    cache = get_cache()

    try:
        payload = request.get_json(force=True, silent=False)
    except BadRequest as e:
        return Response(
            _json_bytes(
                {
                    "error": "invalid_json",
                    "message": getattr(e, "description", None) or str(e),
                }
            ),
            status=400,
            mimetype="application/json",
        )
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        return Response(
            _json_bytes(
                {
                    "error": "expected_json_object",
                    "got": type(payload).__name__,
                }
            ),
            status=400,
            mimetype="application/json",
        )

    cache_key = build_v1_api_cache_key(cache, "embed", "api/embeddings", payload)
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(_json_bytes(cached), status=200, mimetype='application/json')

    # Forward as-is to embeddings endpoint (compat HTTP)
    upstream_response = handle_proxy_request('api/embeddings', request)

    status = upstream_response.status_code
    content_type = upstream_response.headers.get('Content-Type', '')
    body_bytes = upstream_response.get_data()
    body_text = body_bytes.decode('utf-8', errors='replace') if body_bytes else ''

    if status != 200 or 'application/json' not in content_type:
        out = {
            "error": "upstream_error",
            "status": status,
            "body": body_text[:2000],
        }
        return Response(_json_bytes(out), status=status, mimetype='application/json')

    try:
        data = json.loads(body_text)
    except json.JSONDecodeError as e:
        logger.warning("api/v1/embed: upstream body is not JSON: %s", e)
        out = {
            "error": "invalid_upstream_json",
            "status": 502,
            "body": body_text[:2000],
        }
        return Response(_json_bytes(out), status=502, mimetype='application/json')

    embedding = None

    if isinstance(data, dict):
        # Single-object embedding shape
        if isinstance(data.get('embedding'), list):
            embedding = data['embedding']

        # OpenAI-style: { "data": [ { "embedding": [...] }, ... ] }
        if embedding is None:
            data_list = data.get('data')
            if isinstance(data_list, list) and data_list:
                first = data_list[0]
                if isinstance(first, dict) and isinstance(first.get('embedding'), list):
                    embedding = first['embedding']

    if embedding is None:
        out = {
            "error": "no_embedding_in_response",
            "status": 502,
            "raw": data,
        }
        return Response(_json_bytes(out), status=502, mimetype='application/json')

    out = {
        "embedding": embedding,
        "raw": data,
    }

    # Cache only successful, well-formed responses
    if status == 200:
        cache.set(cache_key, out)

    return Response(_json_bytes(out), status=200, mimetype='application/json')


# ============================================================================
# Static Files Serving - kept in main routes.py
# ============================================================================

# Web folder for static files
WEB_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')


@app.route('/web/<path:filename>')
def serve_web(filename: str):
    """Serve static files from web/ folder."""
    from .promises import _json_bytes
    if not os.path.isdir(WEB_FOLDER):
        return Response(
            _json_bytes({"error": "web_folder_not_found"}),
            status=404,
            mimetype='application/json',
        )
    return send_from_directory(WEB_FOLDER, filename)


@app.route('/queue', methods=['GET'])
def queue_viewer():
    """Serve queue manager web interface."""
    from .promises import _json_bytes
    index_path = os.path.join(WEB_FOLDER, 'index.html')
    if not os.path.isfile(index_path):
        return Response(
            _json_bytes({"error": "web_interface_not_found"}),
            status=404,
            mimetype='application/json',
        )
    return send_from_directory(WEB_FOLDER, 'index.html')


# ============================================================================
# Main Proxy Handler - kept in main routes.py
# ============================================================================


@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy(path):
    """Прокси обработчик с обработкой ошибок"""
    import logging
    from flask import jsonify
    logger = logging.getLogger(__name__)
    
    try:
        from .proxy_handler import handle_proxy_request
        return handle_proxy_request(path, request)
    except Exception as e:
        logger.error(f"Proxy error for path {path}: {type(e).__name__}: {str(e)}", exc_info=True)
        # Возвращаем 500 с деталями ошибки для отладки
        return jsonify({
            "error": "proxy_error",
            "path": path,
            "exception_type": type(e).__name__,
            "message": str(e)
        }), 500


@app.errorhandler(Exception)
def handle_exception(e):
    """Глобальный обработчик исключений Flask"""
    import logging
    import traceback
    from flask import jsonify
    logger = logging.getLogger(__name__)
    
    logger.error(f"Unhandled exception: {type(e).__name__}: {str(e)}", exc_info=True)
    
    return jsonify({
        "error": "internal_server_error",
        "exception_type": type(e).__name__,
        "message": str(e),
        "traceback": traceback.format_exc()
    }), 500
