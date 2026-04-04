# TICKET-0003: Expand Memory Architecture

## Goal
Implement a more robust memory architecture to enable the A2A server to maintain state across long-running autonomous loops, referencing the 'Everything Claude Code' and 'ToT' patterns regarding memory.

## Context
Currently, the system is primarily stateless and passes the `RequestContext` around. To support complex reasoning loops, we need to implement a mechanism for maintaining short-term, working, and long-term memory records for active agent loops. 

## Tasks
- [ ] Determine the storage mechanism for memory (e.g., lightweight SQLite, structured files in `brain/`, or in-memory vector store).
- [ ] Implement `MemoryService` in `a2a-server/src/services/memory`.
- [ ] Integrate Memory retrieval into `GrayRoomOrchestrator` to provide context for LLM sidecar queries.
- [ ] Add tests to verify memory insertion and retrieval.

## Verification
- Run a simulated multi-step dialog with memory dependencies and confirm that context is retrieved accurately in subsequent steps.
