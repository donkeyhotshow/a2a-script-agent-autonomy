# a2a-ai-hub — background daemon

| Module | Responsibility |
|--------|------------------|
| [`../proxy/daemon.py`](../proxy/daemon.py) | `PromiseDaemon`: background thread polls pending proxy promises and auto-executes work against the local proxy API. |

Configurable via env in `proxy/config.py` (`DAEMON_*`).
