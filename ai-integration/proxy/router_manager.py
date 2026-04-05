"""
Router Manager Module
Handles routing logic, provider selection, and URL translation
"""
import asyncio
import logging
from typing import Optional, Any, Dict, Tuple

logger = logging.getLogger(__name__)

from .config import OLLAMA_HOST
from .ollama_manager import get_ollama_manager
from .api_key_routing import write_routing_hint


def _translate_ollama_to_openai_path(path: str) -> str:
    """Translate Ollama-style API paths to OpenAI-compatible paths"""
    path_norm = path.lstrip('/')
    translations = {
        'api/chat': 'chat/completions',
        'api/generate': 'completions',
        'api/embeddings': 'embeddings',
        'v1/chat/completions': 'chat/completions',
        'v1/completions': 'completions',
        'v1/embeddings': 'embeddings',
    }
    if path_norm in translations:
        return translations[path_norm]
    return path_norm


def get_router():
    """Get the router instance"""
    from .providers.router import get_router as _get_router
    return _get_router()


def initialize_router_if_needed(router):
    """Initialize router if not already initialized"""
    if not router._initialized:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(router.initialize())
            finally:
                loop.close()
        except Exception as e:
            logger.warning(f"Failed to initialize router: {e}, falling back to Ollama")


def resolve_routing(
    path: str,
    model: Optional[str],
    cfg: Dict[str, Any],
    router,
    headers: Dict[str, Any],
    should_log: bool,
    folder_path: str,
) -> Tuple[str, Dict[str, Any], Optional[str], Optional[str]]:
    """
    Resolve routing for the request.

    Returns:
        tuple: (target_url, headers, routed_provider_name, routed_provider_type)
    """
    initialize_router_if_needed(router)

    routed_provider_name = None
    routed_provider_type = None

    def _nonempty_model(m: Optional[str]) -> bool:
        if m is None:
            return False
        return bool(str(m).strip()) if isinstance(m, str) else True

    effective = model if _nonempty_model(model) else None
    if router._initialized and not effective:
        try:
            effective = router._get_default_model()
        except Exception as exc:
            logger.warning("Could not resolve default provider model: %s", exc, exc_info=True)
            effective = None

    if effective and router._initialized:
        model = router._resolve_model(effective)
        provider_chain = router._get_provider_chain(model)
        if provider_chain:
            provider_name, provider = provider_chain[0]
            provider_type = getattr(provider.config, 'type', '')
            if provider_type in ('openai', 'z_ai'):
                translated_path = _translate_ollama_to_openai_path(path)
                target_url = provider.config.url.rstrip('/') + '/' + translated_path
                logger.info(f"Routed request for model '{model}' to provider '{provider_name}' -> {target_url} (translated from {path})")
            else:
                target_url = provider.config.url.rstrip('/') + '/' + path
                logger.info(f"Routed request for model '{model}' to provider '{provider_name}' -> {target_url}")
            upstream_headers = {}
            for hk, hv in headers.items():
                lk = str(hk).lower()
                if lk in ('content-type', 'accept', 'accept-language', 'user-agent'):
                    upstream_headers[hk] = hv
            headers = upstream_headers
            routed_provider_name = provider_name
            routed_provider_type = provider_type
        else:
            fallback_host = OLLAMA_HOST.rstrip('/') or OLLAMA_HOST
            target_url = f"{fallback_host}/{path}"
            logger.warning(f"No provider available for model '{model}', falling back to Ollama")
    else:
        fallback_host = OLLAMA_HOST.rstrip('/') or OLLAMA_HOST
        target_url = f"{fallback_host}/{path}"

    if should_log and folder_path and routed_provider_name and routed_provider_type:
        write_routing_hint(
            folder_path,
            provider_name=routed_provider_name,
            provider_type=routed_provider_type,
            key_failover=routed_provider_type != 'ollama',
        )

    return target_url, headers, routed_provider_name, routed_provider_type


def auto_start_ollama(path: str) -> None:
    """Auto-start Ollama if enabled and path matches"""
    from .config import OLLAMA_AUTO_START
    if OLLAMA_AUTO_START and path.startswith('api/'):
        mgr = get_ollama_manager()
        if not mgr.is_running():
            mgr.start()