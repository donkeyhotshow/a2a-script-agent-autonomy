# A2A Autonomous Agents Orchestrator with Memory — Master Specification
> Consolidated master document combining architecture, user journey, runtime behavior, artifacts, safety gates, memory systems, validation, rollback, observability, and extended feature contracts.
---
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

---

## Consolidated Source 2

# A2A Features: HumanLayer, Loop Detection, Episodic Memory, Scanner

> 10 feature specifications for A2A Autonomous Agents Orchestrator [web:3][web:7][web:11]

Собраны User Stories, Acceptance Criteria, Dependencies и Edge Cases для ключевых фич: HumanLayer Confidence Handoff, Loop Detection, Episodic Memory (Index/Recall), InternalTrace, A2A Protocol, Blockers, Task Improvement Analyzer, Dry Run Preview и Project Scanner. [web:4][web:8][web:9]

---

## 1. HumanLayer Confidence Handoff [web:2][web:4][web:8]

**User Story:**  
As an operator, I want low-confidence or blocked outcomes to trigger a HumanLayer-governed handoff so that the task run pauses safely for clarification or approval and can resume without losing context.

**Acceptance Criteria:**
- At every routing point, system writes CONFIDENCE_TRACE and EXECUTION_DECISION [web:8].
- Below-gate confidence - WAITING_STATE artifact: reason, created_at, expires_at, resume_target, required_inputs, humanlayer_approval_type.
- triggered_criteria: deterministic JSON array {code, source_artifact, details, severity}.
- Strict priority order for humanlayer_approval_type: CRITICAL_PATH > EXTERNAL_CALL > DATA_ACCESS > ESCALATION > DELEGATION > ACTION_APPROVAL > TEXT_APPROVAL.
- UI shows primary type + count triggered_criteria; Storage - full list.
- Modal only for DATA_ACCESS, EXTERNAL_CALL, CRITICAL_PATH.
- Resume - new EXECUTION_DECISION with post-resume routing.

**Dependencies:** Confidence Score Contract, Waiting Orchestration and Resume.

**Edge Cases:**
- HumanLayer reject - EXECUTION_DECISION decision=stop.
- Modal close without resolution - Waiting remains active.
- Expiry - WAITING_STATE_EVENT state=expired + expiry policy [web:6].

---

## 2. Loop Detection and Interrupt [web:16]

**User Story:**  
As an operator, I want the system to detect repeated action patterns and interrupt the task run so infinite loops surface early.

**Acceptance Criteria:**
- Loop detected: identical triple 3x consecutively (tool_or_action + outcome_class + context_segment).
- LOOP_SIGNAL: triple, repeat_count=3, loop_type=in_run, severity.
- Severity moderate or critical - EXECUTION_DECISION decision=wait + WAITING_STATE with humanlayer_approval_type=ESCALATION.
- Task Flow: interrupt step - LOOP_SIGNAL + WAITING_STATE.
- Terminal: triple + severity.

**Dependencies:** HumanLayer Confidence Handoff.

**Edge Cases:**
- Normalization for equivalent triples.
- Repeat after resolve - new LOOP_SIGNAL, severity to critical.
- Operator stop - EXECUTION_DECISION decision=stop.

---

## 3. Index Episodic MEM_STORE [web:9]

**User Story:**  
As an operator, I want episodic memory entries stored as artifacts and indexed into the memory backend so past outcomes are searchable with provenance.

**Acceptance Criteria:**
- Per completed run: EPISODIC_ENTRY {observation, outcome, reflection, task_run_id, timestamp}.
- Storage: summary + provenance.
- Index - MEMORY_INDEX_RESULT (success/fail).
- Backend unavailable - status=failed, reason_code=backend_unavailable.
- Invalid JSON - fallback + reason_code=invalid_json.

**Dependencies:** None.

**Edge Cases:**
- Dedup same task_run_id.
- Sensitive content - redaction=true.
- Index success, artifact fail - reason_code=missing_episodic_evidence.

---

## 4. Recall Episodic Episodes [web:9]

**User Story:**  
As an operator, I want episodic recall to query the memory backend so the agent references relevant prior episodes during enrichment with explicit provenance.

**Acceptance Criteria:**
- Per task: SEMANTIC_EXTRACT key facts + constraints + provenance.
- Recall - EPISODIC_RECALL_RESULT: episodes, similarity threshold, ordered list.
- Task Flow: recall step with summaries or results_count=0.
- Backend unavailable - backend_unavailable=true, fallback in MEMORY_INFLUENCE.integrity.

**Dependencies:** Index Episodic MEM_STORE.

**Edge Cases:**
- Too many matches - total_count + returned_count.
- Long input - truncation=true.
- Recall fail - status=failed, fallback.

---

## 5. InternalTrace Risk Injection [web:14]

**User Story:**  
As an operator, I want InternalTrace risk outputs to influence enrichment and self-correction so the agent selects safer approaches before execution.

**Acceptance Criteria:**
- Above threshold - TRACE_RISK: complexity, risks[], alternatives[], recommended_path.
- EXECUTION_DECISION references TRACE_RISK or missing.
- Enrichment: risk summary - MEMORY_INFLUENCE.applied.risk_mitigations.
- High-risk - route to alternative or Waiting.
- Missing/invalid - Waiting reason=missing_risk_evidence.

**Dependencies:** Enrichment with Memory Risks, Bounded Self Correction.

**Edge Cases:**
- Low-risk - empty high-risk set.
- Malformed - invalid integrity, treat as missing.
- Empty alternatives - ESCALATION.

---

## 6. Adopt A2A Protocol v2 [web:7][web:11][web:15]

**User Story:**  
As an operator, I want multi-agent messaging to conform to A2A v2.0 so that context exchange and handoffs are traceable and schema-valid.

