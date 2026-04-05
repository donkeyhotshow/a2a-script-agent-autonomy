"""
Promise Routes Module
Contains Flask route handlers for promise management and async request handling

This module imports routes from focused sub-modules for better organization:
- promise_execution.py: Execution logic
- promise_api_routes.py: API endpoints (non-UI)
- promise_ui_routes.py: UI-specific endpoints
- promise_management_routes.py: Management/viewer endpoints
"""

# Import all route modules to register routes with Flask app
from . import promise_execution  # noqa: F401
from . import promise_api_routes  # noqa: F401
from . import promise_ui_routes  # noqa: F401
from . import promise_management_routes  # noqa: F401

# Routes are now organized in separate modules for better maintainability:
# - promise_api_routes.py: Core API endpoints for promise operations
# - promise_ui_routes.py: UI-specific endpoints for promise management
# - promise_management_routes.py: Management/viewer API endpoints
# - promise_execution.py: Execution logic and background processing