"""
Request Processor Module
Handles parsing and processing of incoming proxy requests
"""
import os
import json
import logging
import uuid
import datetime
from typing import Optional, Any, Dict, Tuple
from flask import Request

from .promises import _safe_json_loads, create_request_log, save_request

logger = logging.getLogger(__name__)

REAL_DATA_PATHS = {
    "api/generate",
    "api/chat",
    "api/embeddings",
}


def _is_real_data_path(path: str) -> bool:
    """Check if path is a real data path that should be logged"""
    normalized = path.strip('/')
    return normalized in REAL_DATA_PATHS


def _prepare_headers(request) -> Dict[str, str]:
    """Extract and clean headers from request"""
    headers = dict(request.headers)
    headers.pop('Host', None)
    headers.pop('Content-Length', None)
    headers.pop('X-Promise', None)
    return headers


def _get_body(request) -> Tuple[bytes, Optional[Dict]]:
    """Extract body data from request
    
    Returns:
        Tuple of (raw_body, parsed_json)
    """
    body = request.get_data()
    body_json = None
    if request.method in ['POST', 'PUT', 'PATCH']:
        body_json = _safe_json_loads(body)
    return body, body_json


def _check_promise_requested(request, body_json: Optional[Dict]) -> bool:
    """Check if promise mode was requested
    
    Can be in query params, headers, or body
    """
    from .ai_hub_config import _is_truthy
    
    if _is_truthy(request.args.get('promise')):
        return True
    if _is_truthy(request.headers.get('X-Promise')):
        return True
    if isinstance(body_json, dict) and _is_truthy(body_json.get('promise')):
        return True
    return False


def _get_forward_args(request) -> Dict[str, Any]:
    """Get query parameters for forwarding (excluding promise)"""
    forward_args = dict(request.args)
    forward_args.pop('promise', None)
    return forward_args


def _prepare_logging(path: str, promise_requested: bool, storage_dir: str) -> Tuple[bool, str, str]:
    """Prepare logging directory for request
    
    Returns:
        Tuple of (should_log, folder_path, request_id)
    """
    should_log_base = _is_real_data_path(path)
    should_log = should_log_base or promise_requested
    
    if not should_log:
        return False, '', ''
    
    request_id = str(uuid.uuid4())[:8]
    unix_timestamp = int(datetime.datetime.now().timestamp())
    folder_name = f"request_{unix_timestamp}_{request_id}"
    folder_path = os.path.join(storage_dir, 'requests', folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    return True, folder_path, request_id


def _save_request_log(request, body: bytes, folder_path: str) -> None:
    """Save request data to logging folder"""
    req_data = create_request_log(request, body)
    save_request(folder_path, req_data)


class RequestProcessor:
    """Processes incoming proxy requests"""
    
    def __init__(self, request, storage_dir: str, config: Dict):
        self.request = request
        self.storage_dir = storage_dir
        self.config = config
        self.path = None
        self.headers = {}
        self.body = b''
        self.body_json = None
        self.forward_args = {}
        self.should_log = False
        self.folder_path = ''
        self.promise_requested = False
        
    def process(self) -> None:
        """Process the request and prepare for proxying"""
        from .ai_hub_config import _is_truthy
        
        self.path = self.request.path.lstrip('/')
        
        # Get body
        self.body, self.body_json = _get_body(self.request)
        
        # Check promise request
        self.promise_requested = _check_promise_requested(self.request, self.body_json)
        
        # Prepare headers
        self.headers = _prepare_headers(self.request)
        
        # Forward args
        self.forward_args = _get_forward_args(self.request)
        
        # Prepare logging
        self.should_log, self.folder_path, _ = _prepare_logging(
            self.path, self.promise_requested, self.storage_dir
        )
        
        # Save request log
        if self.should_log:
            _save_request_log(self.request, self.body, self.folder_path)
            
        # Remove promise from body_json if present
        if isinstance(self.body_json, dict):
            self.body_json.pop('promise', None)
    
    def get_target_url(self, ollama_host: str) -> str:
        """Get the target URL for proxying"""
        return f"{ollama_host}/{self.path}"
