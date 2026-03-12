# Changelog

## [2026-03-12]

### Fixed
- **A2A Server endpoints**: Changed `/invoke` to `/api/v1/invoke` for proper API versioning
- **Invoke service**: Fixed result priority in `invoke.service.ts` to correctly prioritize response data
- **Promise routes**: Added Ollama status check in `promise_routes.py` for health monitoring

### Added
- **Session storage**: Added messages history support in `session.json`
- **Message persistence**: Sessions now store complete message history for better debugging and continuity
