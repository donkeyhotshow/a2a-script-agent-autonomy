# A2A Autonomous Agents Orchestrator with Memory

> **Autonomy-first, session-driven repo-improvement agent with single-entry orchestration**

---

## Overview

**Project Goal:** Reduce failed or user-aborted session runs by **30% within 30 days** after release.

This document defines the complete specification for an autonomy-first, session-driven agent that continuously improves a repository with:

- Deterministic safety gating
- Durable async waiting/resume
- Loop-safe autonomy downgrades
- Memory-enriched planning
- Dry-run deviation control
- Donecriteria validation
- Branch-isolated delivery

---

## Objective

Enable operators and developers to run an autonomy-first, session-driven agent that continuously improves a repository with:

| Capability | Description |
|---|---|
| Deterministic safety gating | Confidence-gated transitions with bounded retry logic |
| Durable async waiting/resume | Checkpoint-backed Waiting steps with expiry + resume |
| Loop-safe autonomy downgrades | Loop detection triggers predictable downgrade paths |
| Memory-enriched planning | Episodic recall + PatternStore + LessonStore injection |
| Dry-run deviation control | Material deviation tracking with severity and required actions |
| Donecriteria validation gate | Machine-verifiable donecriteria blocks merge even if tests pass |
| Branch-isolated delivery | No direct push to main; all delivery via isolated branches |

---

## User Journey

### Operator / Developer (Web UI via root orchestrator)

#### 1. Starting the Stack

- Starts the live stack from the repo root using the standard orchestration entrypoint:
  ```
  npm run dev  /  start-all.*
  ```
- Port allocation/cleanup handled by the repo's **port manager**
- Opens the Web UI using repo-standard ports/env defined in `.env.example` and `docs/ENV-MATRIX.md`

#### 2. Project & Session Setup

- Creates or selects a **Project** and **Session** in the Projects Panel
- Session creation modal provided as needed
- Lands in the **Session Window** with the task input focused

#### 3. Live Execution Panels

Operator observes live execution across the repo-standard panels (floating/dockable UI patterns):

| Panel | Purpose |
|---|---|
| **Session Window** | Task input, status, pause/resume, cancel/stop |
| **Task Flow Panel** | Step-by-step flow cards, Waiting steps, gating outcomes |
| **Terminal Panel** | Execution logs |
| **Storage Panel** | StepStorage / ArtifactStore / CheckpointStore artifacts, download/browse |
| **Notification Center + Modal Dialogs** | Errors, confirmations, critical approvals |

#### 4. Autonomy-First (Default) Mode

Operator runs in Autonomy-first mode and:

- Watches the **continuous loop**: `scan → generate → execute → reflect` without prompting each cycle
- Gets interrupted **only** at deterministic trigger points:
  - Ambiguous task classification — agent asks exactly **one** clarification question
  - Confidence below gate after bounded Self-Correction (≤ 3 attempts)
  - Irreversible failure / blacklisted action blocked by policy
  - SelfFix exhausted (all 3 attempts fail with no convergence)

#### 5. Structured Evidence in Storage / Task Flow

When paused, operator inspects structured evidence emitted into Storage/Task Flow:

| Artifact | Description |
|---|---|
| `CONFIDENCE_TRACE` | Confidence score history and gate outcomes |
| `EXECUTION_DECISION` | Routing and action decisions |
| `WAITING_STATE` | Expiry + resume target for async waits |
| `LOOP_SIGNAL` | Loop detection signals and downgrade events |
| `TRACE_RISK` | Risk signals from InternalTrace |
| `DRYRUN_DELTA` | Material deviations: step-type change, approval-type change, unverifiable tool, or confidence band shift ≥ 0.15 |
| `ROLLBACK_LESSON` | Post-rollback lessons for future planning |
| `MEMORY_INFLUENCE` | Episodic recall and PatternStore context injected into planning |

#### 6. Operator-Submitted Tasks (Pre-Flight UX)

1. Enters a manual task in the Session Window and submits
2. Reviews **Task Improvement Analyzer** suggestions before execution
3. Reviews deterministic **Dry Run PlanGraph preview** — predicted interruption classes:
   - Confidence pauses
   - Approvals
   - Unverifiable tools
   - Critical blockers