**Acceptance Criteria:**
- Outbound: A2A v2 shape {version, message_id, sender_id, target_id, capability, type, payload, context_state, priority}.
- Missing identity - reject + A2A_MESSAGE_ERROR.
- Types: handoff, status, error, request, response.
- Legacy - A2A_MESSAGE_NORMALIZED.
- Terminal: message_id, version, type, sender/target_id, priority.

**Dependencies:** None.

**Edge Cases:**
- target_id=null - accept.
- context_state missing - {}.
- Unknown - type=error.

---

## 7. Blockers into MetaReasoner

**User Story:**  
As an operator, I want the meta-reasoner to receive real blocker signals so strategy selection responds to the current blocking condition and avoids repeats.

**Acceptance Criteria:**
- Per strategy selection: BLOCKER_SET.categories[] {missing_info, policy_wait, policy_reject, tool_failure, loop_detected, high_risk_subtask, low_confidence}.
- Active Waiting - policy_wait.
- HumanLayer reject - policy_reject.
- LOOP_SIGNAL - loop_detected + new strategy_fingerprint.
- Task Flow: strategy label + primary blocker - BLOCKER_SET.

**Dependencies:** HumanLayer, InternalTrace, Loop Detection.

**Edge Cases:**
- Multiple - deterministic primary_blocker priority.
- Meta-reasoner missing - fallback_safe.
- Tool failure retries - tool_failure until success.

---

## 8. Task Improvement Analyzer

**User Story:**  
As an operator, I want the system to analyze my task formulation before execution and suggest clearer alternatives so ambiguous instructions produce fewer mid-run clarifications.

**Acceptance Criteria:**
- Preflight enabled - PREFLIGHT_IMPROVEMENT: issues[], suggestions[] (text + confidence_gain).
- UI choice: accepted/edited/run_as_written.
- Skip - reason_code=preflight_skipped.
- Fail - status=failed.

**Dependencies:** Confidence Score Contract.

**Edge Cases:**
- Short task - empty issues/suggestions.
- Long - truncated=true.
- Edit - edited=true.

---

## 9. Dry Run Plan Preview [web:8]

**User Story:**  
As an operator, I want to preview a dry-run execution plan before a task run starts so approvals, pauses, and risky tool usage are visible before live execution.

**Acceptance Criteria:**
- Preflight - DRYRUN_PLANGRAPH: steps {type, confidence band, approval type, tools, unverifiable}.
- UI preview + explicit start - EXECUTION_DECISION, no bypass.
- No side effects; mockless tools - unverifiable.
- Skip - reason_code=preflight_skipped.

**Dependencies:** Tool Safety Execution Layer.

**Edge Cases:**
- Mid-fail - partial + reason.
- No interruptions - [].
- Start then close - artifacts remain.

---

## 10. Project Scanner Signals

**User Story:**  
As an operator, I want the agent to continuously scan a repository for actionable signals so it generates autonomous improvements without manual prompting.

**Acceptance Criteria:**
- Cycle - SCAN_RESULT: scanned_sources[], discovered_signals[], stable IDs.
- Consume LESSON.scan_hints - SCAN_HINT_CONSUMPTION.
- Fail - cooldown.
- No signals - no-op outcome.

**Dependencies:** Lesson Schema, Single Orchestrator Kernel.

**Edge Cases:**
- Large set - summary counts.
- Stop mid-scan - no opportunities.
- Identical signals - stable IDs.

---

## Артефакты по фичам [web:3][web:9]

| Фича | Ключевые артефакты |
|---|---|
| HumanLayer | CONFIDENCE_TRACE, WAITING_STATE, triggered_criteria |
| Loop | LOOP_SIGNAL |
| Episodic Index | EPISODIC_ENTRY, MEMORY_INDEX_RESULT |
| Recall | SEMANTIC_EXTRACT, EPISODIC_RECALL_RESULT |
| InternalTrace | TRACE_RISK, MEMORY_INFLUENCE |
| A2A | A2A_MESSAGE_ERROR, A2A_MESSAGE_NORMALIZED |
| Blockers | BLOCKER_SET |
| Analyzer | PREFLIGHT_IMPROVEMENT |
| Dry Run | DRYRUN_PLANGRAPH |
| Scanner | SCAN_RESULT, SCAN_HINT_CONSUMPTION |

---

---

## Consolidated Source 3

# A2A Features Part 2: Opportunity, Validation, Rollback [web:3][web:8][web:12]

> 10 feature specifications (11-20): Opportunity Detection, Donecriteria, Enrichment, Sandbox/Staging/Prod, Validation Gates, Auto Branch, Self Correction, Async Waiting, Tool Safety, Rollback Snapshots.

Полная спецификация для A2A Autonomous Agents Orchestrator с фокусом на приоритизацию, валидацию, безопасность и recovery. [web:7][web:9][web:15]

---

## 11. Opportunity Detection Prioritization

**User Story:**  
As an operator, I want scanned signals classified and prioritized into deduplicated opportunities so autonomous work focuses on the highest-value areas.

**Acceptance Criteria:**
- Scan cycle → OPPORTUNITY_SET: type, target_area, priority_score, source_signal_refs[].
- Dedup via stable opportunity_id; recurrence → update existing.
- Suppression → OPPORTUNITY_SUPPRESSION {opportunity_id, reason_code, expires_at}.
- PATTERN artifacts → effect on weighting in OPPORTUNITY_SET.

**Dependencies:** Project Scanner Signals, Lesson Schema and Scan Hints.

**Edge Cases:**
- Priority unscored → priority_score=0.0, priority_status=unscored.
- Conflicting signals → aggregate refs.
- Excessive recurrence → suppression TTL.

---

## 12. Donecriteria Task Synthesis

