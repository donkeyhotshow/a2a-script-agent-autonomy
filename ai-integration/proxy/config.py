"""
AI Proxy Configuration Module

Type-safe configuration with Pydantic validation.
Loads from environment variables with validation at startup (fail-fast).

Usage:
    from proxy.config import settings
    
    # Access validated settings
    port = settings.proxy_port
    ollama_host = settings.ollama_host
"""

import logging
import os
import sys
from pathlib import Path
from typing import Literal, Optional

_config_log = logging.getLogger(__name__)

try:
    from pydantic import field_validator, ValidationError
    from pydantic_settings import BaseSettings, SettingsConfigDict
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    _config_log.warning("pydantic not installed — using legacy configuration")

# Always resolve ai-integration/.env (this file lives at ai-integration/proxy/config.py).
_AI_INTEGRATION_ENV = Path(__file__).resolve().parent.parent / '.env'
_ENV_FILE_TUPLE = (
    (str(_AI_INTEGRATION_ENV), '.env')
    if _AI_INTEGRATION_ENV.is_file()
    else ('.env',)
)


# ===========================================
# Legacy Configuration (Fallback)
# ===========================================

class LegacyConfig:
    """Legacy configuration without Pydantic validation."""
    
    # Proxy Server Configuration
    PROXY_PORT = int(os.environ.get('PROXY_PORT', '11435'))
    PROXY_HOST = os.environ.get('PROXY_HOST', '0.0.0.0')
    
    # Ollama Configuration
    OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://localhost:11434').strip()
    OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen3:8b')
    OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', '180'))  # 180s for slow qwen3:8b model
    OLLAMA_MODELS = os.environ.get('OLLAMA_MODELS', os.path.expanduser('~/.ollama'))
    OLLAMA_KEEP_ALIVE = os.environ.get('OLLAMA_KEEP_ALIVE', '5m')
    
    # Ollama Manager Configuration
    OLLAMA_IDLE_TIMEOUT = int(os.environ.get('OLLAMA_IDLE_TIMEOUT', '300'))
    OLLAMA_AUTO_START = os.environ.get('OLLAMA_AUTO_START', 'false').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
    
    # Storage Configuration
    STORAGE_DIR = os.environ.get('STORAGE_DIR', 'proxy_logs')
    PROMISES_DIR = os.environ.get('PROMISES_DIR', os.path.join(STORAGE_DIR, 'promises'))
    
    # Request Handling Configuration (30s default timeout on forwarded LLM requests)
    _ft = int(os.environ.get('FORWARD_TIMEOUT_SECONDS', '30'))
    FORWARD_TIMEOUT_SECONDS = _ft
    FORWARD_TIMEOUT = None if _ft == 0 else _ft
    PROMISE_TTL_SECONDS = int(os.environ.get('PROMISE_TTL_SECONDS', '86400'))
    PROMISE_MAX_WORKERS = int(os.environ.get('PROMISE_MAX_WORKERS', '8'))
    
    # AI Hub Configuration
    AI_HUB_CONFIG = os.environ.get('AI_HUB_CONFIG', '').strip()
    OLLAMA_SERVER_HEADER = os.environ.get('OLLAMA_SERVER_HEADER', 'ollama').strip() or 'ollama'
    
    # Simulation Configuration
    SIMULATION_ENABLED = os.environ.get('SIMULATION_ENABLED', 'false').lower() == 'true'
    SIMULATION_DATA_PATH = os.environ.get('SIMULATION_DATA_PATH', 'simulation_data')
    
    # Health Check Configuration
    HEALTH_CHECK_INTERVAL = int(os.environ.get('HEALTH_CHECK_INTERVAL', '5'))
    HEALTH_CHECK_TIMEOUT = int(os.environ.get('HEALTH_CHECK_TIMEOUT', '5'))
    
    # Promise Queue Daemon Configuration
    DAEMON_ENABLED = os.environ.get('DAEMON_ENABLED', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
    DAEMON_POLL_INTERVAL = float(os.environ.get('DAEMON_POLL_INTERVAL', '4.0'))
    DAEMON_EXECUTE_TIMEOUT = int(os.environ.get('DAEMON_EXECUTE_TIMEOUT', '15'))
    DAEMON_MAX_WORKERS = int(os.environ.get('DAEMON_MAX_WORKERS', '4'))
    DAEMON_AUTO_EXECUTE = os.environ.get('DAEMON_AUTO_EXECUTE', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
    DAEMON_SKIP_SIMULATE = os.environ.get('DAEMON_SKIP_SIMULATE', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}  # Skip simulate requests (let inline job handle them)
    PROMISE_DAEMON_ONLY = os.environ.get('PROMISE_DAEMON_ONLY', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
    PROMISE_DELAY_BEFORE_EXECUTE = float(os.environ.get('PROMISE_DELAY_BEFORE_EXECUTE', '2.0'))
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FORMAT = os.environ.get('LOG_FORMAT', 'json')
    
    # Provider Configuration
    PROVIDERS_CONFIG = os.environ.get('PROVIDERS_CONFIG', 'config/providers.json')
    DEFAULT_PROVIDER = os.environ.get('DEFAULT_PROVIDER', 'z_ai')
    ENABLE_FALLBACK = os.environ.get('ENABLE_FALLBACK', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
    PROVIDER_TIMEOUT = int(os.environ.get('PROVIDER_TIMEOUT', '30'))  # 30s default aiohttp total timeout on LLM calls
    
    # Provider API Keys
    Z_AI_API_KEY = os.environ.get('Z_AI_API_KEY', '')
    Z_AI_BASE_URL = os.environ.get('Z_AI_BASE_URL', 'https://api.z.ai/api/paas/v4/')
    Z_AI_MODEL = os.environ.get('Z_AI_MODEL', 'glm-4.7-flash')
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
    HF_TOKEN = os.environ.get('HF_TOKEN', '')
    COHERE_API_KEY = os.environ.get('COHERE_API_KEY', '')

    # Cleanup Configuration
    LOG_RETENTION_DAYS = int(os.environ.get('LOG_RETENTION_DAYS', '30'))
    RESULT_RETENTION_DAYS = int(os.environ.get('RESULT_RETENTION_DAYS', '7'))
    PROMISE_RETENTION_DAYS = int(os.environ.get('PROMISE_RETENTION_DAYS', '7'))
    CLEANUP_INTERVAL_HOURS = int(os.environ.get('CLEANUP_INTERVAL_HOURS', '24'))
    ENABLE_CLEANUP = os.environ.get('ENABLE_CLEANUP', 'true').lower() in {'1', 'true', 'yes', 'y', 'on', 't'}


# ===========================================
# Pydantic Configuration (Preferred)
# ===========================================

if HAS_PYDANTIC:
    class Settings(BaseSettings):
        """
        AI Proxy Settings with Pydantic validation.
        
        All settings are loaded from environment variables
        with type validation and sensible defaults.
        """
        
        model_config = SettingsConfigDict(
            env_file=_ENV_FILE_TUPLE,
            env_file_encoding='utf-8',
            case_sensitive=False,
            extra='ignore',  # Ignore extra env vars not defined here
        )
        
        # ===========================================
        # Proxy Server Configuration
        # ===========================================
        proxy_port: int = 11434
        """Port where the proxy server runs."""
        
        proxy_host: str = '0.0.0.0'
        """Host binding for the proxy server."""
        
        # ===========================================
        # Ollama Configuration
        # ===========================================
        ollama_host: str = 'http://localhost:11435'
        """Host:port of the actual Ollama instance."""
        
        ollama_model: str = 'qwen3:8b'
        """Default Ollama model to use."""
        
        ollama_timeout: int = 180
        """Timeout for Ollama requests in seconds. Default 180s for slow qwen3:8b model responses."""
        
        ollama_models: str = '~/.ollama'
        """Path to Ollama models directory."""
        
        ollama_keep_alive: str = '5m'
        """keep_alive duration for models."""
        
        # ===========================================
        # Ollama Manager Configuration
        # ===========================================
        ollama_idle_timeout: int = 300
        """Seconds until Ollama is stopped when idle."""
        
        ollama_auto_start: bool = True
        """Auto-start Ollama on demand."""
        
        # ===========================================
        # Storage Configuration
        # ===========================================
        storage_dir: str = 'proxy_logs'
        """Directory for storing logs and data."""
        
        promises_dir: Optional[str] = None
        """Directory for promise queue storage. Auto-computed from storage_dir if not set."""
        
        # ===========================================
        # Request Handling Configuration
        # ===========================================
        forward_timeout_seconds: int = 30
        """Timeout for forwarding requests in seconds. 0 = no limit."""
        
        promise_ttl_seconds: int = 86400
        """Time-to-live for promises in seconds (24 hours)."""
        
        promise_max_workers: int = 8
        """Maximum concurrent promise workers."""
        
        # ===========================================
        # AI Hub Configuration
        # ===========================================
        ai_hub_config: Optional[str] = None
        """Path to JSON config with rules/mapping/simulation settings."""
        
        ollama_server_header: str = 'ollama'
        """Value for Ollama server header."""
        
        # ===========================================
        # Simulation Configuration
        # ===========================================
        simulation_enabled: bool = False
        """Enable simulation mode."""
        
        simulation_data_path: str = 'simulation_data'
        """Path to simulation data directory."""
        
        # ===========================================
        # Health Check Configuration
        # ===========================================
        health_check_interval: int = 5
        """Seconds between health checks."""
        
        health_check_timeout: int = 5
        """Health check timeout in seconds."""
        
        # ===========================================
        # Daemon Configuration
        # ===========================================
        daemon_enabled: bool = True
        """Enable built-in promise queue daemon."""
        
        daemon_poll_interval: float = 4.0
        """Seconds between polls for pending promises."""
        
        daemon_execute_timeout: int = 15
        """Timeout for promise execution in seconds."""
        
        daemon_max_workers: int = 4
        """Maximum concurrent daemon workers."""
        
        daemon_auto_execute: bool = True
        """Automatically execute pending promises."""
        
        daemon_skip_simulate: bool = True
        """Skip simulate requests (let inline job handle them)."""
        
        promise_daemon_only: bool = True
        """Only daemon executes promises; proxy creates and returns 202 without inline execution."""
        
        promise_delay_before_execute: float = 5.0
        """Delay before executing promise job (seconds). Must be > DAEMON_POLL_INTERVAL to allow daemon to intercept."""
        
        # ===========================================
        # Logging Configuration
        # ===========================================
        log_level: Literal['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] = 'INFO'
        """Logging level."""
        
        log_format: Literal['json', 'text', 'pretty'] = 'json'
        """Logging format."""
        
        # ===========================================
        # Provider Configuration
        # ===========================================
        providers_config: str = 'config/providers.json'
        """Path to providers configuration JSON file."""
        
        default_provider: str = 'z_ai'
        """Default LLM provider to use (Z.AI by default, Ollama stays as optional fallback)."""
        
        enable_fallback: bool = True
        """Enable fallback chain between providers."""
        
        provider_timeout: int = 30
        """
        aiohttp total timeout for provider sessions (seconds). 0 = no limit.
        Set via PROVIDER_TIMEOUT environment variable.
        """
        
        # ===========================================
        # Provider API Keys
        # ===========================================
        z_ai_api_key: Optional[str] = None
        """Z.AI API key (https://z.ai)."""

        z_ai_base_url: str = "https://api.z.ai/api/paas/v4/"
        """Z.AI base URL."""

        z_ai_model: str = "glm-4.7-flash"
        """Z.AI default model."""

        openrouter_api_key: Optional[str] = None
        """OpenRouter API key (https://openrouter.ai)."""

        groq_api_key: Optional[str] = None
        """Groq API key (https://groq.com)."""

        hf_token: Optional[str] = None
        """HuggingFace API token (https://huggingface.co)."""

        cohere_api_key: Optional[str] = None
        """Cohere API key (https://cohere.com)."""

        # ===========================================
        # Cleanup Configuration
        # ===========================================
        log_retention_days: int = 30
        """Days to retain log files before cleanup."""

        result_retention_days: int = 7
        """Days to retain result files before cleanup."""

        promise_retention_days: int = 7
        """Days to retain promise records before cleanup."""

        cleanup_interval_hours: int = 24
        """Hours between automatic cleanup runs."""

        enable_cleanup: bool = True
        """Enable automatic cleanup of old files."""
        
        # ===========================================
        # Validators
        # ===========================================
        
        @field_validator('ollama_models', mode='before')
        @classmethod
        def expand_ollama_models_path(cls, v: str) -> str:
            """Expand ~ to home directory in ollama_models path."""
            if v and v.startswith('~'):
                return os.path.expanduser(v)
            return v

        @field_validator('ollama_host', mode='before')
        @classmethod
        def strip_ollama_host(cls, v: str) -> str:
            """Remove accidental whitespace around the Ollama host."""
            if isinstance(v, str):
                return v.strip()
            return v

        @field_validator('promises_dir', mode='before')
        @classmethod
        def set_promises_dir(cls, v: Optional[str], info) -> str:
            """Compute promises_dir from storage_dir if not set."""
            if v:
                return v
            storage_dir = info.data.get('storage_dir', 'proxy_logs')
            return os.path.join(storage_dir, 'promises')
        
        @field_validator('forward_timeout_seconds', mode='before')
        @classmethod
        def default_forward_timeout(cls, v: Optional[int]) -> int:
            """30s default timeout. 0 = no timeout. Omit or set FORWARD_TIMEOUT_SECONDS=0 for no limit."""
            if v is not None:
                return v
            return 30
        
        @field_validator('proxy_port', 'ollama_timeout', 'ollama_idle_timeout',
                        'promise_ttl_seconds', 'promise_max_workers',
                        'health_check_interval', 'health_check_timeout')
        @classmethod
        def validate_positive_int(cls, v: int) -> int:
            """Validate that integer values are positive."""
            if v <= 0:
                raise ValueError('Value must be positive')
            return v

        @field_validator('forward_timeout_seconds')
        @classmethod
        def validate_forward_timeout(cls, v: int) -> int:
            """0 = no timeout, positive = seconds."""
            if v < 0:
                raise ValueError('forward_timeout_seconds must be >= 0')
            return v

        @field_validator('provider_timeout')
        @classmethod
        def validate_provider_timeout(cls, v: int) -> int:
            """0 = no aiohttp total limit on provider sessions."""
            if v < 0:
                raise ValueError('provider_timeout must be >= 0')
            return v
        
        @field_validator('log_level', mode='before')
        @classmethod
        def uppercase_log_level(cls, v: str) -> str:
            """Convert log level to uppercase."""
            return v.upper() if isinstance(v, str) else v
        
        @field_validator('ollama_auto_start', 'simulation_enabled', mode='before')
        @classmethod
        def parse_boolean(cls, v) -> bool:
            """Parse various boolean string representations."""
            if isinstance(v, bool):
                return v
            if isinstance(v, str):
                return v.lower() in {'1', 'true', 'yes', 'y', 'on', 't'}
            return bool(v)
    
    # ===========================================
    # Load Settings
    # ===========================================
    
    def load_settings() -> Settings:
        """Load and validate settings, exiting on validation error."""
        try:
            return Settings()
        except ValidationError as e:
            print("=" * 60)
            print("Configuration Validation Failed")
            print("=" * 60)
            print()
            for error in e.errors():
                loc = '.'.join(str(x) for x in error['loc'])
                msg = error['msg']
                print(f"  • {loc}: {msg}")
            print()
            print("Please check your .env file and ensure all required")
            print("variables are set correctly.")
            print()
            print("See docs/CONFIGURATION.md for detailed documentation.")
            print("=" * 60)
            sys.exit(1)
    
    # Create settings instance
    settings = load_settings()
    
    # Export legacy-style constants for backward compatibility
    PROXY_PORT = settings.proxy_port
    PROXY_HOST = settings.proxy_host
    OLLAMA_HOST = settings.ollama_host
    OLLAMA_MODEL = settings.ollama_model
    OLLAMA_TIMEOUT = settings.ollama_timeout
    OLLAMA_MODELS = settings.ollama_models
    OLLAMA_KEEP_ALIVE = settings.ollama_keep_alive
    OLLAMA_IDLE_TIMEOUT = settings.ollama_idle_timeout
    OLLAMA_AUTO_START = settings.ollama_auto_start
    STORAGE_DIR = settings.storage_dir
    PROMISES_DIR = settings.promises_dir
    FORWARD_TIMEOUT_SECONDS = settings.forward_timeout_seconds
    FORWARD_TIMEOUT = None if settings.forward_timeout_seconds == 0 else settings.forward_timeout_seconds
    PROMISE_TTL_SECONDS = settings.promise_ttl_seconds
    PROMISE_MAX_WORKERS = settings.promise_max_workers
    AI_HUB_CONFIG = settings.ai_hub_config or ''
    OLLAMA_SERVER_HEADER = settings.ollama_server_header
    SIMULATION_ENABLED = settings.simulation_enabled
    SIMULATION_DATA_PATH = settings.simulation_data_path
    HEALTH_CHECK_INTERVAL = settings.health_check_interval
    HEALTH_CHECK_TIMEOUT = settings.health_check_timeout
    
    # Daemon configuration exports
    DAEMON_ENABLED = settings.daemon_enabled
    DAEMON_POLL_INTERVAL = settings.daemon_poll_interval
    DAEMON_EXECUTE_TIMEOUT = settings.daemon_execute_timeout
    DAEMON_MAX_WORKERS = settings.daemon_max_workers
    DAEMON_AUTO_EXECUTE = settings.daemon_auto_execute
    DAEMON_SKIP_SIMULATE = settings.daemon_skip_simulate
    PROMISE_DAEMON_ONLY = settings.promise_daemon_only
    PROMISE_DELAY_BEFORE_EXECUTE = settings.promise_delay_before_execute
    LOG_LEVEL = settings.log_level
    LOG_FORMAT = settings.log_format
    
    # Provider configuration exports
    PROVIDERS_CONFIG = settings.providers_config
    DEFAULT_PROVIDER = settings.default_provider
    ENABLE_FALLBACK = settings.enable_fallback
    PROVIDER_TIMEOUT = settings.provider_timeout
    Z_AI_API_KEY = settings.z_ai_api_key or ''
    Z_AI_BASE_URL = settings.z_ai_base_url
    Z_AI_MODEL = settings.z_ai_model
    OPENROUTER_API_KEY = settings.openrouter_api_key or ''
    GROQ_API_KEY = settings.groq_api_key or ''
    HF_TOKEN = settings.hf_token or ''
    COHERE_API_KEY = settings.cohere_api_key or ''

    # Cleanup configuration exports
    LOG_RETENTION_DAYS = settings.log_retention_days
    RESULT_RETENTION_DAYS = settings.result_retention_days
    PROMISE_RETENTION_DAYS = settings.promise_retention_days
    CLEANUP_INTERVAL_HOURS = settings.cleanup_interval_hours
    ENABLE_CLEANUP = settings.enable_cleanup

else:
    # Use legacy configuration
    legacy = LegacyConfig()
    PROXY_PORT = legacy.PROXY_PORT
    PROXY_HOST = legacy.PROXY_HOST
    OLLAMA_HOST = legacy.OLLAMA_HOST
    OLLAMA_MODEL = legacy.OLLAMA_MODEL
    OLLAMA_TIMEOUT = legacy.OLLAMA_TIMEOUT
    OLLAMA_MODELS = legacy.OLLAMA_MODELS
    OLLAMA_KEEP_ALIVE = legacy.OLLAMA_KEEP_ALIVE
    OLLAMA_IDLE_TIMEOUT = legacy.OLLAMA_IDLE_TIMEOUT
    OLLAMA_AUTO_START = legacy.OLLAMA_AUTO_START
    STORAGE_DIR = legacy.STORAGE_DIR
    PROMISES_DIR = legacy.PROMISES_DIR
    FORWARD_TIMEOUT_SECONDS = legacy.FORWARD_TIMEOUT_SECONDS
    FORWARD_TIMEOUT = None if legacy.FORWARD_TIMEOUT_SECONDS == 0 else legacy.FORWARD_TIMEOUT_SECONDS
    PROMISE_TTL_SECONDS = legacy.PROMISE_TTL_SECONDS
    PROMISE_MAX_WORKERS = legacy.PROMISE_MAX_WORKERS
    AI_HUB_CONFIG = legacy.AI_HUB_CONFIG
    OLLAMA_SERVER_HEADER = legacy.OLLAMA_SERVER_HEADER
    SIMULATION_ENABLED = legacy.SIMULATION_ENABLED
    SIMULATION_DATA_PATH = legacy.SIMULATION_DATA_PATH
    HEALTH_CHECK_INTERVAL = legacy.HEALTH_CHECK_INTERVAL
    HEALTH_CHECK_TIMEOUT = legacy.HEALTH_CHECK_TIMEOUT
    
    # Daemon configuration exports (Legacy)
    DAEMON_ENABLED = legacy.DAEMON_ENABLED
    DAEMON_POLL_INTERVAL = legacy.DAEMON_POLL_INTERVAL
    DAEMON_EXECUTE_TIMEOUT = legacy.DAEMON_EXECUTE_TIMEOUT
    DAEMON_MAX_WORKERS = legacy.DAEMON_MAX_WORKERS
    DAEMON_AUTO_EXECUTE = legacy.DAEMON_AUTO_EXECUTE
    DAEMON_SKIP_SIMULATE = legacy.DAEMON_SKIP_SIMULATE
    PROMISE_DAEMON_ONLY = getattr(legacy, 'PROMISE_DAEMON_ONLY', True)
    PROMISE_DELAY_BEFORE_EXECUTE = legacy.PROMISE_DELAY_BEFORE_EXECUTE
    LOG_LEVEL = legacy.LOG_LEVEL
    LOG_FORMAT = legacy.LOG_FORMAT
    
    # Provider configuration exports (Legacy)
    PROVIDERS_CONFIG = legacy.PROVIDERS_CONFIG
    DEFAULT_PROVIDER = legacy.DEFAULT_PROVIDER
    ENABLE_FALLBACK = legacy.ENABLE_FALLBACK
    PROVIDER_TIMEOUT = legacy.PROVIDER_TIMEOUT
    Z_AI_API_KEY = legacy.Z_AI_API_KEY
    Z_AI_BASE_URL = legacy.Z_AI_BASE_URL
    Z_AI_MODEL = legacy.Z_AI_MODEL
    OPENROUTER_API_KEY = legacy.OPENROUTER_API_KEY
    GROQ_API_KEY = legacy.GROQ_API_KEY
    HF_TOKEN = legacy.HF_TOKEN
    COHERE_API_KEY = legacy.COHERE_API_KEY

    # Cleanup configuration exports (Legacy)
    LOG_RETENTION_DAYS = legacy.LOG_RETENTION_DAYS
    RESULT_RETENTION_DAYS = legacy.RESULT_RETENTION_DAYS
    PROMISE_RETENTION_DAYS = legacy.PROMISE_RETENTION_DAYS
    CLEANUP_INTERVAL_HOURS = legacy.CLEANUP_INTERVAL_HOURS
    ENABLE_CLEANUP = legacy.ENABLE_CLEANUP
    
    settings = legacy

# Ensure PROMISE_DAEMON_ONLY always exported (backward compat)
if 'PROMISE_DAEMON_ONLY' not in dir():
    PROMISE_DAEMON_ONLY = True
if 'PROMISE_DELAY_BEFORE_EXECUTE' not in dir():
    PROMISE_DELAY_BEFORE_EXECUTE = 2.0


def ollama_upstream_base() -> str:
    """Return OLLAMA_HOST with no trailing slash (for appending /path)."""
    h = OLLAMA_HOST
    return (h.rstrip("/") or h) if h else h


# ===========================================
# Validation Function
# ===========================================

def validate_config() -> bool:
    """
    Validate current configuration.
    
    Returns:
        True if valid, False otherwise.
    """
    if not HAS_PYDANTIC:
        _config_log.warning("pydantic not installed — cannot validate configuration")
        return True
    
    try:
        Settings()
        return True
    except ValidationError as e:
        for err in e.errors():
            loc = ".".join(str(x) for x in err.get("loc", ()))
            _config_log.error("validate_config: %s — %s", loc, err.get("msg"))
        return False


def print_config() -> None:
    """Print current configuration values."""
    print("=" * 60)
    print("AI Proxy Configuration")
    print("=" * 60)
    print()
    print(f"  Proxy Port:           {PROXY_PORT}")
    print(f"  Proxy Host:           {PROXY_HOST}")
    print(f"  Ollama Host:          {OLLAMA_HOST}")
    print(f"  Ollama Model:         {OLLAMA_MODEL}")
    print(f"  Ollama Timeout:       {OLLAMA_TIMEOUT}s")
    print(f"  Storage Directory:    {STORAGE_DIR}")
    print(f"  Promises Directory:   {PROMISES_DIR}")
    print(f"  Promise TTL:          {PROMISE_TTL_SECONDS}s")
    print(f"  Max Workers:          {PROMISE_MAX_WORKERS}")
    print(f"  Simulation Enabled:   {SIMULATION_ENABLED}")
    print(f"  Log Level:            {LOG_LEVEL}")
    print(f"  Log Format:           {LOG_FORMAT}")
    print()
    print("=" * 60)


if __name__ == '__main__':
    print_config()