4. Clicks **"Approve Plan → Start Live Run"** (start signal only; HumanLayer is **not** bypassed)
5. Optionally sets `preflightskip` per session to bypass improvement + dry run

#### 7. Hybrid HITL (Exception Path)

- Escalations create a first-class **Waiting step** for the blocked run
- Modal dialogs appear **only** for critical approval types (per HumanLayer policy)
- Non-critical approvals surface via non-blocking UI
- Resolution resumes from a durable checkpoint or deterministically stops/escalates

---

## Autonomous Agent Runtime

### Architecture

The runtime operates under a **single-entry orchestration authority** coordinating:
- Scan
- Task generation
- Execution
- Async waiting/resume
- Validation
- Rollback
- Reflection

All components align with the repo's deterministic orchestration and simulations-first patterns.

### Signal Conversion Pipeline

The agent converts repo + runtime signals into bounded autonomous work:

```
ProjectScanner
    └─► OpportunityDetector
            └─► TaskSynthesizer
                    └─► TaskEnricher
                            └─► SelfCorrectionLoop
                                    └─► AutonomyGates
                                            └─► Execution
```

#### Component Responsibilities

| Component | Responsibility |
|---|---|
| **ProjectScanner** | Emits typed repo signals: git diff, tests, TODO/FIXME, metrics, error logs, plus other repo-supported sources |
| **OpportunityDetector** | Classifies, prioritizes, and deduplicates opportunities |
| **TaskSynthesizer** | Generates goal/context plus machine-verifiable donecriteria (2 retries; suppressed on fail) |
| **TaskEnricher** | Injects top-3 episodic recall + PatternStore + LessonStore context + InternalTrace risk signals + relevant Storage artifacts |
| **SelfCorrectionLoop** | Attempts `BACKTRACK → SWITCH → REFINE` before HumanLayer involvement (≤ 3 attempts) |
| **AutonomyGates** | Routes decisions based on confidence thresholds, loop risk, InternalTrace blockers, waiting state, tool trust routing, and branch-safe delivery feasibility |

---

## Continuous Loop

The agent runs a continuous **scan → generate → execute → reflect** loop:

```
┌─────────────────────────────────────────────┐
│         CONTINUOUS AUTONOMY LOOP            │
│                                             │
│  SCAN ──► GENERATE ──► EXECUTE ──► REFLECT  │
│   ▲                                   │     │
│   └───────────────────────────────────┘     │
│                                             │
│  Interrupted ONLY at deterministic gates    │
└─────────────────────────────────────────────┘
```

### Loop Downgrade Path

When loop risk is detected, the autonomy level is deterministically downgraded:

1. **Full Autonomy** — normal operation
2. **Bounded Autonomy** — Self-Correction engaged (≤ 3 attempts)
3. **Human-in-the-Loop** — Waiting step created, HumanLayer invoked
4. **Stopped** — deterministic stop with LOOP_SIGNAL + ROLLBACK_LESSON

---

## Durable Waiting and Async Resume

**Waiting is a first-class step**, not a blocking pause.

### Waiting Step Properties

- Checkpoint-backed — survives process restarts
- Resumable — deterministic resume from checkpoint with integrity checks
- Non-blocking — does not stall unrelated queued work
- Expiry-aware — every Waiting has an expiry time

### Expiry Policy (Deterministic)

| Expiry Outcome | Action |
|---|---|
| `escalate` | Promote to HumanLayer critical approval |
| `reroute` | Route to alternative resolution path |
| `stop` | Deterministic stop with WAITING_STATE + EXECUTION_DECISION emitted |

### Resume Integrity Checks

On resume from checkpoint:
1. **Checkpoint schema validity** — schema version matches current runtime
2. **Referenced artifacts existence** — all artifact references resolvable in ArtifactStore
3. **Confidence gating re-applies** — confidence threshold check re-runs before execution continues

---

## Confidence & Safety Gating

### Confidence Gate Flow