**User Story:**  
As an operator, I want the agent to synthesize tasks with mandatory machine-verifiable donecriteria so execution and completion require proof.

**Acceptance Criteria:**
- Opportunity → task {goal, context, opportunity_type, donecriteria}.
- donecriteria mandatory, verifiable types only.
- No valid donecriteria → no execution.
- Synthesis fail → 2 retries; fail → suppress opportunity.
- Task Flow: goal + donecriteria checklist.

**Dependencies:** Opportunity Detection Prioritization.

**Edge Cases:**
- Unsupported types → reject + suppress.
- Duplicate task → suppress.
- Stop mid-synthesis → no queue.

---

## 13. Enrichment with Memory Risks

**User Story:**  
As an operator, I want tasks enriched with episodic recall, PatternStore, LessonStore, and InternalTrace risk signals before execution so autonomous work starts with relevant context and explicit provenance.

**Acceptance Criteria:**
- Pre-execution: top-3 recall + patterns/lessons + InternalTrace summary.
- MEMORY_INFLUENCE: Memory Feedback Contract, integrity.source_available, fallback_used.
- applied.plan_changes[] / risk_mitigations[] → item refs.
- Task Flow: enrichment summary → Storage MEMORY_INFLUENCE.
- Unavailable sources → fallback_used=true, gate check.

**Dependencies:** Recall Episodic Episodes, InternalTrace Risk Injection.

**Edge Cases:**
- No memory → episodic=[].
- Backend down → source_available=false.
- Large context → summary in Flow.

---

## 14. Autonomous Sandbox Staging Prod

**User Story:**  
The system executes autonomous tasks through SANDBOX, STAGING, and PRODUCTION stages so that changes are validated before branch delivery.

**Acceptance Criteria:**
- Task run → ENV_STAGE_TRACE: stage transitions + timestamps.
- SANDBOX → diff evidence or no-op.
- STAGING → validation_result per gate + VALIDATION_SUMMARY.
- PRODUCTION → only if all gates pass; BRANCH_INTEGRITY.
- Block → decision {wait, handoff, stop, rollback}.

**Dependencies:** Auto Branch Commit Merge, Validation Gates and Regression.

**Edge Cases:**
- SANDBOX no diff → no STAGING.
- Missing gates → block PRODUCTION.
- No evidence → block.

---

## 15. Validation Gates and Regression

**User Story:**  
The system enforces deterministic validation gates before any merge to main so regressions and unsafe changes are blocked.

**Acceptance Criteria:**
- Pre-merge → VALIDATION_SUMMARY: gates + pass/fail.
- Gates: unit/integration/simulation/non-regression/donecriteria/pre-merge confidence.
- Fail → block merge + failing gates in EXECUTION_DECISION.
- Task Flow: gates pass/fail + evidence links.

**Dependencies:** Donecriteria Task Synthesis, Confidence Score Contract.

**Edge Cases:**
- No baseline → block.
- Flaky test → block.
- No confidence → confidence=0.0, block.

---

## 16. Auto Branch Commit Merge

**User Story:**  
The system automatically creates branches, commits, and merges changes so autonomous modifications ship safely without manual git operations.

**Acceptance Criteria:**
- Changes → branch + BRANCH_INTEGRITY {branch/commit IDs, goal, validation refs}.
- Merge → VALIDATION_SUMMARY pass + approval in EXECUTION_DECISION.
- No direct main push → policy violation.
- Task Flow/Storage: branch/commit/merge outcome.

**Dependencies:** Autonomous Sandbox Staging Prod, Validation Gates and Regression.

**Edge Cases:**
- Conflict → block + self-correction.
- No changes → no BRANCH_INTEGRITY.
- Git fail → Waiting ESCALATION.

---

## 17. Bounded Self Correction

**User Story:**  
The system enforces a bounded self-correction loop so blocked task runs retry deterministically before escalating to a human.

