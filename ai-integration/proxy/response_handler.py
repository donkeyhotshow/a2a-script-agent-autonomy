"""
Response Handler Module
Handles processing and formatting responses from AI proxy
"""
import json
import logging
from typing import Optional, Dict, Any, Callable, Generator
from flask import Response

from .promises import _json_bytes, _write_json_file, save_response

logger = logging.getLogger(__name__)


def _is_streaming(headers: Dict) -> bool:
    """Check if response is streaming"""
    content_type = headers.get('Content-Type', '')
    return 'text/event-stream' in content_type


def create_response(
    status_code: int,
    body: Any,
    headers: Optional[Dict[str, str]] = None,
    mimetype: str = 'application/json'
) -> Response:
    """Create a Flask Response object"""
    response = Response(body, status=status_code, mimetype=mimetype)
    if headers:
        for key, value in headers.items():
            response.headers[key] = value
    return response


def create_json_response(data: Any, status_code: int = 200) -> Response:
    """Create a JSON response"""
    body = _json_bytes(data)
    return create_response(status_code, body, mimetype='application/json')


def create_error_response(error: str, message: str, status_code: int = 500, details: Any = None) -> Response:
    """Create an error response"""
    error_data = {
        "error": error,
        "message": message,
    }
    if details is not None:
        error_data["details"] = details
    return create_json_response(error_data, status_code)


def create_simulated_response(
    simulate_action: Dict,
    model: Optional[str] = None,
    prompt: str = '',
    path: str = '',
    request_json: Optional[Dict] = None,
    should_log: bool = False,
    folder_path: str = ''
) -> Response:
    """Create a simulated response based on action config"""
    from .ai_hub_config import _build_simulated_body
    
    status_code = int(simulate_action.get('status_code') or 200)
    sim_headers = simulate_action.get('headers') if isinstance(simulate_action.get('headers'), dict) else {}
    
    sim_body, content_type = _build_simulated_body(
        simulate_action,
        model=model,
        prompt=prompt,
        path=path,
        request_json=request_json,
    )
    
    response = Response(sim_body, status=status_code)
    response.headers['Content-Type'] = sim_headers.get('Content-Type', content_type)
    
    for k, v in sim_headers.items():
        if str(k).lower() == 'content-type':
            continue
        response.headers[str(k)] = str(v)
    
    if should_log and folder_path:
        save_response(folder_path, {
            "status_code": status_code,
            "headers": dict(response.headers),
            "content": (sim_body[:10000].decode('utf-8', errors='replace') if isinstance(sim_body, (bytes, bytearray)) else str(sim_body))[:10000],
            "simulated": True,
        })
    
    return response


def forward_response(
    response,
    should_log: bool = False,
    folder_path: str = '',
    is_promise: bool = False
) -> Response:
    """Forward response from upstream server"""
    # Handle streaming
    if _is_streaming(response.headers):
        response_data = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "stream": True,
        }
        
        if should_log:
            save_response(folder_path, response_data)
        
        def generate():
            for chunk in response.iter_content(chunk_size=None):
                yield chunk
        
        forwarded = Response(generate(), status=response.status_code)
        forwarded.headers = dict(response.headers)
        return forwarded
    
    # Handle regular response
    response_data = {
        "status_code": response.status_code,
        "headers": dict(response.headers),
        "content": response.text[:10000] if len(response.text) > 10000 else response.text,
    }
    
    if is_promise:
        response_data["promised"] = True
    
    if should_log:
        save_response(folder_path, response_data)
    
    forwarded = Response(response.content, status=response.status_code)
    forwarded.headers = dict(response.headers)
    return forwarded


class ResponseHandler:
    """Handles response processing for proxy"""
    
    def __init__(self, should_log: bool = False, folder_path: str = ''):
        self.should_log = should_log
        self.folder_path = folder_path
    
    def save_response(self, data: Dict) -> None:
        """Save response data to logging folder"""
        if self.should_log and self.folder_path:
            save_response(self.folder_path, data)
    
    def handle_simulated(self, simulate_action: Dict, **kwargs) -> Response:
        """Handle simulated response"""
        return create_simulated_response(
            simulate_action,
            should_log=self.should_log,
            folder_path=self.folder_path,
            **kwargs
        )
    
    def handle_forwarded(self, response) -> Response:
        """Handle forwarded response from upstream"""
        return forward_response(
            response,
            should_log=self.should_log,
            folder_path=self.folder_path
        )
    
    def handle_error(self, error: str, message: str, status_code: int = 500) -> Response:
        """Handle error response"""
        error_data = {
            "error": error,
            "message": message,
        }
        if self.should_log and self.folder_path:
            save_response(self.folder_path, error_data)
        return create_error_response(error, message, status_code)
