# ADR-0074: Thread Manager (RA.Aid Background)

## Status
Approved

## Context
The current orchestrator runs in a single-threaded event loop. To scale to multi-agent swarm operations or long-running parallel tasks, a better concurrency model is needed.

## Decision
Implement a `ThreadManager` service that leverages Node.js `worker_threads`. This allows spawning background agents that don't block the main server thread.

## Implementation
- `ThreadManager.spawnBackground(task, priority)`
- IPC for status updates and result collection.
- Thread-safe access to session storage.

## Consequences
- Higher throughput for complex tasks.
- Isolation of heavy compute tasks.
