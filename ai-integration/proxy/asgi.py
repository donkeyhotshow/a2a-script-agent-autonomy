"""
ASGI adapter for the Flask-based proxy so `uvicorn` can host it.
"""

from asgiref.wsgi import WsgiToAsgi

from . import app as flask_app  # noqa: E402


application = WsgiToAsgi(flask_app)
