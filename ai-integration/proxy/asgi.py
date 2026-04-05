"""
ASGI adapter for the Flask-based proxy so `uvicorn` can host it.
"""

from asgiref.wsgi import WsgiToAsgi

from .logging_setup import ensure_file_log_handler  # noqa: E402

ensure_file_log_handler()

from . import app as flask_app  # noqa: E402


application = WsgiToAsgi(flask_app)