```
Task arrives
    │
    ├─► Confidence ≥ threshold?
    │       YES → Execute
    │       NO  → SelfCorrectionLoop (attempt 1)
    │                   │
    │                   ├─► BACKTRACK → re-evaluate
    │                   ├─► SWITCH    → alternative approach
    │                   └─► REFINE    → narrow scope
    │
    ├─► After ≤3 attempts, confidence still below gate?
    │       YES → HumanLayer Waiting step
    │       NO  → Execute
    │
    └─► Irreversible / blacklisted action?
            YES → Hard stop + TRACE_RISK emitted
```

### Confidence Trace Artifacts

Every confidence evaluation emits a `CONFIDENCE_TRACE` artifact containing:
- Score at each gate check
- Gate threshold at time of evaluation
- Self-Correction attempt number (if applicable)
- Final routing decision

---

## Dry-Run Deviation Tracking

### Material Deviations (DRYRUN_DELTA)

A `DRYRUN_DELTA` artifact is emitted when any of the following occur between dry run and live run:

| Deviation Type | Severity | Required Action |
|---|---|---|
| Step-type change | `moderate` | `re-evaluate` |
| Approval-type change | `moderate` | `re-evaluate` |
| Confidence band shift ≥ 0.15 | `moderate` | `re-evaluate` |
| Unverifiable tool introduced | `critical` | `stop + HumanLayer` |
| HumanLayer bypass attempt | `critical` | `stop + HumanLayer` |
| Donecriteria unverifiability | `critical` | `stop + HumanLayer` |
| Branch-safety violation | `critical` | `stop + HumanLayer` |
| Minor structural drift | `minor` | `continue` |

### Severity → Required Action Mapping

| Severity | Required Action |
|---|---|
| `minor` | Continue execution |
| `moderate` | Re-evaluate plan; operator notified |
| `critical` | Hard stop; HumanLayer invoked |

---

## Donecriteria Validation Gate

### Validation Pipeline

```
Execution Complete
    │
    └─► ValidationPipeline
            │
            ├─► Unit tests
            ├─► Integration tests
            ├─► Simulation checks
            ├─► Regression checks
            └─► Donecriteria verification ← REQUIRED
                        │
                        ├─► PASS → Proceed to delivery
                        └─► FAIL → Block merge/delivery
                                    (even if all tests pass)
```

> **Critical rule**: Merge and delivery are **blocked** if donecriteria fails, even when all unit/integration/simulation/regression tests pass.

---

## Branch-Isolated Delivery

All delivery is **always** branch-isolated:

- No direct push to `main`
- Work is performed on isolated feature/agent branches
- Delivery feasibility checked by AutonomyGates before execution begins
- Branch-safety violations trigger critical `DRYRUN_DELTA` and hard stop

---

## Memory-Enriched Planning

### Memory Sources Injected via TaskEnricher

| Source | Content | Quantity Injected |
|---|---|---|
| **Episodic memory** | Past task runs, outcomes, and timings | Top-3 most relevant |
| **PatternStore** | Recurring code and task patterns | Relevant patterns |
| **LessonStore** | Post-rollback lessons and failure learnings | Relevant lessons |
| **InternalTrace risk signals** | Live risk assessments from current session | All active signals |
| **Storage artifacts** | Relevant existing artifacts from ArtifactStore | Referenced artifacts |

### MEMORY_INFLUENCE Artifact

Every planning phase emits a `MEMORY_INFLUENCE` artifact documenting:
- Which memory sources were injected
- Which episodic recalls were surfaced
- How plan structure was modified by memory context

---

## Canonical Artifacts

The runtime produces canonical artifacts for auditability and UI rendering:

| Artifact | Trigger | Consumers |
|---|---|---|
| `CONFIDENCE_TRACE` | Every confidence gate evaluation | Task Flow Panel, Storage Panel |
| `EXECUTION_DECISION` | Every routing decision | Task Flow Panel, Storage Panel |
| `WAITING_STATE` | Every Waiting step creation / expiry | Task Flow Panel, Notification Center |
| `LOOP_SIGNAL` | Loop detection or downgrade | Task Flow Panel, Storage Panel |
| `TRACE_RISK` | InternalTrace blocker detected | Notification Center, Storage Panel |
| `DRYRUN_DELTA` | Material deviation between dry run and live | Task Flow Panel, Modal (if critical) |
| `ROLLBACK_LESSON` | Post-rollback | LessonStore, Storage Panel |
| `MEMORY_INFLUENCE` | Every planning phase | Task Flow Panel, Storage Panel |

