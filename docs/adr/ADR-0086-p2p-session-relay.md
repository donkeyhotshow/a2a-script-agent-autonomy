# ADR-0086: P2P Session Relay

## Status
Proposed

## Context
A2A currently relies on a single server for session management. To scale and support multiple users/agents in a distributed environment, we need a P2P relay mechanism.

## Decision
Implement a `PeerRelay` service using (or simulating) libp2p. Agents and operators can join "rooms" to share session state and messages in real-time.

## Consequences
- Distributed session scale (1000+ users).
- Resilient to single-server failure.
- Foundation for multi-operator collaborative coding.