**Acceptance Criteria:**
- Contract fail → max 3 attempts: SELF_CORRECTION_ATTEMPT {attempt#, strategy (BACKTRACK/SWITCH/REFINE), pre/post confidence, decision}.
- After 3 → Waiting reason=self_correction_exhausted.
- Task Flow: attempts + artifact links.

**Dependencies:** HumanLayer Confidence Handoff.

**Edge Cases:**
- Repeat fingerprint → LOOP_SIGNAL.
- Autonomy stop → finish attempt + stop.
- Operator resolve → resume + new decision.

---

## 18. Async Waiting For Autonomy

**User Story:**  
As an operator, I want autonomous task runs to enter non-blocking Waiting states so the agent continues other eligible work while human intervention is pending.

**Acceptance Criteria:**
- Waiting → WAITING_STATE {expires_at, resume_target} + decision=wait.
- Durable checkpoint pre-Waiting.
- ORCHESTRATOR_CYCLE: active Waitings + next tasks.
- Resolve → resume from checkpoint + new EXECUTION_DECISION.

**Dependencies:** HumanLayer Confidence Handoff, Checkpoint Resume Durability.

**Edge Cases:**
- Restart → integrity checks.
- Multiple Waitings → list in Flow.
- Reject → decision=stop + rejected state.

---

## 19. Tool Safety Execution Layer

**User Story:**  
The system provides a tool safety layer with dry-run, safe execution, and audit logging so autonomous actions are controlled and traceable.

**Acceptance Criteria:**
- Invocation → TOOL_AUDIT {tool, intent, stage, outcome_class, redacted params}.
- Dry-run: no effects, mock/unverifiable.
- Unverifiable in dry-run → DRYRUN_PLANGRAPH.
- Production block без validation.
- Unclassifiable → block + Waiting.

**Dependencies:** Dry Run Plan Preview, Validation Gates and Regression.

**Edge Cases:**
- No dry-run support → unverifiable.
- Prohibited effect → policy violation.
- Repeat fail → LOOP_SIGNAL.

---

## 20. Rollback Snapshots Reverts

**User Story:**  
The system snapshots stable states and rolls back changes when production error conditions are detected so autonomous shipping remains safe.

**Acceptance Criteria:**
- Promotion → SNAPSHOT_RECORD {commit ID, validation}.
- Error → revert to snapshot + ROLLBACK_RECORD {trigger, snapshot ref, outcome}.
- Post-rollback: suppress re-attempt до operator resolve.
- Dependencies: Validation Gates, Observability Metrics.

**Edge Cases:**
- Multiple merges → latest stable snapshot.
- Rollback fail → CRITICAL_PATH Waiting.
- Quick clear → persistence rule.

---

## Ключевые артефакты (Part 2) [web:3][web:12]

| Фича | Артефакты |
|------|-----------|
| 11 Opportunity | OPPORTUNITY_SET, OPPORTUNITY_SUPPRESSION |
| 12 Donecriteria | task.donecriteria |
| 13 Enrichment | MEMORY_INFLUENCE |
| 14 Stages | ENV_STAGE_TRACE, VALIDATION_SUMMARY, BRANCH_INTEGRITY |
| 15 Gates | VALIDATION_SUMMARY |
| 16 Branch | BRANCH_INTEGRITY |
| 17 Correction | SELF_CORRECTION_ATTEMPT |
| 18 Waiting | WAITING_STATE, ORCHESTRATOR_CYCLE |
| 19 Tool | TOOL_AUDIT |
| 20 Rollback | SNAPSHOT_RECORD, ROLLBACK_RECORD |

**Теперь 3 файла всего!** Совместно ~900 строк спецификации A2A.

---

## Consolidated Source 4

# A2A Features Part 3: Limits, Policy, Observability, Final (21-37) [web:3][web:12]

> Финальные фичи A2A: Autonomy Limits, Tool Trust, Lessons, Observability, Session End, Baseline, Confidence Contract, PolicyGuard, Checkpoints, Pattern Decay, Single Orchestrator, API Guard, Drift Detection, Waiting Lifecycle, Confidence Trace, Loop Risk Unified, Scan Hints, DryRun Delta, Donecriteria Verifier.

Полная спецификация (~37 фич). [web:4][web:8][web:9]

---

## 21. Autonomy Limits and Cooldown

**User Story:**  
As an operator, I want configurable autonomy limits and cooldown behavior so continuous operation stays stable and downgrades before damage accumulates.

**Acceptance Criteria:**
- AUTONOMY_LIMITS_STATE per session: concurrency_limit, task_starts_per_cycle, failure_budget.
- Limit reached → EXECUTION_DECISION cooldown + trigger.
- Failure budget exhausted → downgrade.
- Drift downgrades → DRIFT_SIGNAL_SUMMARY ref.

**Dependencies:** Drift Detection Downgrade, Concurrency by Autonomy Level.

**Edge Cases:**
- Mid-session limit change → new AUTONOMY_LIMITS_STATE.
- Cooldown + Waiting → both apply.
- Failures one opportunity → OPPORTUNITY_SUPPRESSION TTL.

---

## 22. Tool Trust and Risk Routing

**User Story:**  
As an operator, I want tool trust and risk routing to influence approval requirements so high-risk tools require HumanLayer governance.

**Acceptance Criteria:**
- TOOL_TRUST_STATE: tool_id, trust_state, risk_tier, execution_history_count.
- High risk_tier → stricter threshold → EXECUTION_DECISION / CONFIDENCE_TRACE.
- Cold-start (new tools): first 5 → HumanLayer; TOOL_AUDIT updates counter.
- Reset → TOOL_TRUST_EVENT, cold-start.

**Dependencies:** Tool Safety Execution Layer, HumanLayer Confidence Handoff.

**Edge Cases:**
- Failures → downgrade trust.
- Write fail → cold-start + Waiting ACTION_APPROVAL.
- Reset active run → subsequent invocations.

---

## 23. Lesson Pattern Artifacting

**User Story:**  
As an operator, I want the system to write LESSON artifacts and surface recurring patterns so autonomous cycles improve and recurring issues are visible.

**Acceptance Criteria:**
- Post-run → LESSON: what_was_done, what_was_learned, affected_area, scan_hints.
- scan_hints → SCAN_HINT_CONSUMPTION next cycle.
- 3 consecutive LESSON → PATTERN linking sources.
- Storage: LESSON / PATTERN + provenance.

**Dependencies:** Project Scanner Signals.

**Edge Cases:**
- Write fail → completion + missing evidence.
- Many patterns → highest-frequency + candidates.
- Missing paths → warning.

---

## 24. Observability Metrics Dashboard

**User Story:**  
As an operator, I want an observability view for autonomous operation so that I can see outcomes, safety interventions, and the evidence artifacts that explain them.

**Acceptance Criteria:**
- EXECUTION_TRACE: phases, decisions, validation, outcome {merged, no_op, waiting, failed, rolled_back, stopped}.
- Task Flow/Storage links: EXECUTION_DECISION, CONFIDENCE_TRACE, validation/diffs/rollback.
- Dashboard counts: tasks, Waiting, rollbacks, loops, downgrades.
- Missing metrics → "unavailable" + list.

**Dependencies:** Validation Gates, Rollback Snapshots.

**Edge Cases:**
- Verbose → summary + drill-down.
- Autonomy off → historical.
- Partial → coverage window.

---

## 25. Baseline Session End Reasons

**User Story:**  
As an operator, I want every session to end with a recorded structured reason so we can measure baseline failure and abort rate.

**Acceptance Criteria:**
- SESSION_END_RECORD: session_id, timestamp, duration, task_run_count, end_reason {completed, error, manual_stop, loop_interrupt, low_confidence_timeout, emergency_stop}.
- UI shows end_reason.
- Fail → warning event.

**Dependencies:** None.

**Edge Cases:**
- Waiting end → manual_stop/emergency_stop.
- Restart → error + restart_marker.
- Duplicates → SESSION_END_RECORD_DUPLICATE.

---

## 26. Baseline Snapshot Metrics

**User Story:**  
As an operator, I want to capture a baseline snapshot of session outcomes and Waiting frequency so post-release changes compare against a known starting point.

**Acceptance Criteria:**
- BASELINE_SNAPSHOT time window: sessions %, Waiting/session, tasks/session.
- Versioned + exportable.
- No stop active sessions.

**Dependencies:** Baseline Session End Reasons.

**Edge Cases:**
- Unavailable → missing flags.
- Partial → coverage + missing.
- Re-run → new snapshot_id.

---

## 27. Confidence Score Contract

**User Story:**  
The system uses a deterministic, configurable Confidence Score contract so continuation, waiting, escalation, and merge decisions are consistent across runs.

**Acceptance Criteria:**
- Load/validate config thresholds.
- Boundary = below threshold.
- Missing/malformed → 0.0 + missing in CONFIDENCE_TRACE.signals.
- Operator vs autonomy thresholds.
- Task Flow: score, threshold, decision.

**Dependencies:** None.

**Edge Cases:**
- Invalid config → last valid + invalid_confidence_config.
- Inconsistency → reject new.
- No signals → 0.0 + Waiting.

---

## 28. PolicyGuard Thresholds Blacklist

**User Story:**  
As an operator, I want a PolicyGuard that enforces confidence-based thresholds and blacklisted actions so irreversible or unsafe operations are blocked by default.

**Acceptance Criteria:**
- POLICY_DECISION: action_class, threshold, confidence, {allow, block}.
- Blacklist → always block + HumanLayer + WAITING_STATE.
- No main push → violation ref EXECUTION_DECISION.
- Task Flow links POLICY_DECISION.

**Dependencies:** Confidence Score Contract, Tool Safety Execution Layer.

**Edge Cases:**
- Unclassifiable → high risk block.
- No confidence → 0.0 block.
- Override → HumanLayer only.

---

## 29. Checkpoint Resume Durability

**User Story:**  
The system persists durable task-run checkpoints so paused runs resume deterministically after Waiting resolution or service restart.

**Acceptance Criteria:**
- Waiting → checkpoint + Storage ref.
- Survives restart, deterministic resume.
- Task Flow/Storage: created/restored + WAITING_STATE.
- Restore fail → ESCALATION Waiting + checkpoint_restore_failed.

**Dependencies:** HumanLayer Confidence Handoff.

**Edge Cases:**
- Write fail → checkpoint_write_failed Waiting.
- Corrupted → no continue.
- Multiple → latest active.

---

## 30. Pattern Decay Relevance

**User Story:**  
As an operator, I want stored patterns to decay in relevance over time so enrichment and opportunity weighting do not overfit to stale behavior.

**Acceptance Criteria:**
- Pattern: relevance_score, last_observed_cycle_id, decay_policy.
- ORCHESTRATOR_CYCLE → PATTERN_DECAY_RESULT: updated + before/after.
- Enrichment → descending score, MEMORY_INFLUENCE.pattern_hits.
- Inactive → score=0.0, visible.

**Dependencies:** Lesson Pattern Artifacting.

**Edge Cases:**
- Zero score → inactive.
- Unavailable → fallback_used=true.
- Epoch reset → epoch_id.

---

## 31. Single Orchestrator Kernel

**User Story:**  
The system provides a single orchestration authority so scan, schedule, execute, waiting resume, validation, rollback, and reflection cannot race.

**Acceptance Criteria:**
- Orchestrator schedules only; ORCHESTRATOR_CYCLE ref.
- Cycle artifact: phases, task_run_ids, Waiting resumes.
- Restart → safe boundary, no dupes.
- Second instance → ORCHESTRATOR_SINGLETON_VIOLATION.

**Dependencies:** Checkpoint Resume Durability.

**Edge Cases:**
- Partial restart → next boundary.
- Disable → stop_autonomy.
- Waiting cooldown → deferred resume.

---

## 32. API Guard Layer

**User Story:**  
As an operator, I want an API Guard layer for external calls so outbound requests are allowlisted, rate-limited, and escalated for dangerous actions.

**Acceptance Criteria:**
- External → API_GUARD_DECISION {allow, block, reason_code}.
- Not allowlist → block + Waiting ref.
- Rate exceed → self-correction or Waiting.
- Guard unavailable → all block + EXTERNAL_CALL.

**Dependencies:** PolicyGuard Thresholds Blacklist.

**Edge Cases:**
- Mid-session update → post-update new list.
- Retries exceed → total count.
- Unknown → dangerous block.

---

## 33. Drift Detection Downgrade

**User Story:**  
As an operator, I want the system to detect autonomy drift and downgrade autonomy level so repetitive low-value work stops.

**Acceptance Criteria:**
- DRIFT_SIGNAL_SUMMARY: repeated_opportunity_rate, repeated_task_rate, autonomous_success_rate.
- Threshold exceed → EXECUTION_DECISION downgrade + metrics + new level.
- Task Flow/Terminal: event + DRIFT_SIGNAL_SUMMARY.
- Upgrade → explicit operator artifact.

**Dependencies:** Autonomy Limits, Opportunity Detection.

**Edge Cases:**
- Waiting drift → future scheduling.
- Burst → no downgrade.
- Disable → record only.

---

## 34. Waiting Lifecycle First-Class

**User Story:**  
As an operator, I want Waiting to be a first-class lifecycle with expiry and deterministic resume routing so paused work is safe, inspectable, and does not stall other work.

**Acceptance Criteria:**
- Enter → WAITING_STATE {reason, created_at, expires_at, resume_target, evidence ref}.
- Transitions → WAITING_STATE_EVENT {waiting, resolved, rejected, expired}.
- Resolve → resume + re-gate EXECUTION_DECISION.
- Expiry → policy outcome EXECUTION_DECISION.
- Autonomy-first: Waiting не blocks unrelated.

**Dependencies:** Checkpoint Resume, HumanLayer, Single Orchestrator.

**Edge Cases:**
- Late resolve post-expiry → new gate.
- Multiple per run → latest active.
- Invalid target → ESCALATION.

---

## 35. Confidence Trace Propagation

**User Story:**  
The system records confidence at every major routing point so continuation, waiting, escalation, and merge decisions are governed by one deterministic contract.

**Acceptance Criteria:**
- CONFIDENCE_TRACE per run at points: post-synthesis, post-enrichment, post-correction, post-deviation, post-validation, pre-merge.
- EXECUTION_DECISION: point, confidence, threshold, {proceed, wait, handoff, stop, downgrade}, evidence.
- No compute → 0.0 + HumanLayer Waiting.

**Dependencies:** Confidence Score Contract, Single Orchestrator.

**Edge Cases:**
- Fluctuate → latest Flow, full Storage.
- Conflicting → lower-wins.
- Write fail → confidence_trace_write_failed, block merge.

---

## 36. Loop Risk Unified Signals

**User Story:**  
The system emits unified loop risk signals so repetition can downgrade autonomy and reroute execution before failure budgets are exhausted.

**Acceptance Criteria:**
- Detect → LOOP_SIGNAL {loop_type {in_run, drive_loop}, severity {minor, moderate, critical}, counters, recommended_action {downgrade, wait, handoff, stop}}.
- Routing → EXECUTION_DECISION ref LOOP_SIGNAL.
- Flow/Terminal: events + LOOP_SIGNAL.
- Suppress opportunity → OPPORTUNITY_SUPPRESSION loop_risk.

**Dependencies:** Loop Detection, Drift, Opportunity.

**Edge Cases:**
- Noisy → threshold only.
- Waiting loop → resume apply.
- Multiple → latest unresolved.

---

## 37. DryRun Delta Deviation Routing

**User Story:**  
As an operator, I want live execution deviations from Dry Run predictions to deterministically change routing so the agent does not proceed on an invalid plan.

**Acceptance Criteria:**
- Diverge → DRYRUN_DELTA {material_deviation, reasons[], severity, predicted/actual confidence, step_diff}.
- Material: step/approval change, unverifiable tool, confidence Δ≥0.15.
- Routing by severity:
  - minor → log continue
  - moderate → re-confidence + self-correction + re-gate
  - critical → stop + HumanLayer {CRITICAL_PATH, ESCALATION}
- Post-deviation → CONFIDENCE_TRACE ref DRYRUN_DELTA.
- 3rd minor → moderate.

**Dependencies:** Dry Run Preview, Confidence Trace, Bounded Self Correction.

**Edge Cases:**
- Partial Dry Run → comparable only.
- Skipped → no delta.
- Critical post-steps → stop further + executed ids.

## 38. Donecriteria Verifier (Bonus)

**User Story:**  
The system verifies donecriteria explicitly during validation so changes cannot be merged when the stated success conditions were not satisfied.

**Acceptance Criteria:**
- Pipeline → DONECRITERIA_RESULT per criterion.
- Other pass + any fail → block merge + failed IDs.
- Flow: per criterion pass/fail.
- Unevaluable → fail.

**Dependencies:** Validation Gates, Donecriteria Synthesis.

**Edge Cases:**
- Missing evidence → fail.
- Single → one entry.
- Inconsistent → fail.

---

## Итог коллекции A2A (38 фич)

**Файлы** (всего ~1400 строк):
1. Основная архитектура (444)
2. Фичи 1-10 (232) [code_file:17]
3. Фичи 11-20 (225) [code_file:18]
4. Фичи 21-38 (эта) [code_file:19]

Полная спецификация готова! [web:3]

---

## Consolidated Source 5

# A2A Features Final Extensions [web:3][web:8][web:12]

> Дополнительные фичи (~15): Rollback Lessons, Confidence Boundary, Task Flow Confidence, Drive Loops, Opportunity Suppression TTL, Memory Influence Canonical, Episodic Ranking, Tool Mock Scoring, Branch Integrity, Drift Warnings, Autonomy Loop, Ambiguous Clarification, Session Summary KPIs, Deviation Severity Mapping, Artifact Index, Waiting Policy, Donecriteria Catalog, KPI Measurement.

Завершающие спецификации A2A. [web:4][web:9]

---

## Rollback Lessons

**User Story:**  
As an operator, I want every rollback to write structured learning artifacts so the agent avoids repeating unsafe paths in later cycles.

**Acceptance Criteria:**
- Rollback → ROLLBACK_LESSON {rollback_reason, what_failed, what_to_do_next_time, prevention_pattern_suggestion}.
- Next cycle → MEMORY_INFLUENCE ref under lesson_hits + applied change.
- Flow/Storage links ROLLBACK_RECORD → ROLLBACK_LESSON → MEMORY_INFLUENCE.
- Fail → stop + missing_rollback_lesson_evidence.

**Dependencies:** Rollback Snapshots, Lesson Patterning, Enrichment.

**Edge Cases:**
- Multiple rollbacks → distinct lessons/decisions.
- Transient trigger → signal class.
- Operator retry → include lesson.

---

## Confidence Boundary Rule

**User Story:**  
The system enforces a single deterministic confidence boundary rule so equal-to-threshold values never proceed and are auditable.

**Acceptance Criteria:**
- CONFIDENCE_TRACE: confidence, gate_threshold, decision (proceed only if > threshold).
- = threshold → wait + confidence_at_boundary + TEXT_APPROVAL (or higher).
- Multiple signals → min (lower-wins) + signals[].
- Metacognitive below → reflect in trace.

**Dependencies:** Confidence Contract, Trace Propagation.

**Edge Cases:**
- Missing threshold → default + reason.
- Out of range → clamp [0.0,1.0].
- Duplicate traces → first + DUPLICATE.

---

## Task Flow Confidence Display

**User Story:**  
As an operator, I want Task Flow to render confidence signals and gate decisions deterministically so I can trace every pause, downgrade, and merge block to evidence.

**Acceptance Criteria:**
- Per routing → Flow: confidence, threshold, sources count, decision.
- Node links CONFIDENCE_TRACE / EXECUTION_DECISION.
- Waiting → approval_type + expires_at.
- Downgrade → new level + trigger artifact.

**Dependencies:** Confidence Trace, Waiting Orchestration.

**Edge Cases:**
- Missing → "missing evidence" marker.
- Successive → timestamp order.
- Verbose → summary + Storage.

---

## Drive-Level Loops

**User Story:**  
The system detects drive-level loops across autonomous cycles so repeated low-value work triggers deterministic suppression and autonomy downgrade.

**Acceptance Criteria:**
- Same opportunity_id + task_fingerprint ×3 cycles → DRIVE_LOOP_SIGNAL {session_id, opportunity_id, fingerprint, repeat_count=3, severity, cycle refs}.
- moderate → downgrade EXECUTION_DECISION.
- critical → OPPORTUNITY_SUPPRESSION drive_loop + stop/handoff.

**Dependencies:** Single Orchestrator, Opportunity, Unified Loop.

**Edge Cases:**
- Schema evolution → canonical id.
- Interleaved success → reset counter.
- Missing cycle → missing_cycle_evidence.

---

## Opportunity Suppression TTL

**User Story:**  
As an operator, I want opportunity suppressions to have deterministic TTL and decay rules so suppressed work re-enters consideration predictably.

**Acceptance Criteria:**
- OPPORTUNITY_SUPPRESSION {opportunity_id, reason_code, created_at, expires_at}.
- Expires → OPPORTUNITY_SUPPRESSION_EVENT expired + eligible next OPPORTUNITY_SET.
- Repeat suppressions → TTL ladder.
- Exclude until expiry.

**Dependencies:** Opportunity Detection, Single Orchestrator.

**Edge Cases:**
- Operator unsuppress → resolved + operator_action.
- Clock skew → server time + eval timestamp.
- Missing artifact → proceed + suppression_missing.

---

## Canonical Memory Influence

**User Story:**  
The system emits a canonical MEMORY_INFLUENCE artifact for every memory-enriched task so enrichment is explainable, auditable, and deterministic.

**Acceptance Criteria:**
- Per enriched task → MEMORY_INFLUENCE {session/task_id, retrieval, applied, integrity}.
- episodic_top_k ≤3 or returned.
- applied[] → ref retrieval ids.
- Unavailable → source_available=false, fallback=true.
- Flow links enrichment → artifact.

**Dependencies:** Enrichment, Recall Episodic.

**Edge Cases:**
- Dupes → dedup=true.
- Schema mismatch → invalid_schema=true + block.
- Redacted → marker + id.

---

## Episodic Recall Ranking

**User Story:**  
The system ranks episodic recall results deterministically so top-3 injection and display order are stable across runs.

**Acceptance Criteria:**
- EPISODIC_RECALL_RESULT ranking_method + sort: similarity desc, recency desc, episode_id asc.
- Inject top-3 → MEMORY_INFLUENCE.episodic same order.
- episodic[]: episode_id, score, recency, reason, snippet.
- Flow same top-3 order.

**Dependencies:** Recall Episodic, Memory Influence.

**Edge Cases:**
- No recency → 0 + missing.
- Ties → episode_id.
- <3 → all.

---

## Tool Mock Coverage Scoring

**User Story:**  
The system maintains deterministic tool mock coverage scoring so dry-run unverifiable tools are detected and routed consistently.

**Acceptance Criteria:**
- TOOL_MOCK_REGISTRY: tools + mock_support {full, partial, none}.
- DRYRUN_PLANGRAPH: unverifiable per registry.
- TOOL_MOCK_COVERAGE session: planned, unverifiable, score.
- Live unverifiable (not predicted) → DRYRUN_DELTA critical + Waiting.

**Dependencies:** Dry Run Preview, Tool Safety, Deviation Control.

**Edge Cases:**
- No registry → all none, score=0.
- Mid-add → new version.
- Partial → unverifiable unless subcalls mocked.

---

## End-to-End Branch Integrity

**User Story:**  
The system records end-to-end branch lifecycle integrity evidence so every delivery action is traceable, branch-safe, and gate-validated.

**Acceptance Criteria:**
- Changes → BRANCH_INTEGRITY {branch/commit IDs, merge target, VALIDATION_SUMMARY/DONECRITERIA_RESULT/CONFIDENCE_TRACE refs}.
- Lifecycle events ordered {branch_created...rollback_triggered}.
- Blocked → merge_blocked=true + blocking decision.
- No main push → violation ref.

**Dependencies:** Auto Branch, Validation Gates.

**Edge Cases:**
- No changes → no_op, no artifact.
- Multiple commits → ordered list.
- Post-merge rollback → ROLLBACK links.

---

## Drift Early Warnings Throttled

**User Story:**  
As an operator, I want drift early warnings throttled deterministically so repeated warnings do not spam the UI while still recording evidence.

**Acceptance Criteria:**
- Exceed warning threshold (not downgrade) → DRIFT_EARLY_WARNING {timestamp, window, metrics, throttle_key}.
- UI max 1 per window/session; suppressed → displayed=false.
- Downgrade met → no more warnings.

**Dependencies:** Drift Detection, Observability.

**Edge Cases:**
- Restart → persist throttle.
- Missing metrics → reason + no display.
- Autonomy off → autonomy_disabled=true.

---

## Continuous Autonomy Loop

**User Story:**  
As an operator, I want the agent to run the continuous autonomy-first loop (scan → generate → execute → reflect) with deterministic interruption points so the system improves the repo without constant prompting while remaining safe and predictable.

**Acceptance Criteria:**
- Enabled → continuous cycles recorded.
- Interrupt only: ambiguous (1 question), low confidence post-correction, policy-block, self-fix exhausted.
- Flow/Storage evidence links.
- Disabled → stop scheduling + reason.

**Dependencies:** Orchestrator, Scanner, Opportunity, Synthesis, Validation, Observability.

**Edge Cases:**
- No opportunities → no-op cycle.
- Multiple → priority selection rationale.
- Stop mid-cycle → safe boundary.

---

## Ambiguous Task Clarification

**User Story:**  
As an operator, I want ambiguous task classification to trigger exactly one clarification question and then deterministically continue or stop so the agent does not loop on repeated questions.

**Acceptance Criteria:**
- Ambiguous → pause + **exactly 1** question as Waiting step.
- Answer → resume + re-gate.
- No answer pre-expiry → policy.
- No 2nd question → policy HumanLayer.

**Dependencies:** HumanLayer, Waiting, Checkpoint, Confidence.

**Edge Cases:**
- Empty/non-responsive → unresolved policy.
- Late post-expiry → fresh gate.
- Invalid post-answer → stop recorded.

---

## Session Summary KPIs

**User Story:**  
As an operator, I want session summaries to report safety and quality metrics so I can verify whether changes reduce failed or aborted runs and quickly diagnose the main drivers.

**Acceptance Criteria:**
- End → summary: end reasons %, Waiting time p50/p95, validation %, rollback %, regressions prevented, downgrades, deviations, loops, low-confidence %, MTTR.
- Links to evidence.
- Missing → "unavailable" + list.
- No modify history.
- Export artifact.

**Dependencies:** Session End, Observability, Waiting, Validation, Rollback.

**Edge Cases:**
- Crash/partial → gaps marked.
- Large → aggregate + drill.
- Export fail → in-app.

---

## Deviation Severity Mapping

**User Story:**  
The system standardizes a single deviation severity mapping so every dry-run delta and gating deviation routes deterministically and is auditable.

**Acceptance Criteria:**
- Canonical minor/moderate/critical mapping.
- Flow/Storage: severity + action (continue/re-eval/stop+HumanLayer).
- Covers step/approval change, unverifiable, confidence Δ≥0.15.
- Unclassifiable → critical + Waiting.

**Dependencies:** Dry Run Deviation, HumanLayer.

**Edge Cases:**
- Multiple → highest + all visible.
- Skipped dry-run → no delta.
- Conflict → tie-break recorded.

---

## Artifact Contracts Index

**User Story:**  
As an operator, I want a single artifact contract index so I can reliably find, validate, and export the evidence types used by the autonomy-first runtime and UI.

**Acceptance Criteria:**
- Canonical "Artifact Contracts" list + fields.
- Storage: type, timestamp, session/task.
- Missing required → "missing evidence" + decision.
- Session bundle export: index + summary/Flow refs.

**Dependencies:** Observability, Session Summary.

**Edge Cases:**
- Large sets → paged/streamed.
- Schema mismatch → invalid + fail closed.
- Interrupted → retry ok.

---

## Waiting Lifecycle Policy

**User Story:**  
The system enforces a deterministic Waiting lifecycle policy so every Waiting step has an expiry action and predictable resume/stop behavior.

**Acceptance Criteria:**
- expires_at + outcome {escalate, reroute, stop} in Flow.
- Applied + EXECUTION_DECISION expired.
- Late resolve → fresh gate.
- States inspectable.

**Dependencies:** Waiting Orchestration, Checkpoint.

**Edge Cases:**
- Skew → authoritative time + timestamp.
- Multiple/run → latest active.
- No checkpoint → escalation fail.

---

## Donecriteria Type Catalog

**User Story:**  
As an operator, I want a published donecriteria type catalog so task synthesis and validation use the same machine-verifiable criteria and fail closed when unverifiable.

**Acceptance Criteria:**
- Stable catalog supported types.
- Synthesis reject unsupported → evidence.
- Validation fail unverifiable → block merge.
- Flow checklist + status.

**Dependencies:** Donecriteria Synthesis, Validation Stage.

**Edge Cases:**
- No evidence → fail reason.
- Mixed → reject pre-exec.
- Mid-update → new tasks new catalog.

---

## KPI Measurement Windows

**User Story:**  
As an operator, I want KPI measurement windows and definitions standardized so we can verify the 30% reduction in failed/aborted runs within 30 days and attribute changes to evidence.

**Acceptance Criteria:**
- "Failed/aborted" from SESSION_END_RECORD.
- Baseline/post-release same windowing.
- UI compare baseline vs recent.
- Incomplete → partial + missing.

**Dependencies:** Session End, Baseline Snapshot, Summary.

**Edge Cases:**
- Low sample → limited flag.
- Missing reason → exclude + missing.
- Deployment overlap → note + compute.

---

**A2A SPEC Полная!** 4+ файла, ~1800 строк. Все фичи задокументированы с AC/Deps/EC. [code_file:19][web:3]