---

## Session Quality & Safety Metrics

Session summaries report the following metrics:

| Metric | Description |
|---|---|
| **End reason distribution** | Breakdown of how sessions ended (success, stop, escalate, rollback, user abort) |
| **Waiting resolution time (p50/p95)** | Latency percentiles for Waiting step resolution |
| **Validation pass rates** | % of tasks passing donecriteria + test suite |
| **Rollback rate** | % of executed tasks requiring rollback |
| **Regressions prevented** | Count of regressions caught by validation pipeline |
| **Autonomy downgrade frequency** | Rate of loop-triggered autonomy downgrades per session |
| **Dry-run deviation rate** | % of tasks with DRYRUN_DELTA artifacts |
| **Loop interruption rate** | Rate of loop interruptions per cycle |
| **Confidence-below-gate rate** | % of confidence checks falling below gate threshold |
| **MTTR** | Mean time to resolution for blocked/waiting runs |

---

## Features

### In Scope

| Feature | Description |
|---|---|
| **Single-entry orchestration** | All agent work coordinated from one entrypoint |
| **Confidence-gated transitions** | Deterministic routing based on confidence scores |
| **Bounded self-correction loop** | BACKTRACK → SWITCH → REFINE, max 3 attempts |
| **Loop detection downgrade** | Automatic autonomy downgrade on detected loops |
| **Durable waiting and resume** | Checkpoint-backed Waiting steps with integrity checks |
| **Waiting expiry reroute** | Deterministic expiry policy: escalate / reroute / stop |
| **Memory-enriched task planning** | Episodic recall + PatternStore + LessonStore injection |
| **Dry-run deviation detection** | DRYRUN_DELTA with severity and required actions |
| **Donecriteria validation gate** | Machine-verifiable donecriteria blocks delivery |
| **Branch-isolated delivery** | All delivery via isolated branches, no direct main push |

### Out of Scope

| Feature | Reason |
|---|---|
| Separate world-model service | Out of architectural scope |
| Typed evaluator suite | Out of scope for initial release |
| Policy self-mutation engine | Safety risk; excluded by design |
| Unbounded parallel agents | Loop risk and resource safety constraints |

---

## Pre-Flight UX Flow

```
Operator submits task
        │
        ▼
Task Improvement Analyzer
   (suggestions surfaced)
        │
        ▼
Dry Run PlanGraph Preview
   - Predicted confidence pauses
   - Predicted approval gates
   - Predicted unverifiable tools
   - Predicted critical blockers
        │
        ▼
Operator clicks "Approve Plan → Start Live Run"
        │
        ├─► preflightskip = true  →  Skip improvement + dry run
        └─► preflightskip = false →  Full pre-flight (default)
```

> **Note:** "Approve Plan → Start Live Run" is a **start signal only**. HumanLayer is never bypassed by this action.

---

## HumanLayer Integration

HumanLayer governs all human-in-the-loop interactions:

- **Critical approval types** → Modal dialog (blocking UX)
- **Non-critical approvals** → Non-blocking UI notification
- **SelfFix exhausted** → Mandatory HumanLayer Waiting step
- **DRYRUN_DELTA critical** → Mandatory HumanLayer Waiting step
- **Waiting expiry (escalate policy)** → HumanLayer critical approval

The agent **never** bypasses HumanLayer. Any detected bypass attempt triggers a critical `DRYRUN_DELTA` and hard stop.

---

## Environment & Configuration

- Stack entrypoint: `npm run dev` / `start-all.*`
- Port management: repo port manager
- Environment: `.env.example` and `docs/ENV-MATRIX.md`
- Session `preflightskip`: per-session boolean flag

---

*Document compiled from project specification. All behaviors described are deterministic and auditable via canonical artifact trail.*
