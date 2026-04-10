# Orchestrator Dialog Simulation

## Type: AI-Actions

This simulation exercises the new orchestrator-dialog branch. The agent confirms the goal, reads an ADR canonicalization
doc, and returns an action plan for auditing documentation.

## Flow Outline

1. The client requests an orchestrator-style assist. The server offers a choice that includes orchestrator-dialog.
2. The user picks orchestrator-dialog and describes the need: read ADR-0027 and outline how to check documentation
   consistency. The server switches execution to orchestrator-dialog and requests the message.
3. The AI proposes reading docs/adr/ADR-0027-documentation-canonical-sources.md, so the server returns
   execute.read-file.
4. The client delivers the ADR contents and the server replies with a plan summary, concluding the scenario.

## Purpose

Cover routing -> mode selection -> ADR ingestion -> plan summary so the orchestrator-dialog path has a golden flow.

## File layout

Each step folder mirrors other simulations with client.json / request.json / response.json / received.json so the
pipeline is easy to follow.
