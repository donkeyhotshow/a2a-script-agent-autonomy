<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# СОБЕРИ В ЕДИНЫЙ МД ФАЙЛ

A2A Autonomous Agents Orchestrator with Memory
0%
Connect Integrations
Build an autonomy-first, session-driven repo-improvement agent (with single-entry orchestration) that runs a continuous scan→generate→execute→reflect loop while reducing failed/aborted runs by 30% in 30 days via deterministic confidence/dry-run/donecriteria safety gating, bounded self-correction and loop downgrades, durable async waiting/resume with expiry, memory-enriched planning, and branch-isolated delivery surfaced through the Web UI.  Objective
Enable operators and developers to run an autonomy-first, session-driven agent that continuously improves a repository with deterministic safety gating, durable async waiting/resume, loop-safe autonomy downgrades, memory-enriched planning, dry-run deviation control, donecriteria validation, and branch-isolated delivery.
Project Goal
Reduce failed or user-aborted session runs by 30% within 30 days after release.
User Journey
Operator / Developer (Web UI via root orchestrator)
Starts the live stack from the repo root using the standard orchestration entrypoint (npm run dev / start-all.*) with port allocation/cleanup handled by the repo’s port manager, then opens the Web UI using the repo-standard ports/env defined in .env.example and docs/ENV-MATRIX.md.
Creates/selects a Project and Session in the Projects Panel (session creation modal as needed), then lands in the Session Window with the task input focused.
Observes live execution across the repo-standard panels (floating/dockable UI patterns):
Session Window (task input, status, pause/resume, cancel/stop)
Task Flow Panel (step-by-step flow cards, Waiting steps, gating outcomes)
Terminal Panel (execution logs)
Storage Panel (StepStorage / ArtifactStore / CheckpointStore artifacts, download/browse)
Notification Center + Modal Dialogs (errors, confirmations, critical approvals)
Runs in Autonomy-first (default) mode:
Watches the continuous loop scan → generate → execute → reflect without prompting each cycle.
Gets interrupted only at deterministic trigger points:
Ambiguous task classification (agent asks exactly one clarification question)
Confidence below gate after bounded Self-Correction (≤3 attempts)
Irreversible failure / blacklisted action blocked by policy
SelfFix exhausted (all 3 attempts fail with no convergence)
When paused, inspects structured evidence emitted into Storage/Task Flow:
CONFIDENCE_TRACE
EXECUTION_DECISION
WAITING_STATE (expiry + resume target)
LOOP_SIGNAL
TRACE_RISK
DRYRUN_DELTA (material deviations: step-type change, approval-type change, unverifiable tool, or confidence band shift ≥ 0.15)
ROLLBACK_LESSON
MEMORY_INFLUENCE
Runs Operator-submitted tasks (Pre-Flight UX):
Enters a manual task in the Session Window and submits.
Reviews Task Improvement Analyzer suggestions before execution.
Reviews deterministic Dry Run PlanGraph preview (predicted interruption classes: confidence pauses, approvals, unverifiable tools, critical blockers).
Clicks “Approve Plan → Start Live Run” (start signal only; HumanLayer is not bypassed).
Optionally sets preflightskip per session to bypass improvement + dry run.
Uses Hybrid HITL (exception path):
Escalations create a first-class Waiting step for the blocked run.
Modal dialogs appear only for critical approval types (per HumanLayer policy); non-critical approvals surface via non-blocking UI.
Resolution resumes from a durable checkpoint or deterministically stops/escalates.
Autonomous Agent Runtime (Client API + Server + AI proxy)
Runs under a single-entry orchestration authority coordinating scan, task generation, execution, async waiting/resume, validation, rollback, and reflection aligned with the repo’s deterministic orchestration and simulations-first patterns.
Converts repo + runtime signals into bounded autonomous work:
ProjectScanner emits typed repo signals (git diff, tests, TODO/FIXME, metrics, error logs; plus other repo-supported sources).
OpportunityDetector classifies/prioritizes/deduplicates opportunities.
TaskSynthesizer generates goal/context plus machine-verifiable donecriteria (2 retries; suppress on fail).
TaskEnricher injects top-3 episodic recall plus PatternStore + LessonStore context and InternalTrace risk signals, plus relevant Storage artifacts.
SelfCorrectionLoop attempts BACKTRACK → SWITCH → REFINE before HumanLayer involvement (≤3 attempts).
AutonomyGates route decisions based on confidence thresholds, loop risk, InternalTrace blockers, waiting state, tool trust routing, and branch-safe delivery feasibility.
Executes and governs async work with durable Waiting:
Waiting is a first-class step, checkpoint-backed, resumable, and does not stall unrelated queued work.
Every Waiting has expiry and deterministic expiry policy (escalate → reroute → stop), emitting WAITING_STATE + EXECUTION_DECISION.
On resume, integrity checks run (checkpoint schema validity + referenced artifacts existence) and confidence gating re-applies.
Ensures delivery safety:
Always branch-isolated delivery (no direct push to main).
ValidationPipeline verifies donecriteria in addition to unit/integration/simulation/regression checks; merge/delivery is blocked if donecriteria fails even if tests pass.
Deterministic dry-run deviation tracking emits DRYRUN_DELTA with severity (minor|moderate|critical) and required actions (continue/re-evaluate/stop+HumanLayer), including critical stops for unverifiable tools, HumanLayer bypass attempts, donecriteria unverifiability, or branch-safety violations.
Produces canonical artifacts for auditability and UI rendering:
CONFIDENCE_TRACE
EXECUTION_DECISION
WAITING_STATE
LOOP_SIGNAL
TRACE_RISK
DRYRUN_DELTA
ROLLBACK_LESSON
MEMORY_INFLUENCE
Reports quality \& safety metrics in session summaries:
End reason distribution
Waiting resolution time (p50/p95)
Validation pass rates
Rollback rate
Regressions prevented
Autonomy downgrade frequency
Dry-run deviation rate
Loop interruption rate
Confidence-below-gate rate
MTTR
Features
In Scope
Single-entry orchestration
Confidence-gated transitions
Bounded self-correction loop
Loop detection downgrade
Durable waiting and resume
Waiting expiry reroute
Memory-enriched task planning
Dry-run deviation detection
Donecriteria validation gate
Branch-isolated delivery
Out of Scope
Separate world-model service
Typed evaluator suite
Policy self-mutation engine
Unbounded parallel agents

Готово — единый Markdown-файл собран и доступен для скачивания выше.

## Что включено в документ (444 строки)

Файл структурирован в **13 разделов** с таблицами, ASCII-диаграммами и чёткой иерархией заголовков:


| Раздел | Содержание |
| :-- | :-- |
| **Overview** | Цель проекта, метрика -30% failed runs |
| **Objective** | Таблица 7 ключевых capabilities |
| **User Journey** | Полный путь оператора: стек → панели → Autonomy-first → Pre-Flight UX → HITL |
| **Agent Runtime** | Pipeline `ProjectScanner → AutonomyGates`, таблица ответственности компонентов |
| **Continuous Loop** | ASCII-диаграмма `scan→generate→execute→reflect` + downgrade path |
| **Durable Waiting** | Waiting step properties, expiry policy (escalate/reroute/stop), resume integrity checks |
| **Confidence \& Safety Gating** | Блок-схема `Confidence Gate Flow` |
| **Dry-Run Deviation Tracking** | Таблица всех 8 типов девиаций с severity + required action |
| **Donecriteria Validation Gate** | Pipeline с критическим правилом блокировки merge |
| **Branch-Isolated Delivery** | Правила изоляции доставки |
| **Memory-Enriched Planning** | Источники памяти + MEMORY_INFLUENCE artifact |
| **Canonical Artifacts** | Полная таблица 8 артефактов (триггер + консьюмеры) |
| **Session Metrics** | 10 метрик качества и безопасности |
| **Features In/Out of Scope** | Чёткое разграничение |


---

# еще один мд файл 1.HumanLayer Confidence Handoff

User Story
As an operator, I want low-confidence or blocked outcomes to trigger a HumanLayer-governed handoff so that the task run pauses safely for clarification or approval and can resume without losing context.
Acceptance Criteria
At every routing point governed by confidence or policy, the system writes a CONFIDENCE_TRACE and an EXECUTION_DECISION for the task run.
When confidence is below the active gate at any routing point, the system creates a Waiting step and writes a WAITING_STATE artifact including: reason, created_at, expires_at, resume_target, required_inputs, and humanlayer_approval_type.
The system writes triggered_criteria as a deterministic JSON array where each entry contains: code, source_artifact, details, severity.
The system assigns exactly one primary humanlayer_approval_type using this strict priority order: CRITICAL_PATH > EXTERNAL_CALL > DATA_ACCESS > ESCALATION > DELEGATION > ACTION_APPROVAL > TEXT_APPROVAL.
The Waiting step and Terminal display the primary approval type and the count of triggered_criteria entries; Storage contains the full triggered_criteria list.
A modal is shown only when the primary approval type is DATA_ACCESS, EXTERNAL_CALL, or CRITICAL_PATH; otherwise no modal is shown.
When the Waiting step is resolved, the same task run resumes from the checkpointed resume_target and writes a new EXECUTION_DECISION recording the post-resume routing decision.
Dependencies
Confidence Score Contract
Waiting Orchestration and Resume
Edge Cases \& Handling
HumanLayer returns reject: the task run writes an EXECUTION_DECISION with decision=stop and references the HumanLayer outcome.
Operator closes a modal without resolving: the Waiting state remains active and no resume occurs.
Waiting expires before resolution: the system writes a WAITING_STATE_EVENT with state=expired and an EXECUTION_DECISION applying the expiry policy.

2. Loop Detection and Interrupt

User Story
As an operator, I want the system to detect repeated action patterns and interrupt the task run so infinite loops surface early.
Acceptance Criteria
The system detects an in-run loop when an identical triple repeats three times consecutively within a single task run: [tool_or_action] + [outcome_class] + [context_segment].
When the loop rule is met, the system writes a LOOP_SIGNAL artifact containing the triple, repeat_count=3, loop_type=in_run, and a deterministic severity.
When LOOP_SIGNAL is written with severity in {moderate, critical}, the system writes an EXECUTION_DECISION with decision=wait and creates WAITING_STATE with humanlayer_approval_type=ESCALATION.
Task Flow displays an interrupt step that links to LOOP_SIGNAL and the created WAITING_STATE.
Terminal logs the same triple and the LOOP_SIGNAL.severity.
Dependencies
HumanLayer Confidence Handoff
Edge Cases \& Handling
Equivalent triples from different renderings: normalization produces the same triple.
Operator resolves Waiting and loop repeats: a new LOOP_SIGNAL is written and severity escalates deterministically to critical.
Operator selects stop: system writes EXECUTION_DECISION decision=stop and ends the run.

3. Index Episodic MEM_STORE

User Story
As an operator, I want episodic memory entries stored as artifacts and indexed into the memory backend so past outcomes are searchable with provenance.
Acceptance Criteria
For each completed task run, the system writes an EPISODIC_ENTRY artifact containing: observation, outcome, reflection, task_run_id, and timestamp.
Storage lists each EPISODIC_ENTRY with a derived summary and provenance.
The system indexes the episode into the configured memory backend and writes a MEMORY_INDEX_RESULT artifact recording success or failure.
If the memory backend is unavailable, the system writes MEMORY_INDEX_RESULT with status=failed and reason_code=backend_unavailable; task completion continues.
If the EPISODIC_ENTRY payload is invalid JSON, the system stores a fallback structure with raw payload and writes MEMORY_INDEX_RESULT with reason_code=invalid_json.
Dependencies
None
Edge Cases \& Handling
Duplicate write attempts for the same task run: exactly one EPISODIC_ENTRY is retained and MEMORY_INDEX_RESULT records dedup=true.
Sensitive content detected: Storage display applies deterministic redaction rules and records redaction=true.
Indexing succeeds but artifact write fails: task run writes EXECUTION_DECISION with reason_code=missing_episodic_evidence.

4.Recall Episodic Episodes
User Story
As an operator, I want episodic recall to query the memory backend so the agent references relevant prior episodes during enrichment with explicit provenance.
Acceptance Criteria
For each operator-submitted task run, the system writes a SEMANTIC_EXTRACT artifact with key facts and constraints plus provenance.
The system performs episodic recall before enrichment completes and writes an EPISODIC_RECALL_RESULT artifact listing recalled episodes with provenance.
EPISODIC_RECALL_RESULT records the similarity threshold used and returns a deterministically ordered list of results.
Task Flow includes a recall step that shows recalled episode summaries or an explicit results_count=0 state.
If the memory backend is unavailable, the system writes EPISODIC_RECALL_RESULT with backend_unavailable=true and proceeds with fallback behavior recorded in MEMORY_INFLUENCE.integrity.
Dependencies
Index Episodic MEM_STORE
Edge Cases \& Handling
Too many matches: EPISODIC_RECALL_RESULT records total_count and the returned_count.
Very long input: SEMANTIC_EXTRACT records truncation=true and preserves constraints.
Recall failure: EPISODIC_RECALL_RESULT records status=failed and enrichment proceeds with fallback.
5. InternalTrace Risk Injection

User Story
As an operator, I want InternalTrace risk outputs to influence enrichment and self-correction so the agent selects safer approaches before execution.
Acceptance Criteria
For each task run above the configured complexity/risk threshold, the system writes a TRACE_RISK artifact containing: complexity, risks[], alternatives[], and recommended_path.
For each task run, the system records whether InternalTrace ran by writing an EXECUTION_DECISION at the pre-execution checkpoint referencing TRACE_RISK or recording TRACE_RISK as missing.
The enrichment step includes a compact risk summary derived from TRACE_RISK and writes a deterministic MEMORY_INFLUENCE artifact entry under applied.risk_mitigations that references at least one TRACE_RISK item.
When TRACE_RISK contains any risk marked at or above the configured high-risk threshold, the system routes via EXECUTION_DECISION to either a safer alternative from TRACE_RISK.alternatives or to Waiting with a HumanLayer approval type determined by policy.
If TRACE_RISK cannot be produced or is invalid, the system writes an EXECUTION_DECISION with decision=wait and creates WAITING_STATE with reason=missing_risk_evidence.
Dependencies
Enrichment with Memory Risks
Bounded Self Correction
Edge Cases \& Handling
Low-risk tasks: TRACE_RISK exists and contains an empty high-risk set; execution proceeds only if CONFIDENCE_TRACE.confidence meets the gate.
Malformed InternalTrace payload: system stores raw payload in TRACE_RISK with integrity marked invalid and treats it as missing for routing.
Alternatives list empty on high-risk: system creates Waiting and sets humanlayer_approval_type=ESCALATION.
6. Adopt A2A Protocol v2
User Story
As an operator, I want multi-agent messaging to conform to A2A v2.0 so that context exchange and handoffs are traceable and schema-valid.
Acceptance Criteria
All outbound agent-to-agent messages are emitted in the A2A v2 shape containing: version, message_id, sender_id, target_id, capability, type, payload, context_state, priority.
Incoming messages missing required identity fields are rejected and stored as an A2A_MESSAGE_ERROR artifact; Terminal renders the rejection with message_id when present.
Supported message types include: handoff, status, error, request, response.
For incoming legacy messages that are normalized, the system writes an A2A_MESSAGE_NORMALIZED artifact containing the original and normalized shapes.
Terminal renders message_id, version, type, sender_id, target_id, and priority for every accepted message.
Dependencies
None
Edge Cases \& Handling
target_id is null: message is accepted and rendered with target_id=null.
context_state missing: message is accepted with context_state={}.
Unknown capability or type: message is accepted as type=error and stored with a deterministic error code.
7.Blockers into MetaReasoner

User Story
As an operator, I want the meta-reasoner to receive real blocker signals so strategy selection responds to the current blocking condition and avoids repeats.
Acceptance Criteria
For each strategy selection event, the system writes a BLOCKER_SET artifact containing a deterministic list of blocker categories present for the task run.
BLOCKER_SET.categories[] includes at minimum: missing_info, policy_wait, policy_reject, tool_failure, loop_detected, high_risk_subtask, low_confidence.
When an active Waiting step exists for the task run, BLOCKER_SET includes policy_wait until a WAITING_STATE_EVENT records state=resolved or state=rejected.
When a HumanLayer rejection occurs, the system writes an EXECUTION_DECISION with decision=stop or decision=rollback and writes BLOCKER_SET including policy_reject.
When a LOOP_SIGNAL exists with severity in {moderate, critical}, BLOCKER_SET includes loop_detected and the next selected strategy produces a different deterministic strategy_fingerprint than the prior attempt; this fingerprint is recorded in EXECUTION_DECISION.
Task Flow displays the chosen strategy label and the primary blocker category that controlled the selection, and links to BLOCKER_SET.
Dependencies
HumanLayer Confidence Handoff
InternalTrace Risk Injection
Loop Detection and Interrupt
Edge Cases \& Handling
Multiple blockers present: EXECUTION_DECISION records primary_blocker using a deterministic priority order and references all blocker evidence artifacts.
Meta-reasoner output missing: system writes EXECUTION_DECISION with strategy=fallback_safe and continues only if confidence gate passes.
Tool failure with retries: blocker category remains tool_failure until a successful tool audit is recorded.
8.Task Improvement Analyzer
User Story
As an operator, I want the system to analyze my task formulation before execution and suggest clearer alternatives so ambiguous instructions produce fewer mid-run clarifications.
Acceptance Criteria
For an operator-submitted task when preflight is enabled, the system writes a PREFLIGHT_IMPROVEMENT artifact containing issues[] and up to three suggestions[] before any Live Run begins.
Each suggestion includes: reformulated task text and numeric confidence_gain computed as reformulated_confidence minus original_confidence.
The UI records the operator choice in PREFLIGHT_IMPROVEMENT as one of: accepted, edited, run_as_written.
When preflight is skipped, the system writes an EXECUTION_DECISION with reason_code=preflight_skipped and does not write PREFLIGHT_IMPROVEMENT.
If analysis fails, the system writes PREFLIGHT_IMPROVEMENT with status=failed and proceeds to execution.
Dependencies
Confidence Score Contract
Edge Cases \& Handling
Very short task: issues=[] and suggestions=[] are recorded.
Very long task: PREFLIGHT_IMPROVEMENT records truncated=true and stores a deterministic truncation length.
Operator edits suggestion: artifact stores final text and edited=true.
9. Dry Run Plan Preview

User Story
As an operator, I want to preview a dry-run execution plan before a task run starts so approvals, pauses, and risky tool usage are visible before live execution.
Acceptance Criteria
For operator-submitted tasks where preflight is enabled, the system generates a dry-run plan and writes a DRYRUN_PLANGRAPH artifact before Live Run starts.
DRYRUN_PLANGRAPH contains an ordered list of steps with: step type, predicted confidence band, predicted HumanLayer approval type when applicable, planned tool calls, and an unverifiable flag per step.
The UI renders the DRYRUN_PLANGRAPH preview and requires an explicit operator start action; the start signal is recorded in EXECUTION_DECISION and does not bypass HumanLayer.
Dry run produces no side effects; any tool call without mock support is marked unverifiable in DRYRUN_PLANGRAPH.
When preflight is skipped, the system writes an EXECUTION_DECISION with reason_code=preflight_skipped and does not write DRYRUN_PLANGRAPH.
Dependencies
Tool Safety Execution Layer
Edge Cases \& Handling
Dry run fails mid-way: DRYRUN_PLANGRAPH is written as partial with a deterministic failure reason.
No interruptions predicted: preview explicitly records predicted_interruptions=[].
Operator starts then closes session: Live Run continues and artifacts remain available in Storage.
10.
Project Scanner Signals
User Story
As an operator, I want the agent to continuously scan a repository for actionable signals so it generates autonomous improvements without manual prompting.
Acceptance Criteria
Each scan cycle writes a SCAN_RESULT artifact containing: scanned_sources[], discovered_signals[], and stable identifiers for each signal.
The scanner consumes LESSON.scan_hints and writes SCAN_HINT_CONSUMPTION indicating which hints were applied.
Scan failures write a SCAN_RESULT with status=failed and the orchestrator writes an EXECUTION_DECISION recording cooldown entry.
If no signals are found, SCAN_RESULT records an explicit no-op scan outcome.
Dependencies
Lesson Schema and Scan Hints
Single Orchestrator Kernel
Edge Cases \& Handling
Large signal set: Task Flow shows summary counts and Storage retains full list.
Session stopped mid-scan: no opportunities are created and EXECUTION_DECISION records stop_reason.
Repeated identical signals: stable identifiers remain consistent across scans.

Готово — второй Markdown-файл собран и доступен для скачивания.

## Содержимое документа (232 строки)

Файл документирует **10 фич A2A** в формате User Story → Acceptance Criteria → Dependencies → Edge Cases с полным списком артефактов:


| № | Фича | Ключевые артефакты |
| :-- | :-- | :-- |
| 1 | **HumanLayer Confidence Handoff** | `CONFIDENCE_TRACE`, `WAITING_STATE`, `triggered_criteria` [^2_1][^2_2][^2_3] |
| 2 | **Loop Detection** | `LOOP_SIGNAL` [^2_4] |
| 3 | **Index Episodic MEM_STORE** | `EPISODIC_ENTRY`, `MEMORY_INDEX_RESULT` [^2_5] |
| 4 | **Recall Episodic** | `SEMANTIC_EXTRACT`, `EPISODIC_RECALL_RESULT` |
| 5 | **InternalTrace Risk** | `TRACE_RISK`, `MEMORY_INFLUENCE` [^2_6] |
| 6 | **A2A Protocol v2** | `A2A_MESSAGE_ERROR`, `A2A_MESSAGE_NORMALIZED` [^2_7][^2_8][^2_9] |
| 7 | **Blockers → MetaReasoner** | `BLOCKER_SET` |
| 8 | **Task Improvement Analyzer** | `PREFLIGHT_IMPROVEMENT` |
| 9 | **Dry Run Plan Preview** | `DRYRUN_PLANGRAPH` [^2_3] |
| 10 | **Project Scanner** | `SCAN_RESULT`, `SCAN_HINT_CONSUMPTION` |

## Особенности спецификации

**HumanLayer Priority Order** (строгий):

```
CRITICAL_PATH > EXTERNAL_CALL > DATA_ACCESS > ESCALATION > 
DELEGATION > ACTION_APPROVAL > TEXT_APPROVAL
```

**Loop Detection**: triple `[tool_or_action + outcome_class + context_segment]` ×3 → `LOOP_SIGNAL`

**A2A v2 Shape**:

```json
{
  "version": "2.0",
  "message_id": "...",
  "sender_id": "...", 
  "target_id": "...",
  "capability": "...",
  "type": "...", // handoff, status, error, request, response
  "payload": {...},
  "context_state": {...},
  "priority": "..."
}
```

**Теперь у вас 2 файла**:

1. `A2A_Autonomous_Agents_Orchestrator.md` — основная архитектура (444 строки)
2. `A2A_Features_HumanLayer_Loop_Memory_Scanner.md` — 10 фич (232 строки)
<span style="display:none">[^2_10][^2_11][^2_12][^2_13][^2_14][^2_15]</span>

<div align="center">⁂</div>

[^2_1]: https://www.instagram.com/p/DTrXt1FDmWo/

[^2_2]: https://www.dcxnewsletter.com/p/the-real-agentic-ai-product-is-permission

[^2_3]: https://machinelearningmastery.com/building-a-human-in-the-loop-approval-gate-for-autonomous-agents/

[^2_4]: https://github.com/zai-org/Open-AutoGLM/issues/69

[^2_5]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-episodic-prompt.html

[^2_6]: https://linearb.io/dev-interrupted/podcast/dex-horthy-humanlayer-rpi-methodology-ralph-loop

[^2_7]: https://discuss.google.dev/t/understanding-a2a-the-protocol-for-agent-collaboration/189103

[^2_8]: https://a2a-protocol.org/latest/

[^2_9]: https://a2a-protocol.org/latest/specification/

[^2_10]: https://github.com/humanlayer/humanlayer

[^2_11]: https://www.linkedin.com/posts/stefania-chaplin_devsecops-appsec-humanlayer-activity-7394667912952856576-wiqN

[^2_12]: https://customerscience.com.au/technology/ai-human-handoff-empathy/

[^2_13]: https://www.youtube.com/watch?v=42AzKZRNhsk

[^2_14]: https://platform.claude.com/docs/en/agent-sdk/agent-loop

[^2_15]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9622362/


---

# еще один мд 11. Opportunity Detection Prioritization

User Story
As an operator, I want scanned signals classified and prioritized into deduplicated opportunities so autonomous work focuses on the highest-value areas.
Acceptance Criteria
For each scan cycle, the system writes an OPPORTUNITY_SET artifact listing opportunities with: type, target_area, priority_score, and source_signal_refs[].
Opportunities are deduplicated across scans using a stable opportunity_id; recurrence updates the existing opportunity rather than creating a new one.
Session-scoped suppression writes an OPPORTUNITY_SUPPRESSION artifact with opportunity_id, reason_code, and expires_at.
When PATTERN artifacts exist, OPPORTUNITY_SET records their deterministic effect on opportunity weighting.
Dependencies
Project Scanner Signals
Lesson Schema and Scan Hints
Edge Cases \& Handling
Priority cannot be computed: priority_score=0.0 and OPPORTUNITY_SET flags priority_status=unscored.
Conflicting signals: opportunity aggregates multiple references.
Excessive recurrence: suppression is applied with a deterministic TTL and recorded in OPPORTUNITY_SUPPRESSION.

12.Donecriteria Task Synthesis

User Story
As an operator, I want the agent to synthesize tasks with mandatory machine-verifiable donecriteria so execution and completion require proof.
Acceptance Criteria
For each selected opportunity, the system synthesizes a task object that includes: goal, context, opportunity_type, and donecriteria.
donecriteria is mandatory and uses only supported machine-verifiable criterion types.
A synthesized task cannot enter execution unless donecriteria exists and is valid.
If synthesis fails to produce valid donecriteria, the system retries up to two times; after the second retry failure, the opportunity is suppressed for the session and OPPORTUNITY_SUPPRESSION records the suppression reason.
Task Flow displays the goal and a readable checklist of donecriteria items.
Dependencies
Opportunity Detection Prioritization
Edge Cases \& Handling
donecriteria contains unsupported types: task is rejected before enqueueing and suppression is recorded.
Duplicate task for the same opportunity: only one is queued and duplicates are suppressed.
Autonomy stopped mid-synthesis: no task is queued and EXECUTION_DECISION records stop_reason=manual_stop.
13.Enrichment with Memory Risks
User Story
As an operator, I want tasks enriched with episodic recall, PatternStore, LessonStore, and InternalTrace risk signals before execution so autonomous work starts with relevant context and explicit provenance.
Acceptance Criteria
Before a task enters execution, the system retrieves top-3 episodic recall results when available, gathers pattern and lesson hits when available, and includes an InternalTrace risk summary when applicable.
The system emits a MEMORY_INFLUENCE artifact for every enriched task that conforms to the Memory Feedback Contract shape and includes integrity.source_available and integrity.fallback_used.
MEMORY_INFLUENCE.applied.plan_changes[] and applied.risk_mitigations[] entries each reference at least one retrieval item id present in the same artifact.
Task Flow includes an enrichment step that renders a deterministic summary derived from MEMORY_INFLUENCE and links to the full artifact in Storage.
When memory sources are unavailable, MEMORY_INFLUENCE.integrity.fallback_used=true and the task proceeds only if CONFIDENCE_TRACE meets the gate.
Dependencies
Recall Episodic Episodes
InternalTrace Risk Injection
Edge Cases \& Handling
No relevant memory found: MEMORY_INFLUENCE.retrieval.episodic=[] and enrichment completes.
Memory backend unavailable: MEMORY_INFLUENCE.integrity.source_available=false and fallback is recorded.
Enriched context large: Task Flow renders a summary and Storage retains full detail.

14.Autonomous Sandbox Staging Prod
User Story
The system executes autonomous tasks through SANDBOX, STAGING, and PRODUCTION stages so that changes are validated before branch delivery.
Acceptance Criteria
Every autonomous task run writes an ENV_STAGE_TRACE artifact listing stage transitions in order with timestamps.
SANDBOX stage writes a diff evidence artifact for any change set or writes an explicit no-op outcome in EXECUTION_DECISION.
STAGING stage runs required validation gates and writes a structured validation result artifact per gate and a VALIDATION_SUMMARY.
PRODUCTION stage starts only when VALIDATION_SUMMARY indicates all gates passed; promotion writes a BRANCH_INTEGRITY artifact referencing validation evidence.
When any stage cannot proceed, the system writes an EXECUTION_DECISION with decision in {wait, handoff, stop, rollback} and references the blocking evidence artifact.
Dependencies
Auto Branch Commit Merge
Validation Gates and Regression
Edge Cases \& Handling
SANDBOX no diff: system records no-op and does not enter STAGING.
STAGING gates missing: system blocks PRODUCTION and records missing gates in VALIDATION_SUMMARY.
Promotion requested without evidence: system blocks and records missing evidence references.

15.Validation Gates and Regression
User Story
The system enforces deterministic validation gates before any merge to main so regressions and unsafe changes are blocked.
Acceptance Criteria
Before merge can occur, the system writes a VALIDATION_SUMMARY artifact listing required gates and pass/fail status for each.
Required gates include: unit tests, integration tests, simulation validation, non-regression check against a baseline, donecriteria verification, and pre-merge confidence check.
If any gate fails, merge is blocked and an EXECUTION_DECISION records the failing gate names.
Task Flow displays each gate with explicit pass/fail and links to underlying evidence artifacts.
Dependencies
Donecriteria Task Synthesis
Confidence Score Contract
Edge Cases \& Handling
Baseline missing: VALIDATION_SUMMARY records baseline missing and merge is blocked.
Flaky test detected: VALIDATION_SUMMARY records flaky and merge is blocked.
Confidence unavailable: CONFIDENCE_TRACE.confidence=0.0 and merge is blocked.

16.Auto Branch Commit Merge
User Story
The system automatically creates branches, commits, and merges changes so autonomous modifications ship safely without manual git operations.
Acceptance Criteria
When a task run produces code changes, the system creates a dedicated branch and writes a BRANCH_INTEGRITY artifact.
BRANCH_INTEGRITY contains: branch identifier, commit identifiers, and references to the task goal and the validation evidence used for merge.
Merge to main occurs only when VALIDATION_SUMMARY indicates all required gates passed and an EXECUTION_DECISION records merge approval.
Direct pushes to main are blocked and recorded as a policy violation artifact referenced from EXECUTION_DECISION.
Task Flow and Storage surface the branch, commit, and merge outcome via linked artifacts.
Dependencies
Autonomous Sandbox Staging Prod
Validation Gates and Regression
Edge Cases \& Handling
Merge conflict: merge is blocked; EXECUTION_DECISION records conflict and bounded self-correction starts.
No code changes: system records no-op outcome and does not write BRANCH_INTEGRITY.
Git operation fails: system records failure and routes to Waiting with humanlayer_approval_type=ESCALATION.

17. Bounded Self Correction
User Story
The system enforces a bounded self-correction loop so blocked task runs retry deterministically before escalating to a human.
Acceptance Criteria
When a task run cannot satisfy its continuation contract, the system runs at most three self-correction attempts and writes a SELF_CORRECTION_ATTEMPT artifact for each.
Each attempt records: attempt number, strategy label in {BACKTRACK, SWITCH, REFINE}, pre-attempt confidence, post-attempt confidence, and the resulting routing decision.
If confidence remains below threshold after the third attempt, the system creates Waiting and writes WAITING_STATE with reason=self_correction_exhausted and references the three attempt artifacts.
Task Flow displays each attempt and links to the attempt artifacts.
Dependencies
HumanLayer Confidence Handoff
Edge Cases \& Handling
Attempts repeat the same action fingerprint: system emits LOOP_SIGNAL and routes per loop policy.
Autonomy disabled mid-correction: system finishes the current attempt and writes EXECUTION_DECISION with decision=stop_autonomy.
Operator resolves Waiting: run resumes from checkpoint and writes a new EXECUTION_DECISION.
18. Async Waiting For Autonomy
User Story
As an operator, I want autonomous task runs to enter non-blocking Waiting states so the agent continues other eligible work while human intervention is pending.
Acceptance Criteria
When an autonomy-generated task run enters Waiting, the system writes WAITING_STATE with expires_at and resume_target and writes an EXECUTION_DECISION with decision=wait.
The system persists a durable checkpoint before entering Waiting and Storage contains the checkpoint artifact reference.
While a task run is in Waiting, the orchestrator schedules the next eligible task run subject to autonomy limits; ORCHESTRATOR_CYCLE references both the active Waiting tasks and the newly scheduled task run ids.
When a Waiting step is resolved, the system resumes the same task run from the checkpointed resume_target and writes an EXECUTION_DECISION recording the post-resume routing decision.
Dependencies
HumanLayer Confidence Handoff
Checkpoint Resume Durability
Edge Cases \& Handling
Service restart while Waiting: checkpoint evidence remains and resume produces a new EXECUTION_DECISION referencing integrity checks.
Multiple Waiting tasks: Task Flow renders a list of active WAITING_STATE entries.
Operator rejects approval: task run writes EXECUTION_DECISION with decision=stop and state=rejected is recorded via WAITING_STATE_EVENT.
19. Tool Safety Execution Layer
User Story
The system provides a tool safety layer with dry-run, safe execution, and audit logging so autonomous actions are controlled and traceable.
Acceptance Criteria
Every tool invocation writes a TOOL_AUDIT artifact containing: tool name, intent summary, environment stage, outcome_class, and redacted parameter summary.
Dry-run tool invocations produce no side effects and TOOL_AUDIT records whether each planned call is mock-backed or unverifiable.
Any unverifiable tool call during dry-run is marked unverifiable and appears in DRYRUN_PLANGRAPH.
Production-impacting actions are blocked unless validation gates have passed and EXECUTION_DECISION records permission.
If the tool safety layer cannot classify a tool call, the system blocks the call and routes to Waiting with a HumanLayer approval type determined by policy.
Dependencies
Dry Run Plan Preview
Validation Gates and Regression
Edge Cases \& Handling
Tool lacks dry-run support: dry-run marks it unverifiable; live routing follows tool trust and policy.
Tool attempts prohibited side effect: blocked and recorded as policy violation evidence.
Tool fails repeatedly: loop safety emits LOOP_SIGNAL and routing downgrades autonomy.

20.Rollback Snapshots Reverts
User Story
The system snapshots stable states and rolls back changes when production error conditions are detected so autonomous shipping remains safe.
Acceptance Criteria
Each successful promotion to main writes a SNAPSHOT_RECORD artifact containing the commit identifier and linked validation evidence.
When production error conditions are detected, the system reverts to the most recent stable snapshot and writes a ROLLBACK_RECORD artifact.
ROLLBACK_RECORD includes: triggering signal class, selected snapshot reference, and revert outcome.
After rollback, the system suppresses re-attempting the same goal until an operator resolves the block via Waiting; the resolution is recorded in EXECUTION_DECISION.
Dependencies
Validation Gates and Regression
Observability Metrics Dashboard
Edge Cases \& Handling
Multiple merges close together: rollback selects the most recent snapshot marked stable.
Rollback fails: system creates Waiting with humanlayer_approval_type=CRITICAL_PATH and records failure evidence.
Error signal clears quickly: rollback triggers only when the configured persistence rule is met and the rule is recorded in ROLLBACK_RECORD.

Готово — третий Markdown-файл собран (фичи **11-20**) и доступен для скачивания.

## Содержимое (225 строк)

**Part 2** охватывает приоритизацию, синтез задач, обогащение памяти, staging/prod, валидацию, git-автоматику, self-correction, async waiting, tool safety и rollback:


| № | Фича | Артефакты |
| :-- | :-- | :-- |
| 11 | **Opportunity Detection** | `OPPORTUNITY_SET`, `OPPORTUNITY_SUPPRESSION` |
| 12 | **Donecriteria Synthesis** | `task.donecriteria` |
| 13 | **Memory Enrichment** | `MEMORY_INFLUENCE` [^3_1] |
| 14 | **Sandbox/Staging/Prod** | `ENV_STAGE_TRACE`, `VALIDATION_SUMMARY`, `BRANCH_INTEGRITY` |
| 15 | **Validation Gates** | `VALIDATION_SUMMARY` |
| 16 | **Auto Branch/Merge** | `BRANCH_INTEGRITY` |
| 17 | **Bounded Self Correction** | `SELF_CORRECTION_ATTEMPT` |
| 18 | **Async Waiting** | `WAITING_STATE`, `ORCHESTRATOR_CYCLE` |
| 19 | **Tool Safety Layer** | `TOOL_AUDIT` [^3_2] |
| 20 | **Rollback Snapshots** | `SNAPSHOT_RECORD`, `ROLLBACK_RECORD` |

## Полная коллекция (3 файла, ~900 строк)

1. **A2A_Autonomous_Agents_Orchestrator.md** — архитектура + user journey (444 строки)
2. **A2A_Features_HumanLayer_Loop_Memory_Scanner.md** — фичи 1-10 (232 строки)
3. **A2A_Features_Part2_Opportunity_Validation_Rollback.md** — фичи 11-20 (225 строки)

**Self-Correction Loop** (фича 17): `BACKTRACK → SWITCH → REFINE` (max 3 attempts) → `self_correction_exhausted` → HumanLayer.

**Validation Gates** (фича 15): unit/integration/simulation/regression/donecriteria/confidence — **block merge** при любом fail.

**Теперь вся спецификация A2A в Markdown-формате готова к использованию!**[^3_3][^3_4]

<div align="center">⁂</div>

[^3_1]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-episodic-prompt.html

[^3_2]: https://machinelearningmastery.com/building-a-human-in-the-loop-approval-gate-for-autonomous-agents/

[^3_3]: https://github.com/humanlayer/humanlayer

[^3_4]: https://platform.claude.com/docs/en/agent-sdk/agent-loop


---

# User Story

As an operator, I want configurable autonomy limits and cooldown behavior so continuous operation stays stable and downgrades before damage accumulates.
Acceptance Criteria
The system writes an AUTONOMY_LIMITS_STATE artifact per session containing: concurrency_limit, task_starts_per_cycle, and failure_budget.
When any limit is reached, the system writes an EXECUTION_DECISION recording cooldown entry and the triggering limit, and Task Flow indicates cooldown.
When failure budget is exhausted, the system writes an EXECUTION_DECISION recording an autonomy downgrade and the trigger counters.
Drift-driven downgrades reference DRIFT_SIGNAL_SUMMARY in EXECUTION_DECISION.
Dependencies
Drift Detection Downgrade
Concurrency by Autonomy Level
Edge Cases \& Handling
Operator changes limits mid-session: a new AUTONOMY_LIMITS_STATE is written and applies to future scheduling.
Cooldown overlaps Waiting: Waiting remains pending and cooldown still applies to scheduling.
Repeated failures tied to one opportunity: system writes OPPORTUNITY_SUPPRESSION with a deterministic TTL. User Story
As an operator, I want tool trust and risk routing to influence approval requirements so high-risk tools require HumanLayer governance.
Acceptance Criteria
Each tool has a persisted TOOL_TRUST_STATE artifact containing: tool_id, trust_state, risk_tier, and execution_history_count.
For tools in risk_tier=high, the system applies a stricter confidence threshold and records the applied threshold and decision in EXECUTION_DECISION and CONFIDENCE_TRACE.
New tools start in cold-start and require HumanLayer approval for the first five executions; each execution writes TOOL_AUDIT and updates TOOL_TRUST_STATE with a deterministic counter.
Operators can reset a tool trust state; the system writes a TOOL_TRUST_EVENT artifact and subsequent executions treat the tool as cold-start.
Dependencies
Tool Safety Execution Layer
HumanLayer Confidence Handoff
Edge Cases \& Handling
Trust decreases after failures: TOOL_TRUST_STATE records the downgrade and subsequent tool calls route using the stricter threshold.
Trust state write fails: system treats tool as cold-start and routes to Waiting with humanlayer_approval_type=ACTION_APPROVAL.
Reset during active run: reset applies only to subsequent tool invocations and is recorded as such in TOOL_TRUST_EVENT.\#\#\# User Story
As an operator, I want the system to write LESSON artifacts and surface recurring patterns so autonomous cycles improve and recurring issues are visible.

### Acceptance Criteria

- After each completed task run, the system writes a `LESSON` artifact containing: what_was_done, what_was_learned, affected_area, and scan_hints.
- When scan_hints exist, the next scan cycle writes a `SCAN_HINT_CONSUMPTION` artifact indicating which hints were applied.
- When the same pattern is observed in three consecutive `LESSON` artifacts, the system writes a `PATTERN` artifact that links the three source lessons.
- LESSON and PATTERN artifacts are visible in Storage with provenance.


### Dependencies

- Project Scanner Signals


### Edge Cases \& Handling

- LESSON write fails: task completion occurs and `EXECUTION_DECISION` records missing evidence.
- Many candidate patterns: system writes the highest-frequency pattern and includes the candidate list in the `PATTERN` artifact.
- Scan hints target missing paths: scanner records a warning in `SCAN_HINT_CONSUMPTION` and continues scanning.\#\#\# User Story
As an operator, I want an observability view for autonomous operation so that I can see outcomes, safety interventions, and the evidence artifacts that explain them.


### Acceptance Criteria

- For each task run, the system writes an `EXECUTION_TRACE` artifact that includes: phase transitions, `EXECUTION_DECISION` references, validation outcomes, and final outcome in {merged, no_op, waiting, failed, rolled_back, stopped}.
- Task Flow and Storage provide direct links to evidence artifacts produced during the run, including at minimum: `EXECUTION_DECISION`, `CONFIDENCE_TRACE`, validation artifacts, diffs, and rollback artifacts when present.
- The dashboard view renders session-scoped counts derived from artifacts for: task runs started/completed/failed, Waiting steps created/resolved/expired, rollbacks triggered, loop signals by severity, and autonomy downgrades by trigger.
- When required metrics artifacts are missing for a session, the dashboard renders “metrics unavailable” and lists the missing artifact types.


### Dependencies

- Validation Gates and Regression
- Rollback Snapshots Reverts


### Edge Cases \& Handling

- Very verbose traces: dashboard renders summarized counts and provides drill-down to `EXECUTION_TRACE` artifacts.
- Autonomy disabled: dashboard renders historical session data using existing artifacts.
- Partial session data: dashboard renders a coverage window using available timestamps and flags missing windows.\#\#\# User Story
As an operator, I want every session to end with a recorded structured reason so we can measure baseline failure and abort rate.


### Acceptance Criteria

- Every session termination path writes a `SESSION_END_RECORD` artifact containing: session_id, timestamp, duration, task_run_count, and end_reason.
- end_reason is one of: completed, error, manual_stop, loop_interrupt, low_confidence_timeout, emergency_stop.
- The Web UI displays end_reason for completed sessions.
- If `SESSION_END_RECORD` emission fails, the session ends and a deterministic warning event is recorded in an artifact.


### Dependencies

- None


### Edge Cases \& Handling

- Session ends during Waiting: end_reason is manual_stop or emergency_stop based on operator action.
- Session ends due to restart: end_reason=error and record includes restart_marker=true.
- Duplicate end events: exactly one record is retained and duplicates are stored as `SESSION_END_RECORD_DUPLICATE` artifacts.\#\#\# User Story
As an operator, I want to capture a baseline snapshot of session outcomes and Waiting frequency so post-release changes compare against a known starting point.


### Acceptance Criteria

- The system generates a `BASELINE_SNAPSHOT` artifact for a specified time window.
- `BASELINE_SNAPSHOT` includes: total sessions, percentage by `SESSION_END_RECORD.end_reason`, Waiting steps created per session, and average task runs per session.
- The snapshot is versioned and exportable as an artifact.
- Snapshot generation does not stop active sessions.


### Dependencies

- Baseline Session End Reasons


### Edge Cases \& Handling

- Metrics unavailable: snapshot writes with deterministic missing-data flags per metric.
- Partial coverage: snapshot records coverage window and missing intervals.
- Re-run for same window: system writes a new versioned artifact with a new snapshot_id. \#\#\# User Story
The system uses a deterministic, configurable Confidence Score contract so continuation, waiting, escalation, and merge decisions are consistent across runs.


### Acceptance Criteria

- The system loads confidence thresholds from configuration and validates the configuration before applying it.
- The boundary rule is enforced at every routing point: a score equal to a threshold is treated as below the threshold.
- Missing or malformed confidence inputs are treated as 0.0 and are recorded as missing signals in `CONFIDENCE_TRACE.signals`.
- Operator-submitted tasks use the global threshold set; autonomy-generated tasks use autonomy-adjusted thresholds based on current autonomy level.
- Task Flow displays the confidence score, the threshold applied, and the resulting decision for each routing point.


### Dependencies

- None


### Edge Cases \& Handling

- Configuration invalid: system uses the last known valid configuration and writes an `EXECUTION_DECISION` with reason_code=invalid_confidence_config.
- Threshold set inconsistency: system rejects the new configuration and continues using the last known valid configuration.
- No confidence signals available: `CONFIDENCE_TRACE.confidence=0.0` and decision routes to Waiting via HumanLayer.\#\#\# User Story
As an operator, I want a PolicyGuard that enforces confidence-based thresholds and blacklisted actions so irreversible or unsafe operations are blocked by default.


### Acceptance Criteria

- Policy evaluations write a `POLICY_DECISION` artifact containing: action_class, required_confidence_threshold, computed_confidence, and decision in {allow, block}.
- Blacklisted action classes are always blocked and require HumanLayer to proceed; the system writes `WAITING_STATE` referencing `POLICY_DECISION`.
- Direct pushes to main are blocked and recorded as a policy violation artifact referenced from `EXECUTION_DECISION`.
- Task Flow surfaces policy blocks and links to `POLICY_DECISION`.


### Dependencies

- Confidence Score Contract
- Tool Safety Execution Layer


### Edge Cases \& Handling

- Action cannot be classified: treated as high risk and blocked.
- Confidence cannot be computed: treated as 0.0 and blocked.
- Override occurs only via HumanLayer resolution and is recorded in `EXECUTION_DECISION`. \#\#\# User Story
The system persists durable task-run checkpoints so paused runs resume deterministically after Waiting resolution or service restart.


### Acceptance Criteria

- When a task run enters Waiting, the system persists a checkpoint sufficient to resume from the recorded pause point and stores a checkpoint reference in Storage.
- Checkpoints survive service restart and can be restored to resume the same task run deterministically.
- Task Flow and Storage indicate when a checkpoint was created and when it was restored, and link to the relevant `WAITING_STATE`.
- If checkpoint restore fails integrity validation, the system creates Waiting with `humanlayer_approval_type=ESCALATION` and writes an `EXECUTION_DECISION` with reason_code=checkpoint_restore_failed.


### Dependencies

- HumanLayer Confidence Handoff


### Edge Cases \& Handling

- Checkpoint write fails: system blocks progress and creates Waiting with reason=checkpoint_write_failed.
- Checkpoint corrupted: restore fails and the system does not continue execution.
- Multiple checkpoints exist: the system resumes using the latest checkpoint referenced by the active `WAITING_STATE`. \#\#\# User Story
As an operator, I want stored patterns to decay in relevance over time so enrichment and opportunity weighting do not overfit to stale behavior.


### Acceptance Criteria

- Each pattern record includes: `relevance_score`, `last_observed_cycle_id`, and `decay_policy`.
- On each `ORCHESTRATOR_CYCLE`, patterns not observed for the configured number of cycles have their `relevance_score` decayed using the configured policy and the system writes a `PATTERN_DECAY_RESULT` artifact listing updated patterns and before/after scores.
- Enrichment selects patterns in descending `relevance_score` order and records selected pattern ids in `MEMORY_INFLUENCE.retrieval.pattern_hits`.
- Patterns are never deleted automatically; Storage lists inactive patterns with `relevance_score=0.0`.


### Dependencies

- Lesson Pattern Artifacting


### Edge Cases \& Handling

- Score reaches zero: pattern becomes inactive and is excluded from selection while remaining visible.
- Pattern store unavailable: enrichment proceeds without patterns and sets `MEMORY_INFLUENCE.integrity.fallback_used=true`.
- Cycle epoch reset: the system writes a `PATTERN_DECAY_RESULT` with `epoch_id` and applies decay using the new epoch. \#\#\# User Story
The system provides a single orchestration authority so scan, schedule, execute, waiting resume, validation, rollback, and reflection cannot race.


### Acceptance Criteria

- Only the orchestrator schedules autonomous task runs; every scheduled task run references an `ORCHESTRATOR_CYCLE` artifact.
- Each cycle writes an `ORCHESTRATOR_CYCLE` artifact containing: phases executed, selected task_run_ids, and any Waiting resumes attempted.
- On restart, the orchestrator resumes from the last recorded safe phase boundary and does not duplicate scheduled task runs; `ORCHESTRATOR_CYCLE` records the recovery.
- If a second orchestrator instance is detected, it does not schedule tasks and writes an `ORCHESTRATOR_SINGLETON_VIOLATION` artifact.


### Dependencies

- Checkpoint Resume Durability


### Edge Cases \& Handling

- Partial state on restart: orchestrator resumes at next safe boundary and records recovery in `ORCHESTRATOR_CYCLE`.
- Operator disables autonomy: orchestrator stops scheduling and writes an `EXECUTION_DECISION` with decision=stop_autonomy.
- Waiting resolution during cooldown: orchestrator records deferred resume and resumes when cooldown ends. \#\#\# User Story
As an operator, I want an API Guard layer for external calls so outbound requests are allowlisted, rate-limited, and escalated for dangerous actions.


### Acceptance Criteria

- Every external call produces an `API_GUARD_DECISION` artifact with decision in {allow, block} and a deterministic `reason_code`.
- External calls to endpoints not on the configured allowlist are blocked and routed to Waiting; `WAITING_STATE` references the `API_GUARD_DECISION`.
- External calls exceeding the configured rate limit are blocked; the system writes an `EXECUTION_DECISION` selecting either bounded self-correction or Waiting using a deterministic policy rule.
- When API Guard is unavailable, all external calls are blocked and the system creates Waiting with `humanlayer_approval_type=EXTERNAL_CALL`.


### Dependencies

- PolicyGuard Thresholds Blacklist


### Edge Cases \& Handling

- Allowlist updated mid-session: decisions after the update use the new allowlist; prior `API_GUARD_DECISION` artifacts remain immutable.
- Rate limit exceeded due to retries: the total attempt count is recorded in `API_GUARD_DECISION`.
- Unknown call classification: treated as dangerous and blocked with `reason_code=unknown_external_call`. \#\#\# User Story
As an operator, I want the system to detect autonomy drift and downgrade autonomy level so repetitive low-value work stops.


### Acceptance Criteria

- The system writes a `DRIFT_SIGNAL_SUMMARY` artifact per session containing: repeated_opportunity_rate, repeated_task_rate, and autonomous_success_rate over a configured window.
- When drift thresholds are exceeded for the full window, the system writes an `EXECUTION_DECISION` recording the downgrade, the trigger metrics, and the new autonomy level.
- Task Flow and Terminal show the downgrade event and link to `DRIFT_SIGNAL_SUMMARY`.
- Autonomy upgrades require an explicit operator action recorded as an artifact.


### Dependencies

- Autonomy Limits and Cooldown
- Opportunity Detection Prioritization


### Edge Cases \& Handling

- Drift while tasks are Waiting: downgrade applies to future scheduling decisions and is recorded.
- Single burst: drift is recorded but downgrade does not occur unless the window rule is met.
- Operator disables autonomy: drift signals continue to be recorded for inspection. \#\#\# User Story
As an operator, I want Waiting to be a first-class lifecycle with expiry and deterministic resume routing so paused work is safe, inspectable, and does not stall other work.


### Acceptance Criteria

- Entering Waiting writes a `WAITING_STATE` artifact containing: `reason`, `created_at`, `expires_at`, `resume_target`, and a reference to the triggering evidence artifact.
- `WAITING_STATE` transitions through states: waiting, resolved, rejected, expired; each transition writes a `WAITING_STATE_EVENT` artifact.
- On resolution, the system resumes the same task run from the checkpointed `resume_target` and writes an `EXECUTION_DECISION` that re-evaluates confidence gates before any new action.
- On expiry, the system writes an `EXECUTION_DECISION` recording the deterministic expiry policy outcome and does not resume without re-evaluation.
- In autonomy-first mode, active Waiting tasks do not block scheduling of unrelated eligible task runs; `ORCHESTRATOR_CYCLE` records the scheduling outcome.


### Dependencies

- Checkpoint Resume Durability
- HumanLayer Confidence Handoff
- Single Orchestrator Kernel


### Edge Cases \& Handling

- Late resolution after expiry: system writes a `WAITING_STATE_EVENT` and requires a new gate evaluation before any action.
- Multiple Waiting states for one run: only the most recent active state is actionable.
- Invalid resume target: system routes to Waiting with `humanlayer_approval_type=ESCALATION` and records integrity failure in `EXECUTION_DECISION`. \#\#\# User Story
The system records confidence at every major routing point so continuation, waiting, escalation, and merge decisions are governed by one deterministic contract.


### Acceptance Criteria

- For each task run, the system writes a `CONFIDENCE_TRACE` artifact at each required routing point.
- Required routing points include: post-synthesis, post-enrichment, post-self-correction attempt, post-deviation detection, post-validation, pre-merge.
- Every routing decision writes an `EXECUTION_DECISION` containing: routing point, confidence value, gate threshold, decision in {proceed, wait, handoff, stop, downgrade}, and linked evidence artifacts.
- If confidence cannot be computed at a required routing point, the system records confidence=0.0 and routes to Waiting via HumanLayer; `EXECUTION_DECISION` records reason_code=confidence_missing.


### Dependencies

- Confidence Score Contract
- Single Orchestrator Kernel


### Edge Cases \& Handling

- Confidence fluctuates: Task Flow shows the latest value; Storage retains the full trace history.
- Conflicting signals: `CONFIDENCE_TRACE` records all signals and uses the lower-wins rule to set `confidence`.
- Trace write fails: system writes an `EXECUTION_DECISION` with reason_code=confidence_trace_write_failed and blocks merge for the run. \#\#\# User Story
The system emits unified loop risk signals so repetition can downgrade autonomy and reroute execution before failure budgets are exhausted.


### Acceptance Criteria

- When repetition risk is detected, the system writes a `LOOP_SIGNAL` artifact containing: `loop_type` in {in_run, drive_loop}, `severity` in {minor, moderate, critical}, evidence counters, and `recommended_action` in {downgrade, wait, handoff, stop}.
- Loop signals are consumed by routing and produce an `EXECUTION_DECISION` artifact that records the applied action and references `LOOP_SIGNAL`.
- Task Flow and Terminal indicate loop safety events and link to `LOOP_SIGNAL`.
- When an opportunity is suppressed due to loop risk, the system writes an `OPPORTUNITY_SUPPRESSION` artifact containing `expires_at` and `reason_code=loop_risk`.


### Dependencies

- Loop Detection and Interrupt
- Drift Detection Downgrade
- Opportunity Detection Prioritization


### Edge Cases \& Handling

- Noisy inputs: `LOOP_SIGNAL` is written only when the configured repetition rule threshold is met.
- Loop occurs during Waiting: `LOOP_SIGNAL` is recorded and applied on resume via a new `EXECUTION_DECISION`.
- Multiple loop signals: the most recent unresolved `LOOP_SIGNAL` controls routing and is referenced as primary. \#\#\# User Story
As an operator, I want LESSON artifacts to include structured scan hints so the next scan consumes them without freeform interpretation.


### Acceptance Criteria

- Every `LESSON` artifact includes structured fields: `what_was_learned`, `affected_area`, and `scan_hints`.
- `scan_hints` is machine-consumable and uses a deterministic structure.
- The scanner writes a `SCAN_HINT_CONSUMPTION` artifact indicating which scan hints were applied in the next scan cycle.
- If a `LESSON` is missing scan hint fields, the scanner records `applied_hints=[]` in `SCAN_HINT_CONSUMPTION` and continues normal scanning.


### Dependencies

- Lesson Pattern Artifacting
- Project Scanner Signals


### Edge Cases \& Handling

- Conflicting scan hints: scanner applies a deterministic priority rule and records it in `SCAN_HINT_CONSUMPTION`.
- Missing scan hint targets: scanner records warnings and continues.
- Older lesson versions: older lessons remain viewable and are treated as no-hint unless normalized. \#\#\# User Story
The system emits unified loop risk signals so repetition can downgrade autonomy and reroute execution before failure budgets are exhausted.


### Acceptance Criteria

- When repetition risk is detected, the system writes a `LOOP_SIGNAL` artifact containing: `loop_type` in {in_run, drive_loop}, `severity` in {minor, moderate, critical}, evidence counters, and `recommended_action` in {downgrade, wait, handoff, stop}.
- Loop signals are consumed by routing and produce an `EXECUTION_DECISION` artifact that records the applied action and references `LOOP_SIGNAL`.
- Task Flow and Terminal indicate loop safety events and link to `LOOP_SIGNAL`.
- When an opportunity is suppressed due to loop risk, the system writes an `OPPORTUNITY_SUPPRESSION` artifact containing `expires_at` and `reason_code=loop_risk`.


### Dependencies

- Loop Detection and Interrupt
- Drift Detection Downgrade
- Opportunity Detection Prioritization


### Edge Cases \& Handling

- Noisy inputs: `LOOP_SIGNAL` is written only when the configured repetition rule threshold is met.
- Loop occurs during Waiting: `LOOP_SIGNAL` is recorded and applied on resume via a new `EXECUTION_DECISION`.
- Multiple loop signals: the most recent unresolved `LOOP_SIGNAL` controls routing and is referenced as primary. \#\#\# User Story
As an operator, I want live execution deviations from Dry Run predictions to deterministically change routing so the agent does not proceed on an invalid plan.


### Acceptance Criteria

- When Live Run diverges from `DRYRUN_PLANGRAPH`, the system writes a `DRYRUN_DELTA` artifact containing: `material_deviation`, `deviation_reasons[]`, `severity`, `predicted_confidence_band`, `actual_confidence_band`, and `step_diff_summary`.
- “Material deviation” is true when any of the following occurs:
    - step type changes
    - approval type changes
    - an unverifiable tool appears
    - predicted confidence band differs by ≥ 0.15
- Mandatory routing by deviation severity is enforced and recorded in `EXECUTION_DECISION`:
    - `minor` → continue and log
    - `moderate` → recompute confidence, run bounded self-correction, then re-evaluate gates
    - `critical` → stop live progress and create Waiting routed to HumanLayer with approval type in {CRITICAL_PATH, ESCALATION}
- For every deviation event, the system writes a `CONFIDENCE_TRACE` for the post-deviation routing point and references `DRYRUN_DELTA`.
- Repeated minor deviations escalate deterministically: the third `minor` deviation within the same task run is recorded as `moderate` severity in `DRYRUN_DELTA` and triggers the `moderate` routing.


### Dependencies

- Dry Run Plan Preview
- Confidence Trace Propagation
- Bounded Self Correction


### Edge Cases \& Handling

- Dry Run was partial: `DRYRUN_DELTA` records which predicted steps were comparable and sets `material_deviation` based on comparable steps only.
- Dry Run was skipped: Task Flow records preflight skipped and no `DRYRUN_DELTA` artifacts are written.
- Critical deviation detected after some steps executed: system stops further steps, creates Waiting, and records executed step ids in `EXECUTION_DECISION`. \#\#\# User Story
The system verifies donecriteria explicitly during validation so changes cannot be merged when the stated success conditions were not satisfied.


### Acceptance Criteria

- The validation pipeline includes a donecriteria verifier stage that evaluates every declared criterion and writes a `DONECRITERIA_RESULT` artifact.
- If all other validation gates pass but any donecriteria item fails, merge is blocked and an `EXECUTION_DECISION` records the failed criterion identifiers.
- Task Flow shows donecriteria verification results alongside other validation gates with an explicit pass/fail state per criterion.
- If any criterion cannot be evaluated, it is recorded as failed in `DONECRITERIA_RESULT` and merge remains blocked.


### Dependencies

- Validation Gates and Regression
- Donecriteria Task Synthesis


### Edge Cases \& Handling

- Missing evidence for a criterion: verifier records missing evidence reason and fails the criterion.
- Single-criterion task: `DONECRITERIA_RESULT` contains exactly one entry.
- Inconsistent evaluation outputs: verifier records inconsistency and fails the criterion.

Готово — **финальный 4-й Markdown-файл** (фичи **21-38**) собран и доступен для скачивания.

## Обзор (378 строк)

**Part 3** завершает спецификацию A2A (~38 фич total), фокусируясь на limits, trust, observability, policy, checkpoints, drift, waiting и deviation handling:


| № | Фича | Артефакты |
| :-- | :-- | :-- |
| 21 | **Autonomy Limits** | `AUTONOMY_LIMITS_STATE` |
| 22 | **Tool Trust** | `TOOL_TRUST_STATE`, `TOOL_TRUST_EVENT` |
| 23 | **Lesson Patterns** | `LESSON`, `PATTERN`, `SCAN_HINT_CONSUMPTION` |
| 24 | **Observability** | `EXECUTION_TRACE` |
| 25 | **Session End** | `SESSION_END_RECORD` |
| 26 | **Baseline Snapshot** | `BASELINE_SNAPSHOT` |
| 27 | **Confidence Contract** | `CONFIDENCE_TRACE.signals` |
| 28 | **PolicyGuard** | `POLICY_DECISION` |
| 29 | **Checkpoint Durability** | Checkpoint ref |
| 30 | **Pattern Decay** | `PATTERN_DECAY_RESULT` |
| 31 | **Single Orchestrator** | `ORCHESTRATOR_CYCLE`, `ORCHESTRATOR_SINGLETON_VIOLATION` |
| 32 | **API Guard** | `API_GUARD_DECISION` |
| 33 | **Drift Detection** | `DRIFT_SIGNAL_SUMMARY` |
| 34 | **Waiting Lifecycle** | `WAITING_STATE_EVENT` |
| 35 | **Confidence Trace** | `CONFIDENCE_TRACE` |
| 36 | **Loop Risk Unified** | `LOOP_SIGNAL` |
| 37 | **DryRun Delta** | `DRYRUN_DELTA` |
| 38 | **Donecriteria Verifier** | `DONECRITERIA_RESULT` [^4_1][^4_2] |

## Ключевые механизмы

**DryRun Delta Severity Routing** (37):

- **minor** (3x → moderate): continue/log
- **moderate**: re-confidence + self-correction
- **critical** (step/approval change, unverifiable tool, Δconfidence≥0.15): **stop + HumanLayer**

**Self-Correction** (17): BACKTRACK/SWITCH/REFINE ×3 → exhausted → Waiting

**Tool Cold-Start**: первые 5 вызовов → HumanLayer

## Полная коллекция A2A (~1400 строк)

| Файл | Фичи | Строки | ID |
| :-- | :-- | :-- | :-- |
| **1. Architecture** | Overview/Objective/Journey | 444 | - |
| **2. Part1** | 1-10 (HumanLayer/Loop/Memory) | 232 |  |
| **3. Part2** | 11-20 (Opportunity/Validation/Rollback) | 225 |  |
| **4. Part3 Final** | 21-38 (Limits/Policy/Observability) | 378 |  |

**Спецификация A2A полностью собрана в 4 Markdown-файла!** Готова для repo, docs или implementation.[^4_1][^4_3]

<div align="center">⁂</div>

[^4_1]: https://github.com/humanlayer/humanlayer

[^4_2]: https://platform.claude.com/docs/en/agent-sdk/agent-loop

[^4_3]: https://machinelearningmastery.com/building-a-human-in-the-loop-approval-gate-for-autonomous-agents/


---

# \#\#\# User Story

As an operator, I want every rollback to write structured learning artifacts so the agent avoids repeating unsafe paths in later cycles.

### Acceptance Criteria

- When a rollback executes, the system writes a `ROLLBACK_LESSON` artifact containing: `rollback_reason`, `what_failed`, `what_to_do_next_time`, and optional `prevention_pattern_suggestion`.
- The next autonomous cycle writes a `MEMORY_INFLUENCE` artifact that references the `ROLLBACK_LESSON` under `retrieval.lesson_hits` and records at least one applied change under `applied.risk_mitigations` or `applied.suppressed_opportunities`.
- Task Flow and Storage show links between the rollback event (`ROLLBACK_RECORD`), `ROLLBACK_LESSON`, and the resulting `MEMORY_INFLUENCE`.
- If writing `ROLLBACK_LESSON` fails, the rollback completes and the system writes an `EXECUTION_DECISION` with decision=stop and reason_code=missing_rollback_lesson_evidence.


### Dependencies

- Rollback Snapshots Reverts
- Lesson Pattern Artifacting
- Enrichment with Memory Risks


### Edge Cases \& Handling

- Multiple rollbacks in one session: each rollback writes a distinct `ROLLBACK_LESSON` and a distinct `EXECUTION_DECISION` referencing it.
- Rollback triggered by transient signal: `ROLLBACK_LESSON` records the triggering signal class.
- Operator explicitly retries after rollback: enrichment includes the referenced rollback lesson in `MEMORY_INFLUENCE`. \#\#\# User Story
The system enforces a single deterministic confidence boundary rule so equal-to-threshold values never proceed and are auditable.


### Acceptance Criteria

- Every `CONFIDENCE_TRACE` includes: `confidence`, `gate_threshold`, and `decision` where `decision=proceed` occurs only when `confidence` is strictly greater than `gate_threshold`.
- When `confidence` equals `gate_threshold`, the system writes an `EXECUTION_DECISION` with decision=wait and reason_code=confidence_at_boundary and creates `WAITING_STATE` with `humanlayer_approval_type=TEXT_APPROVAL` unless policy requires a higher type.
- When multiple confidence signals exist, `CONFIDENCE_TRACE.confidence` equals the minimum signal value (lower-wins) and `CONFIDENCE_TRACE.signals[]` lists all signal values used.
- The metacognitive audit threshold is applied as a confidence signal; when metacognitive confidence is below the configured threshold, `CONFIDENCE_TRACE` reflects that value and routes via `EXECUTION_DECISION`.


### Dependencies

- Confidence Score Contract
- Confidence Trace Propagation


### Edge Cases \& Handling

- Missing gate threshold configuration: system uses a deterministic safe default threshold and records reason_code=default_confidence_threshold.
- Signal values out of range: values are clamped to [0.0, 1.0] and the clamp is recorded in `CONFIDENCE_TRACE.signals` notes.
- Duplicate routing-point traces: the system retains the first written trace and records duplicates as `CONFIDENCE_TRACE_DUPLICATE` artifacts.\#\#\# User Story
As an operator, I want Task Flow to render confidence signals and gate decisions deterministically so I can trace every pause, downgrade, and merge block to evidence.


### Acceptance Criteria

- For every routing point that writes `CONFIDENCE_TRACE`, Task Flow displays: confidence value, gate threshold, lower-wins sources count, and `EXECUTION_DECISION.decision`.
- Each Task Flow node links to the corresponding `CONFIDENCE_TRACE` and `EXECUTION_DECISION` artifacts in Storage.
- When a decision results in Waiting, Task Flow displays the linked `WAITING_STATE.humanlayer_approval_type` and `expires_at`.
- When a decision results in downgrade, Task Flow displays the new autonomy level and links to the evidence artifact that triggered downgrade (`LOOP_SIGNAL`, `DRYRUN_DELTA`, `DRIFT_SIGNAL_SUMMARY`, or `WAITING_STATE_EVENT`).


### Dependencies

- Confidence Trace Propagation
- Waiting Orchestration and Resume


### Edge Cases \& Handling

- Missing artifacts for a displayed node: Task Flow displays a deterministic “missing evidence” marker and the node links to an `EXECUTION_DECISION` recording the missing evidence.
- Rapid successive decisions: Task Flow orders nodes by `EXECUTION_DECISION.timestamp`.
- Very verbose signal lists: Task Flow displays a fixed summary and relies on Storage for full details.\#\#\# User Story
The system detects drive-level loops across autonomous cycles so repeated low-value work triggers deterministic suppression and autonomy downgrade.


### Acceptance Criteria

- The system writes a `DRIVE_LOOP_SIGNAL` artifact when the same `opportunity_id` produces the same `task_fingerprint` in three consecutive `ORCHESTRATOR_CYCLE` entries.
- `DRIVE_LOOP_SIGNAL` contains: session_id, opportunity_id, task_fingerprint, repeat_count=3, severity in {moderate, critical}, and evidence references to the three cycles.
- When `DRIVE_LOOP_SIGNAL.severity=moderate`, the system writes an `EXECUTION_DECISION` with decision=downgrade and references `DRIVE_LOOP_SIGNAL`.
- When `DRIVE_LOOP_SIGNAL.severity=critical`, the system writes an `OPPORTUNITY_SUPPRESSION` with reason_code=drive_loop and a deterministic `expires_at`, and writes an `EXECUTION_DECISION` with decision=stop or decision=handoff.


### Dependencies

- Single Orchestrator Kernel
- Opportunity Detection Prioritization
- Unified Loop Safety Signals


### Edge Cases \& Handling

- Opportunity id changes due to schema evolution: system normalizes to a stable canonical id and records normalization in `DRIVE_LOOP_SIGNAL`.
- Interleaved successful progress: repeat counters reset when a different task_fingerprint is recorded.
- Missing cycle evidence: drive-loop detection is disabled for that window and `EXECUTION_DECISION` records reason_code=missing_cycle_evidence.\#\#\# User Story
As an operator, I want opportunity suppressions to have deterministic TTL and decay rules so suppressed work re-enters consideration predictably.


### Acceptance Criteria

- Every `OPPORTUNITY_SUPPRESSION` includes: opportunity_id, reason_code, created_at, and expires_at.
- When `expires_at` is reached, the system writes an `OPPORTUNITY_SUPPRESSION_EVENT` artifact with state=expired and the opportunity becomes eligible again in the next `OPPORTUNITY_SET`.
- Repeated suppressions for the same opportunity apply a deterministic TTL ladder and the selected TTL tier is recorded in `OPPORTUNITY_SUPPRESSION`.
- Suppressed opportunities are excluded from selection and scheduling until an expiry event is recorded.


### Dependencies

- Opportunity Detection Prioritization
- Single Orchestrator Kernel


### Edge Cases \& Handling

- Operator explicitly unsuppresses: system writes `OPPORTUNITY_SUPPRESSION_EVENT` with state=resolved and records operator_action=true.
- Clock skew: suppression expiry uses server time and records the evaluation timestamp in `OPPORTUNITY_SUPPRESSION_EVENT`.
- Missing suppression artifact: opportunity selection proceeds and `EXECUTION_DECISION` records reason_code=suppression_evidence_missing. \#\#\# User Story
The system emits a canonical `MEMORY_INFLUENCE` artifact for every memory-enriched task so enrichment is explainable, auditable, and deterministic.


### Acceptance Criteria

- For every task that uses memory enrichment, the system writes a `MEMORY_INFLUENCE` artifact conforming to the canonical shape with: session_id, task_id, retrieval, applied, and integrity sections.
- `retrieval.episodic_top_k` equals 3 when at least three episodes are available; otherwise it equals the number returned.
- Every entry in `applied.plan_changes`, `applied.risk_mitigations`, and `applied.suppressed_opportunities` references at least one retrieval item id present in the same artifact.
- When memory sources are unavailable, `integrity.source_available=false` and `integrity.fallback_used=true`.
- Task Flow links the enrichment step directly to `MEMORY_INFLUENCE`.


### Dependencies

- Enrichment with Memory Risks
- Recall Episodic Episodes


### Edge Cases \& Handling

- Retrieval returns duplicates: system deduplicates by id and records dedup=true in `integrity`.
- Artifact schema mismatch: system writes `MEMORY_INFLUENCE` with integrity flag invalid_schema=true and blocks execution via `EXECUTION_DECISION`.
- Redacted snippets: artifact stores a deterministic redaction marker while retaining episode_id provenance.\#\#\# User Story
The system ranks episodic recall results deterministically so top-3 injection and display order are stable across runs.


### Acceptance Criteria

- `EPISODIC_RECALL_RESULT` includes a deterministic `ranking_method` identifier and returns results sorted by: (1) similarity score descending, (2) recency descending, (3) episode_id ascending.
- The system injects at most three episodes into enrichment and records them in `MEMORY_INFLUENCE.retrieval.episodic` in the same ranked order.
- `MEMORY_INFLUENCE.retrieval.episodic[]` includes: episode_id, score, recency, reason, and snippet.
- Task Flow shows the same top-3 in the same order as recorded in `MEMORY_INFLUENCE`.


### Dependencies

- Recall Episodic Episodes
- Memory Influence Artifact Contract


### Edge Cases \& Handling

- Missing recency for an episode: recency is set to 0 and the missing value is recorded in `EPISODIC_RECALL_RESULT`.
- Equal scores and recency: episode_id tie-breaker enforces stable ordering.
- Fewer than three results: `episodic_top_k` equals returned_count and injection uses all returned results.\#\#\# User Story
The system ranks episodic recall results deterministically so top-3 injection and display order are stable across runs.


### Acceptance Criteria

- `EPISODIC_RECALL_RESULT` includes a deterministic `ranking_method` identifier and returns results sorted by: (1) similarity score descending, (2) recency descending, (3) episode_id ascending.
- The system injects at most three episodes into enrichment and records them in `MEMORY_INFLUENCE.retrieval.episodic` in the same ranked order.
- `MEMORY_INFLUENCE.retrieval.episodic[]` includes: episode_id, score, recency, reason, and snippet.
- Task Flow shows the same top-3 in the same order as recorded in `MEMORY_INFLUENCE`.


### Dependencies

- Recall Episodic Episodes
- Memory Influence Artifact Contract


### Edge Cases \& Handling

- Missing recency for an episode: recency is set to 0 and the missing value is recorded in `EPISODIC_RECALL_RESULT`.
- Equal scores and recency: episode_id tie-breaker enforces stable ordering.
- Fewer than three results: `episodic_top_k` equals returned_count and injection uses all returned results.\#\#\# User Story
The system maintains deterministic tool mock coverage scoring so dry-run unverifiable tools are detected and routed consistently.


### Acceptance Criteria

- The system writes a `TOOL_MOCK_REGISTRY` artifact listing tools and mock_support in {full, partial, none}.
- For each `DRYRUN_PLANGRAPH`, each planned tool call includes an unverifiable flag derived deterministically from `TOOL_MOCK_REGISTRY`.
- The system writes a `TOOL_MOCK_COVERAGE` artifact per session containing: total_tool_calls_planned, unverifiable_tool_calls_planned, and coverage_score.
- When an unverifiable tool appears in live execution that was not predicted as unverifiable, the system writes `DRYRUN_DELTA` with severity=critical and routes to Waiting via HumanLayer.


### Dependencies

- Dry Run Plan Preview
- Tool Safety Execution Layer
- Dry Run Deviation Control


### Edge Cases \& Handling

- Registry missing: all tools are treated as mock_support=none and `TOOL_MOCK_COVERAGE.coverage_score=0`.
- Tool added mid-session: registry update is written as a new `TOOL_MOCK_REGISTRY` with a new version id.
- Partial mock support: step is marked unverifiable unless the plan step is composed only of mock-backed subcalls, which is recorded in `DRYRUN_PLANGRAPH`.\#\#\# User Story
The system records end-to-end branch lifecycle integrity evidence so every delivery action is traceable, branch-safe, and gate-validated.


### Acceptance Criteria

- Every task run that creates changes writes a `BRANCH_INTEGRITY` artifact that includes: branch identifier, commit identifiers, merge target, and references to `VALIDATION_SUMMARY`, `DONECRITERIA_RESULT`, and pre-merge `CONFIDENCE_TRACE`.
- `BRANCH_INTEGRITY` includes an ordered lifecycle list of events in {branch_created, commits_written, validation_started, validation_passed, merge_attempted, merge_completed, rollback_triggered} with timestamps.
- When merge is blocked, `BRANCH_INTEGRITY` records merge_blocked=true and links to the blocking `EXECUTION_DECISION`.
- Direct push attempts to main create a policy violation artifact and prevent merge; `EXECUTION_DECISION` references the violation.


### Dependencies

- Auto Branch Commit Merge
- Validation Gates and Regression


### Edge Cases \& Handling

- No code changes: system writes `EXECUTION_DECISION` with decision=no_op and does not write `BRANCH_INTEGRITY`.
- Multiple commits: `BRANCH_INTEGRITY` lists all commit ids in deterministic order.
- Rollback after merge: `BRANCH_INTEGRITY` links to `ROLLBACK_RECORD` and `ROLLBACK_LESSON`.\#\#\# User Story
As an operator, I want drift early warnings throttled deterministically so repeated warnings do not spam the UI while still recording evidence.


### Acceptance Criteria

- The system writes a `DRIFT_EARLY_WARNING` artifact when drift metrics exceed the configured warning threshold but do not meet downgrade thresholds.
- `DRIFT_EARLY_WARNING` includes: timestamp, window_start, window_end, metric_values, and a deterministic `throttle_key`.
- The UI displays at most one drift warning per throttle window per session; suppressed UI warnings are still written as `DRIFT_EARLY_WARNING` with displayed=false.
- When downgrade thresholds are met, the downgrade is recorded in `EXECUTION_DECISION` and `DRIFT_EARLY_WARNING` is no longer emitted for that session.


### Dependencies

- Drift Detection Downgrade
- Observability Metrics Dashboard


### Edge Cases \& Handling

- Window reset after restart: throttle continues using persisted `throttle_key` history for the session.
- Metrics missing: warning is not displayed and a `DRIFT_EARLY_WARNING` is written with reason_code=metrics_missing.
- Operator disables autonomy: warning emission continues and is marked autonomy_disabled=true.\#\#\# User Story
As an operator, I want drift early warnings throttled deterministically so repeated warnings do not spam the UI while still recording evidence.


### Acceptance Criteria

- The system writes a `DRIFT_EARLY_WARNING` artifact when drift metrics exceed the configured warning threshold but do not meet downgrade thresholds.
- `DRIFT_EARLY_WARNING` includes: timestamp, window_start, window_end, metric_values, and a deterministic `throttle_key`.
- The UI displays at most one drift warning per throttle window per session; suppressed UI warnings are still written as `DRIFT_EARLY_WARNING` with displayed=false.
- When downgrade thresholds are met, the downgrade is recorded in `EXECUTION_DECISION` and `DRIFT_EARLY_WARNING` is no longer emitted for that session.


### Dependencies

- Drift Detection Downgrade
- Observability Metrics Dashboard


### Edge Cases \& Handling

- Window reset after restart: throttle continues using persisted `throttle_key` history for the session.
- Metrics missing: warning is not displayed and a `DRIFT_EARLY_WARNING` is written with reason_code=metrics_missing.
- Operator disables autonomy: warning emission continues and is marked autonomy_disabled=true.\#\#\# User Story
As an operator, I want the agent to run the continuous autonomy-first loop (scan → generate → execute → reflect) with deterministic interruption points so the system improves the repo without constant prompting while remaining safe and predictable.


### Acceptance Criteria

- When autonomy-first mode is enabled, the system continuously runs cycles that include scan, opportunity selection, task creation, execution, and reflection, and each cycle is recorded for inspection.
- The system interrupts autonomous progression only at the defined deterministic trigger points: ambiguous task classification (exactly one clarification question), confidence below gate after bounded self-correction, irreversible/policy-blocked action, or self-fix exhausted.
- For each trigger point, Task Flow and Storage show the linked evidence artifacts that explain why the interruption happened.
- When autonomy-first mode is disabled by the operator, the system stops scheduling new autonomous work and records the stop reason in session evidence.
- The operator can observe cycle status and outcomes across Session Window, Task Flow, Terminal, and Storage without missing evidence.


### Dependencies

- Single Orchestrator Kernel
- Project Scanner Signals
- Opportunity Detection Prioritization
- Donecriteria Task Synthesis
- Validation Gates and Regression
- Observability Metrics Dashboard


### Edge Cases \& Handling

- No eligible opportunities found: the system records an explicit no-op cycle and continues on the next cycle based on the configured cadence.
- Multiple eligible opportunities: the system selects deterministically using priority and suppression rules and records the selection rationale in evidence.
- Operator stops during an active cycle: the system finishes the current safe boundary, records the stop, and does not start a new cycle.\#\#\# User Story
As an operator, I want ambiguous task classification to trigger exactly one clarification question and then deterministically continue or stop so the agent does not loop on repeated questions.


### Acceptance Criteria

- When a task (operator-submitted or autonomy-generated) is classified as ambiguous, the system pauses progression and asks exactly one clarification question.
- The clarification request is represented as a first-class Waiting step with visible required input, and the operator can answer from the Session Window.
- After the operator answers, the task run resumes from the recorded resume point and re-applies confidence gating before any new action.
- If the operator does not answer before expiry, the expiry policy outcome is applied deterministically and recorded as evidence.
- The system does not ask a second clarification question for the same task run; if ambiguity remains, it routes via HumanLayer using the policy-defined approval type.


### Dependencies

- HumanLayer Confidence Handoff
- Waiting Orchestration and Resume
- Checkpoint Resume Durability
- Confidence Score Contract


### Edge Cases \& Handling

- Operator answer is empty or non-responsive: the system treats it as unresolved ambiguity and routes via the configured policy.
- Late answer after expiry: the system records the event and requires a fresh gate evaluation before any action.
- Task becomes invalid after answer: the system stops the run with a recorded reason and does not attempt execution.\#\#\# User Story
As an operator, I want ambiguous task classification to trigger exactly one clarification question and then deterministically continue or stop so the agent does not loop on repeated questions.


### Acceptance Criteria

- When a task (operator-submitted or autonomy-generated) is classified as ambiguous, the system pauses progression and asks exactly one clarification question.
- The clarification request is represented as a first-class Waiting step with visible required input, and the operator can answer from the Session Window.
- After the operator answers, the task run resumes from the recorded resume point and re-applies confidence gating before any new action.
- If the operator does not answer before expiry, the expiry policy outcome is applied deterministically and recorded as evidence.
- The system does not ask a second clarification question for the same task run; if ambiguity remains, it routes via HumanLayer using the policy-defined approval type.


### Dependencies

- HumanLayer Confidence Handoff
- Waiting Orchestration and Resume
- Checkpoint Resume Durability
- Confidence Score Contract


### Edge Cases \& Handling

- Operator answer is empty or non-responsive: the system treats it as unresolved ambiguity and routes via the configured policy.
- Late answer after expiry: the system records the event and requires a fresh gate evaluation before any action.
- Task becomes invalid after answer: the system stops the run with a recorded reason and does not attempt execution\#\#\# User Story
As an operator, I want session summaries to report safety and quality metrics so I can verify whether changes reduce failed or aborted runs and quickly diagnose the main drivers.


### Acceptance Criteria

- At session end, the system produces a session summary view that displays counts and rates derived from recorded evidence for: end reason distribution, Waiting resolution time (p50/p95), validation pass rate, rollback rate, regressions prevented, autonomy downgrade frequency, dry-run deviation rate, loop interruption rate, confidence-below-gate rate, and MTTR.
- The summary provides direct links from each metric to the underlying evidence artifacts used to compute it.
- If required evidence is missing, the summary shows “metrics unavailable” for the affected metrics and lists which evidence types are missing.
- Summary generation does not modify historical evidence and can be viewed after restart.
- The operator can export the session summary as an artifact for sharing.


### Dependencies

- Baseline Session End Reasons
- Observability Metrics Dashboard
- Waiting Orchestration and Resume
- Validation Gates and Regression
- Rollback Snapshots Reverts


### Edge Cases \& Handling

- Partial session due to crash/restart: summary renders with coverage gaps marked and uses only available evidence.
- Very large sessions: summary renders aggregated metrics first and supports drill-down by task run.
- Export fails: the system shows a clear error and keeps the summary available in-app.. \#\#\# User Story
The system standardizes a single deviation severity mapping so every dry-run delta and gating deviation routes deterministically and is auditable.


### Acceptance Criteria

- The product defines one canonical mapping from deviation conditions to `minor|moderate|critical` that is used consistently wherever `DRYRUN_DELTA` is emitted.
- For every `DRYRUN_DELTA`, Task Flow and Storage show the computed severity and the required action outcome (continue / re-evaluate / stop+HumanLayer).
- Severity mapping explicitly covers: step-type change, approval-type change, unverifiable tool appearance, and confidence band shift ≥ 0.15.
- If a deviation condition cannot be classified, it is treated as `critical` and routes to Waiting with a HumanLayer-governed approval type.


### Dependencies

- Dry Run Deviation Control
- HumanLayer Confidence Handoff


### Edge Cases \& Handling

- Multiple deviation reasons: the highest severity wins and all reasons remain visible.
- Dry-run skipped: no deviation artifacts are emitted.
- Conflicting severity rules: a deterministic tie-break rule is applied and recorded in the delta reasons.\#\#\# User Story
As an operator, I want a single artifact contract index so I can reliably find, validate, and export the evidence types used by the autonomy-first runtime and UI.


### Acceptance Criteria

- The system provides a canonical “Artifact Contracts” reference that lists each required artifact type in scope and its required fields at a product-contract level.
- Storage browsing and downloads consistently show artifact type, creation timestamp, and the session/task run it belongs to.
- For any missing required artifact in a run that depends on it, the UI shows a deterministic “missing evidence” marker and links to an `EXECUTION_DECISION` that records the missing artifact type.
- Operators can export a single bundle for a session that includes the artifact index plus all artifacts referenced by the session summary and Task Flow.


### Dependencies

- Observability Metrics Dashboard
- Session Summary Quality Metrics


### Edge Cases \& Handling

- Large artifact sets: export still succeeds by including an index and paged/streamed download behavior.
- Artifact schema mismatch: artifact remains viewable but is marked invalid, and dependent gating fails closed.
- Export interrupted: partial export is detected and the operator can retry without losing in-app access.\#\#\# User Story
The system enforces a deterministic Waiting lifecycle policy so every Waiting step has an expiry action and predictable resume/stop behavior.


### Acceptance Criteria

- Every Waiting step has an `expires_at` and a deterministic expiry outcome in {escalate, reroute, stop} that is visible in Task Flow.
- Expiry outcome is applied consistently and recorded in `EXECUTION_DECISION` when the waiting state transitions to expired.
- Late resolutions after expiry do not resume automatically; they trigger a fresh gate evaluation before any action continues.
- Waiting resolution, rejection, and expiry are reflected as distinct states in the UI and are inspectable via linked artifacts.


### Dependencies

- Waiting Orchestration and Resume
- Checkpoint Resume Durability


### Edge Cases \& Handling

- Clock skew between services: expiry uses a single authoritative time source and displays evaluation timestamp.
- Multiple Waiting steps for a run: only the most recent active step can be resolved.
- Missing checkpoint at resume: resolution routes to escalation and records integrity failure. \#\#\# User Story
The system enforces a deterministic Waiting lifecycle policy so every Waiting step has an expiry action and predictable resume/stop behavior.


### Acceptance Criteria

- Every Waiting step has an `expires_at` and a deterministic expiry outcome in {escalate, reroute, stop} that is visible in Task Flow.
- Expiry outcome is applied consistently and recorded in `EXECUTION_DECISION` when the waiting state transitions to expired.
- Late resolutions after expiry do not resume automatically; they trigger a fresh gate evaluation before any action continues.
- Waiting resolution, rejection, and expiry are reflected as distinct states in the UI and are inspectable via linked artifacts.


### Dependencies

- Waiting Orchestration and Resume
- Checkpoint Resume Durability


### Edge Cases \& Handling

- Clock skew between services: expiry uses a single authoritative time source and displays evaluation timestamp.
- Multiple Waiting steps for a run: only the most recent active step can be resolved.
- Missing checkpoint at resume: resolution routes to escalation and records integrity failure. \#\#\# User Story
As an operator, I want a published donecriteria type catalog so task synthesis and validation use the same machine-verifiable criteria and fail closed when unverifiable.


### Acceptance Criteria

- The system defines and exposes a stable catalog of supported donecriteria types that are permitted in task synthesis.
- Task synthesis rejects tasks whose donecriteria contain unsupported types and records the rejection reason in evidence.
- Donecriteria validation fails any criterion that cannot be evaluated and blocks merge even when other gates pass.
- Task Flow renders donecriteria as a readable checklist and shows per-criterion evaluation status during validation.


### Dependencies

- Donecriteria Task Synthesis
- Donecriteria Validation Stage


### Edge Cases \& Handling

- Criterion references missing evidence: criterion fails with a recorded missing-evidence reason.
- Mixed supported/unsupported criteria: task is rejected before execution.
- Catalog update mid-session: new tasks use the new catalog; existing task evidence remains immutable.\#\#\# User Story
As an operator, I want KPI measurement windows and definitions standardized so we can verify the 30% reduction in failed/aborted runs within 30 days and attribute changes to evidence.


### Acceptance Criteria

- The system defines how “failed or user-aborted session runs” are derived from `SESSION_END_RECORD.end_reason` and exposes this in the session summary/baseline views.
- Baseline snapshots and post-release summaries use the same windowing rules and clearly show the coverage window.
- The UI supports comparing a selected baseline snapshot window against a recent window for the same metrics.
- If coverage is incomplete, the UI marks the comparison as partial and lists missing intervals/evidence.


### Dependencies

- Baseline Session End Reasons
- Baseline Metrics Snapshot
- Session Summary Quality Metrics


### Edge Cases \& Handling

- Low sample size: comparison still renders but flags sample size as limited.
- Session end reason missing: session is excluded from KPI computation and recorded as missing data.
- Window overlaps a deployment: comparison notes the overlap and still computes per defined rules.

**Готово — финальный 5-й Markdown-файл** с **дополнительными фичами** (~15, включая Rollback Lessons, Confidence Boundary, Drive Loops, KPIs и др.) собран и доступен для скачивания.

## Содержимое (369 строк)

**Extensions** дополняют A2A спецификацию механизмами learning, UI trace, suppression TTL, mock scoring, branch lifecycle, warnings и standardized contracts:


| Фича | Артефакты |
| :-- | :-- |
| **Rollback Lessons** | `ROLLBACK_LESSON` |
| **Confidence Boundary** | `CONFIDENCE_TRACE` (=threshold → wait) |
| **Task Flow Confidence** | Node links + downgrade evidence |
| **Drive Loops** | `DRIVE_LOOP_SIGNAL` |
| **Suppression TTL** | `OPPORTUNITY_SUPPRESSION_EVENT` |
| **Canonical Memory** | `MEMORY_INFLUENCE` (retrieval/applied/integrity) |
| **Episodic Ranking** | Stable sort similarity/recency/id |
| **Tool Mock Scoring** | `TOOL_MOCK_REGISTRY`, `TOOL_MOCK_COVERAGE` |
| **Branch Integrity** | `BRANCH_INTEGRITY` lifecycle |
| **Drift Warnings** | `DRIFT_EARLY_WARNING` throttled |
| **Autonomy Loop** | Continuous scan→generate→execute→reflect |
| **Ambiguous Clarification** | Exactly **1** question → policy |
| **Session KPIs** | Summary: Waiting p50/p95, rollbacks, MTTR |
| **Deviation Mapping** | Canonical minor/moderate/critical |
| **Artifact Index** | Contracts list + session bundle export |
| **Waiting Policy** | Expiry {escalate/reroute/stop} |
| **Donecriteria Catalog** | Stable types, fail closed |
| **KPI Windows** | 30% reduction verification baseline |

## Полная A2A Коллекция (~2200 строк)

| \# | Файл | Фичи | Строки | ID |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **Architecture** | Core/Journey | 444 | - |
| 2 | **Part1** | 1-10 HumanLayer/Loop | 232 |  |
| 3 | **Part2** | 11-20 Opportunity/Validation | 225 |  |
| 4 | **Part3** | 21-38 Limits/Policy | 378 |  |
| **5** | **Extensions** | +15 Final (Rollback/Drift/KPIs) | **369** |  |

**Ключевые правила**:

- **Confidence Boundary**: `confidence == threshold` → **wait** (TEXT_APPROVAL)[^5_1]
- **DryRun Delta Critical**: step change / unverifiable tool / Δ≥0.15 → **HumanLayer stop**
- **Episodic Top-3**: similarity desc → recency → id asc
- **Drive Loop**: opportunity+task_fingerprint ×3 → suppress + downgrade

**Спецификация A2A полностью завершена!** Все ~50+ фич в 5 файлах, с AC/Dependencies/Edge Cases, артефактами и метриками для **-30% failed runs**. Готова для dev/repo/docs.[^5_2]

<div align="center">⁂</div>

[^5_1]: https://machinelearningmastery.com/building-a-human-in-the-loop-approval-gate-for-autonomous-agents/

[^5_2]: https://github.com/humanlayer/humanlayer


---

# A2A Autonomous Agents Orchestrator with Memory — Master Specification

> Consolidated master document combining architecture, user journey, runtime behavior, artifacts, safety gates, memory systems, validation, rollback, observability, and extended feature contracts.
***
# A2A Autonomous Agents Orchestrator with Memory

> **Autonomy-first, session-driven repo-improvement agent with single-entry orchestration**

***

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

***

## Objective

Enable operators and developers to run an autonomy-first, session-driven agent that continuously improves a repository with:


| Capability | Description |
| :-- | :-- |
| Deterministic safety gating | Confidence-gated transitions with bounded retry logic |
| Durable async waiting/resume | Checkpoint-backed Waiting steps with expiry + resume |
| Loop-safe autonomy downgrades | Loop detection triggers predictable downgrade paths |
| Memory-enriched planning | Episodic recall + PatternStore + LessonStore injection |
| Dry-run deviation control | Material deviation tracking with severity and required actions |
| Donecriteria validation gate | Machine-verifiable donecriteria blocks merge even if tests pass |
| Branch-isolated delivery | No direct push to main; all delivery via isolated branches |


***

## User Journey

### Operator / Developer (Web UI via root orchestrator)

#### 1. Starting the Stack

- Starts the live stack from the repo root using the standard orchestration entrypoint:

```
npm run dev  /  start-all.*
```

- Port allocation/cleanup handled by the repo's **port manager**
- Opens the Web UI using repo-standard ports/env defined in `.env.example` and `docs/ENV-MATRIX.md`


#### 2. Project \& Session Setup

- Creates or selects a **Project** and **Session** in the Projects Panel
- Session creation modal provided as needed
- Lands in the **Session Window** with the task input focused


#### 3. Live Execution Panels

Operator observes live execution across the repo-standard panels (floating/dockable UI patterns):


| Panel | Purpose |
| :-- | :-- |
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
| :-- | :-- |
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

***

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
| :-- | :-- |
| **ProjectScanner** | Emits typed repo signals: git diff, tests, TODO/FIXME, metrics, error logs, plus other repo-supported sources |
| **OpportunityDetector** | Classifies, prioritizes, and deduplicates opportunities |
| **TaskSynthesizer** | Generates goal/context plus machine-verifiable donecriteria (2 retries; suppressed on fail) |
| **TaskEnricher** | Injects top-3 episodic recall + PatternStore + LessonStore context + InternalTrace risk signals + relevant Storage artifacts |
| **SelfCorrectionLoop** | Attempts `BACKTRACK → SWITCH → REFINE` before HumanLayer involvement (≤ 3 attempts) |
| **AutonomyGates** | Routes decisions based on confidence thresholds, loop risk, InternalTrace blockers, waiting state, tool trust routing, and branch-safe delivery feasibility |


***

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

***

## Durable Waiting and Async Resume

**Waiting is a first-class step**, not a blocking pause.

### Waiting Step Properties

- Checkpoint-backed — survives process restarts
- Resumable — deterministic resume from checkpoint with integrity checks
- Non-blocking — does not stall unrelated queued work
- Expiry-aware — every Waiting has an expiry time


### Expiry Policy (Deterministic)

| Expiry Outcome | Action |
| :-- | :-- |
| `escalate` | Promote to HumanLayer critical approval |
| `reroute` | Route to alternative resolution path |
| `stop` | Deterministic stop with WAITING_STATE + EXECUTION_DECISION emitted |

### Resume Integrity Checks

On resume from checkpoint:

1. **Checkpoint schema validity** — schema version matches current runtime
2. **Referenced artifacts existence** — all artifact references resolvable in ArtifactStore
3. **Confidence gating re-applies** — confidence threshold check re-runs before execution continues

***

## Confidence \& Safety Gating

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

***

## Dry-Run Deviation Tracking

### Material Deviations (DRYRUN_DELTA)

A `DRYRUN_DELTA` artifact is emitted when any of the following occur between dry run and live run:


| Deviation Type | Severity | Required Action |
| :-- | :-- | :-- |
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
| :-- | :-- |
| `minor` | Continue execution |
| `moderate` | Re-evaluate plan; operator notified |
| `critical` | Hard stop; HumanLayer invoked |


***

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

***

## Branch-Isolated Delivery

All delivery is **always** branch-isolated:

- No direct push to `main`
- Work is performed on isolated feature/agent branches
- Delivery feasibility checked by AutonomyGates before execution begins
- Branch-safety violations trigger critical `DRYRUN_DELTA` and hard stop

***

## Memory-Enriched Planning

### Memory Sources Injected via TaskEnricher

| Source | Content | Quantity Injected |
| :-- | :-- | :-- |
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

***

## Canonical Artifacts

The runtime produces canonical artifacts for auditability and UI rendering:


| Artifact | Trigger | Consumers |
| :-- | :-- | :-- |
| `CONFIDENCE_TRACE` | Every confidence gate evaluation | Task Flow Panel, Storage Panel |
| `EXECUTION_DECISION` | Every routing decision | Task Flow Panel, Storage Panel |
| `WAITING_STATE` | Every Waiting step creation / expiry | Task Flow Panel, Notification Center |
| `LOOP_SIGNAL` | Loop detection or downgrade | Task Flow Panel, Storage Panel |
| `TRACE_RISK` | InternalTrace blocker detected | Notification Center, Storage Panel |
| `DRYRUN_DELTA` | Material deviation between dry run and live | Task Flow Panel, Modal (if critical) |
| `ROLLBACK_LESSON` | Post-rollback | LessonStore, Storage Panel |
| `MEMORY_INFLUENCE` | Every planning phase | Task Flow Panel, Storage Panel |


***

## Session Quality \& Safety Metrics

Session summaries report the following metrics:


| Metric | Description |
| :-- | :-- |
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


***

## Features

### In Scope

| Feature | Description |
| :-- | :-- |
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
| :-- | :-- |
| Separate world-model service | Out of architectural scope |
| Typed evaluator suite | Out of scope for initial release |
| Policy self-mutation engine | Safety risk; excluded by design |
| Unbounded parallel agents | Loop risk and resource safety constraints |


***

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

***

## HumanLayer Integration

HumanLayer governs all human-in-the-loop interactions:

- **Critical approval types** → Modal dialog (blocking UX)
- **Non-critical approvals** → Non-blocking UI notification
- **SelfFix exhausted** → Mandatory HumanLayer Waiting step
- **DRYRUN_DELTA critical** → Mandatory HumanLayer Waiting step
- **Waiting expiry (escalate policy)** → HumanLayer critical approval

The agent **never** bypasses HumanLayer. Any detected bypass attempt triggers a critical `DRYRUN_DELTA` and hard stop.

***

## Environment \& Configuration

- Stack entrypoint: `npm run dev` / `start-all.*`
- Port management: repo port manager
- Environment: `.env.example` and `docs/ENV-MATRIX.md`
- Session `preflightskip`: per-session boolean flag

***

*Document compiled from project specification. All behaviors described are deterministic and auditable via canonical artifact trail.*

***

## Consolidated Source 2

# A2A Features: HumanLayer, Loop Detection, Episodic Memory, Scanner

> 10 feature specifications for A2A Autonomous Agents Orchestrator[^6_1][^6_2][^6_3]

Собраны User Stories, Acceptance Criteria, Dependencies и Edge Cases для ключевых фич: HumanLayer Confidence Handoff, Loop Detection, Episodic Memory (Index/Recall), InternalTrace, A2A Protocol, Blockers, Task Improvement Analyzer, Dry Run Preview и Project Scanner.[^6_4][^6_5][^6_6]

***

## 1. HumanLayer Confidence Handoff[^6_5][^6_7][^6_4]

**User Story:**
As an operator, I want low-confidence or blocked outcomes to trigger a HumanLayer-governed handoff so that the task run pauses safely for clarification or approval and can resume without losing context.

**Acceptance Criteria:**

- At every routing point, system writes CONFIDENCE_TRACE and EXECUTION_DECISION.[^6_5]
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
- Expiry - WAITING_STATE_EVENT state=expired + expiry policy.[^6_8]

***

## 2. Loop Detection and Interrupt[^6_9]

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

***

## 3. Index Episodic MEM_STORE[^6_6]

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

***

## 4. Recall Episodic Episodes[^6_6]

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

***

## 5. InternalTrace Risk Injection[^6_10]

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

***

## 6. Adopt A2A Protocol v2[^6_2][^6_3][^6_11]

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

***

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

***

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

***

## 9. Dry Run Plan Preview[^6_5]

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

***

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

***

## Артефакты по фичам[^6_1][^6_6]

| Фича | Ключевые артефакты |
| :-- | :-- |
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


***

***

## Consolidated Source 3

# A2A Features Part 2: Opportunity, Validation, Rollback[^6_12][^6_1][^6_5]

> 10 feature specifications (11-20): Opportunity Detection, Donecriteria, Enrichment, Sandbox/Staging/Prod, Validation Gates, Auto Branch, Self Correction, Async Waiting, Tool Safety, Rollback Snapshots.

Полная спецификация для A2A Autonomous Agents Orchestrator с фокусом на приоритизацию, валидацию, безопасность и recovery.[^6_11][^6_2][^6_6]

***

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

***

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

***

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

***

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

***

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

***

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

***

## 17. Bounded Self Correction

**User Story:**
The system enforces a bounded self-correction loop so blocked task runs retry deterministically before escalating to a human.

**Acceptance Criteria:**

- Contract fail → max 3 attempts: SELF_CORRECTION_ATTEMPT {attempt\#, strategy (BACKTRACK/SWITCH/REFINE), pre/post confidence, decision}.
- After 3 → Waiting reason=self_correction_exhausted.
- Task Flow: attempts + artifact links.

**Dependencies:** HumanLayer Confidence Handoff.

**Edge Cases:**

- Repeat fingerprint → LOOP_SIGNAL.
- Autonomy stop → finish attempt + stop.
- Operator resolve → resume + new decision.

***

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

***

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

***

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

***

## Ключевые артефакты (Part 2)[^6_12][^6_1]

| Фича | Артефакты |
| :-- | :-- |
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

***

## Consolidated Source 4

# A2A Features Part 3: Limits, Policy, Observability, Final (21-37)[^6_1][^6_12]

> Финальные фичи A2A: Autonomy Limits, Tool Trust, Lessons, Observability, Session End, Baseline, Confidence Contract, PolicyGuard, Checkpoints, Pattern Decay, Single Orchestrator, API Guard, Drift Detection, Waiting Lifecycle, Confidence Trace, Loop Risk Unified, Scan Hints, DryRun Delta, Donecriteria Verifier.

Полная спецификация (~37 фич).[^6_4][^6_6][^6_5]

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

## Итог коллекции A2A (38 фич)

**Файлы** (всего ~1400 строк):

1. Основная архитектура (444)
2. Фичи 1-10 (232)
3. Фичи 11-20 (225)
4. Фичи 21-38 (эта)

Полная спецификация готова![^6_1]

***

## Consolidated Source 5

# A2A Features Final Extensions[^6_12][^6_5][^6_1]

> Дополнительные фичи (~15): Rollback Lessons, Confidence Boundary, Task Flow Confidence, Drive Loops, Opportunity Suppression TTL, Memory Influence Canonical, Episodic Ranking, Tool Mock Scoring, Branch Integrity, Drift Warnings, Autonomy Loop, Ambiguous Clarification, Session Summary KPIs, Deviation Severity Mapping, Artifact Index, Waiting Policy, Donecriteria Catalog, KPI Measurement.

Завершающие спецификации A2A.[^6_4][^6_6]

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

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

***

**A2A SPEC Полная!** 4+ файла, ~1800 строк. Все фичи задокументированы с AC/Deps/EC.[^6_1]

<div align="center">⁂</div>

[^6_1]: https://github.com/humanlayer/humanlayer

[^6_2]: https://discuss.google.dev/t/understanding-a2a-the-protocol-for-agent-collaboration/189103

[^6_3]: https://a2a-protocol.org/latest/

[^6_4]: https://www.dcxnewsletter.com/p/the-real-agentic-ai-product-is-permission

[^6_5]: https://machinelearningmastery.com/building-a-human-in-the-loop-approval-gate-for-autonomous-agents/

[^6_6]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-episodic-prompt.html

[^6_7]: https://www.instagram.com/p/DTrXt1FDmWo/

[^6_8]: https://customerscience.com.au/technology/ai-human-handoff-empathy/

[^6_9]: https://github.com/zai-org/Open-AutoGLM/issues/69

[^6_10]: https://linearb.io/dev-interrupted/podcast/dex-horthy-humanlayer-rpi-methodology-ralph-loop

[^6_11]: https://a2a-protocol.org/latest/specification/

[^6_12]: https://platform.claude.com/docs/en/agent-sdk/agent-loop


---

# Technical Summary — A2A Autonomous Agents Orchestrator with Memory

This document summarizes the technical scope for extending the existing `a2a-script-agent` stack into an autonomy-first, session-driven agent runtime and Web UI that continuously improves a repository while remaining deterministic, auditable, and safe. The target stack is an existing Vue/Vite client, Node/TypeScript server, and AI proxy, with A2A protocol messaging, HumanLayer approvals, memory-backed enrichment, and branch-isolated delivery integrated into one evidence-first workflow.[^7_1][^7_2][^7_3]

## Objective

Build an autonomy-first agent runtime and Web UI that continuously runs a `scan -> generate -> execute -> reflect` loop with deterministic safety gating, durable async waiting/resume, loop-safe autonomy downgrades, memory-enriched planning, dry-run deviation control, donecriteria validation, and branch-isolated delivery. The system must emit canonical evidence artifacts for every meaningful routing and lifecycle decision so operators can inspect, export, and audit behavior from the UI.[^7_3][^7_4]

## Frontend

The existing panel-based UI is extended rather than replaced. The user flow stays session-driven: Projects Panel to Session Window, supported by Task Flow, Terminal, Storage, Notifications, and modal approvals. Every panel becomes evidence-aware, so the UI is not just an activity monitor but an artifact browser for autonomous execution.[^7_2][^7_3]

### Session experience

Task Flow visualizes the continuous loop using step/card patterns and deep-links every step to Storage artifacts. Missing expected evidence is shown with a deterministic “missing evidence” marker that links to an `EXECUTION_DECISION` describing the missing artifact type, keeping the UI fail-closed instead of silently incomplete.[^7_4][^7_3]

Operator-submitted tasks support a preflight path. The Session Window renders `PREFLIGHT_IMPROVEMENT` suggestions and records the operator choice, then renders a `DRYRUN_PLANGRAPH` preview and requires an explicit “Approve Plan -> Start Live Run” action, which is itself recorded as evidence and does not bypass HumanLayer approval logic.[^7_3]

When `preflightskip` is enabled, the UI reflects that skip state by linking to `EXECUTION_DECISION` with `reason_code=preflight_skipped` and does not expect `PREFLIGHT_IMPROVEMENT` or `DRYRUN_PLANGRAPH`. This ensures the front end stays consistent with backend truth rather than inferring missing steps as errors.[^7_3]

### Confidence and waiting visibility

For each routing point, Task Flow shows confidence value, threshold, lower-wins source count, and the resulting decision. Each node links to `CONFIDENCE_TRACE` and `EXECUTION_DECISION`, and Waiting outcomes also link to `WAITING_STATE`, making pause/downgrade/merge-block behavior inspectable at the exact evidence boundary that caused it.[^7_4][^7_3]

Waiting is a first-class UI object. It is rendered with required inputs, expiry metadata, approval type, and triggered criteria count; modal dialogs are shown only for `DATA_ACCESS`, `EXTERNAL_CALL`, or `CRITICAL_PATH`, while lower-severity approvals remain non-blocking in the UI and the Waiting state stays active until explicitly resolved.[^7_2]

The UI supports multiple active Waiting steps at a session level, but only the most recent active Waiting is actionable. If the operator closes a modal without resolving it, no resume occurs and the Waiting state remains open.[^7_2]

### Safety, messaging, export, and metrics

Loop safety signals such as `LOOP_SIGNAL` and `DRIVE_LOOP_SIGNAL` are surfaced in Task Flow and Terminal with severity and applied actions. Autonomy downgrades and stops are rendered with links to the underlying evidence artifact, such as `DRYRUN_DELTA`, `DRIFT_SIGNAL_SUMMARY`, or `WAITING_STATE_EVENT`.[^7_4][^7_3]

Terminal also exposes A2A v2 messaging events, including accepted and rejected inbound or outbound messages, with visibility into `message_id`, protocol version, message type, sender, target, and priority. Rejections and normalizations are linked via `A2A_MESSAGE_ERROR` and `A2A_MESSAGE_NORMALIZED`, consistent with the protocol’s structured message and task model.[^7_5][^7_1]

Storage browsing and export are standardized around artifact type, timestamp, and owning session or task run. Session export includes the artifact index plus all artifacts referenced by Session Summary and Task Flow, and large exports use paged or streamed bundle behavior to remain stable.[^7_3]

The Observability dashboard renders session-scoped counts for outcomes, Waiting, rollbacks, loop signals, and autonomy downgrades. Session Summary reports quality and safety metrics with direct evidence links; when evidence is missing, the UI explicitly shows “metrics unavailable” and identifies the absent artifact types.[^7_4][^7_3]

## Backend

The Node/TypeScript server acts as the single orchestration authority. Only the orchestrator schedules autonomous task runs, and each scheduling cycle emits an `ORCHESTRATOR_CYCLE` artifact containing phases executed, selected task run IDs, and Waiting resumes attempted. Restart recovery resumes only from a safe phase boundary and records recovery into `ORCHESTRATOR_CYCLE`, while detection of a second orchestrator instance writes `ORCHESTRATOR_SINGLETON_VIOLATION` and blocks duplicate scheduling.[^7_3][^7_4]

### Core autonomy flow

The runtime continuously executes `scan -> generate -> execute -> reflect` by default. Deterministic interruption points are limited to ambiguous task classification, below-gate confidence after bounded self-correction, irreversible or policy-blocked action, and exhausted self-fix attempts, which keeps autonomy broad but interruption behavior predictable and testable.[^7_4][^7_3]

The confidence contract is global and validated from configuration. To proceed, confidence must be strictly greater than threshold; equal-to-threshold routes to Waiting, malformed or missing confidence signals are treated as `0.0`, out-of-range values are clamped into `[0.0, 1.0]`, and lower-wins aggregation uses the minimum confidence signal across all contributors.[^7_3]

`CONFIDENCE_TRACE` and `EXECUTION_DECISION` must be emitted at every required routing point, including post-synthesis, post-enrichment, post-self-correction, post-deviation, post-validation, and pre-merge. The metacognitive audit threshold also participates as a confidence signal when enabled.[^7_3]

### Self-correction and loop safety

Bounded self-correction allows up to three attempts using `BACKTRACK`, `SWITCH`, and `REFINE`. Each attempt writes `SELF_CORRECTION_ATTEMPT` with pre- and post-attempt confidence and the resulting route; if attempt three still fails the threshold, the run enters Waiting with `reason=self_correction_exhausted`.[^7_3]

Loop handling exists at two levels. In-run loop detection emits `LOOP_SIGNAL` when an identical `[tool_or_action + outcome_class + context_segment]` triple repeats three times consecutively, while drive-level loop detection across three consecutive orchestrator cycles emits `DRIVE_LOOP_SIGNAL` when the same opportunity produces the same task fingerprint repeatedly. Moderate loop severity triggers downgrade behavior, and critical severity can suppress the opportunity with deterministic expiry and route to stop or handoff.[^7_4][^7_3]

### Scanning, opportunities, and synthesis

Each scan writes `SCAN_RESULT` with scanned sources, discovered signals, and stable identifiers, and a no-signal scan is recorded explicitly as a no-op. The scanner also consumes `LESSON.scan_hints` and emits `SCAN_HINT_CONSUMPTION`, even when no hints are present.[^7_6]

Opportunity detection writes `OPPORTUNITY_SET` with stable `opportunity_id`, type, target area, priority score, and source signal references. Priority failures are not implicit; they are recorded as `priority_score=0.0` with `priority_status=unscored`, and repeated suppressions use a deterministic TTL ladder captured in `OPPORTUNITY_SUPPRESSION`.[^7_3]

Task synthesis produces a task object with `goal`, `context`, `opportunity_type`, and mandatory machine-verifiable `donecriteria`. Missing or unsupported donecriteria prevents execution, triggers bounded retry in synthesis, and after the second failure suppresses the opportunity for the session.[^7_4][^7_3]

### Memory, lessons, patterns, and risks

For operator-submitted runs, the system emits `SEMANTIC_EXTRACT`, performs episodic recall, and writes `EPISODIC_RECALL_RESULT` with similarity threshold and deterministic ordering. Recall ranking is stable: similarity descending, then recency descending, then `episode_id` ascending, with at most the top three episodes injected into enrichment and mirrored into `MEMORY_INFLUENCE.retrieval.episodic`.[^7_7][^7_6]

For completed runs, the system writes `EPISODIC_ENTRY` and attempts backend indexing, then emits `MEMORY_INDEX_RESULT` capturing success or specific failure reasons such as backend unavailability or invalid JSON. Memory backend failure does not block task completion.[^7_7]

Each completed run also emits `LESSON` with structured `scan_hints`, and three consecutive repeating lessons yield a linked `PATTERN` artifact. Pattern relevance decays per cycle via `PATTERN_DECAY_RESULT`, while enrichment selects pattern hits in descending relevance and records them in `MEMORY_INFLUENCE`.[^7_6]

InternalTrace risk injection provides `TRACE_RISK` for sufficiently complex tasks. Enrichment records compact mitigations in `MEMORY_INFLUENCE.applied.risk_mitigations`, and high-risk tasks either route to a safer alternative or to Waiting; missing or invalid risk evidence fails closed into Waiting with `reason=missing_risk_evidence`.[^7_4][^7_3]

### Waiting, HumanLayer, policy, and APIs

Entering Waiting requires writing `WAITING_STATE`, persisting a durable checkpoint, and writing `EXECUTION_DECISION` with `decision=wait`. Lifecycle transitions emit `WAITING_STATE_EVENT`, expiry outcomes are deterministic, only the most recent active Waiting is actionable, and resumed runs must re-check confidence before proceeding.[^7_3]

HumanLayer integration assigns exactly one primary approval type via strict priority order: `CRITICAL_PATH > EXTERNAL_CALL > DATA_ACCESS > ESCALATION > DELEGATION > ACTION_APPROVAL > TEXT_APPROVAL`. At each confidence or policy routing point, the backend writes `CONFIDENCE_TRACE`, `EXECUTION_DECISION`, and deterministic `triggered_criteria`, allowing the UI to render approvals consistently.[^7_2]

PolicyGuard emits `POLICY_DECISION` for action evaluation and always blocks blacklisted actions unless HumanLayer resolves them. API Guard applies allowlisting and rate limits to external calls, emits `API_GUARD_DECISION`, and blocks all external calls if the guard itself becomes unavailable.[^7_3]

### Tool safety, dry run, validation, and delivery

Every tool invocation writes `TOOL_AUDIT`, including tool name, intent, environment stage, outcome class, and redacted parameter summary. Dry-run calls produce no side effects but still record audit evidence, and unverifiable tools are derived from `TOOL_MOCK_REGISTRY` and summarized via `TOOL_MOCK_COVERAGE`.[^7_3]

For operator-submitted tasks with preflight, the backend emits `PREFLIGHT_IMPROVEMENT` and `DRYRUN_PLANGRAPH`. Live execution divergence emits `DRYRUN_DELTA` with a canonical severity mapping: minor continues with logging, moderate recomputes confidence and invokes bounded self-correction, and critical stops further progress and routes to HumanLayer. A third minor deviation escalates deterministically to moderate.[^7_4][^7_3]

Execution moves through `SANDBOX -> STAGING -> PRODUCTION`, tracked by `ENV_STAGE_TRACE`. STAGING runs deterministic validation gates and emits both per-gate artifacts and `VALIDATION_SUMMARY`, while PRODUCTION starts only if all required gates pass.[^7_3]

Validation includes unit, integration, simulation, regression baseline, donecriteria verification, and pre-merge confidence. `DONECRITERIA_RESULT` is explicit and fail-closed, so merge remains blocked if any criterion fails or cannot be evaluated.[^7_4]

When code changes occur, the system creates a dedicated branch and records the full lifecycle in `BRANCH_INTEGRITY`, including branch ID, commit IDs, merge target, validation references, and lifecycle timestamps. Direct pushes to `main` are always blocked as policy violations, merge conflicts trigger bounded self-correction, and no-op changes produce `EXECUTION_DECISION decision=no_op` without branch integrity evidence.[^7_2][^7_3]

### Rollback, limits, drift, and observability

Successful promotions create `SNAPSHOT_RECORD`. Production error conditions revert to the latest stable snapshot and emit `ROLLBACK_RECORD`; rollback failure escalates to HumanLayer with `CRITICAL_PATH`. Every rollback must also write `ROLLBACK_LESSON`, and later cycles must reference that lesson through `MEMORY_INFLUENCE` to avoid repeating unsafe paths.[^7_4][^7_3]

Autonomy control is governed by `AUTONOMY_LIMITS_STATE`, including concurrency limit, task starts per cycle, and failure budget. Limit hits create cooldown decisions, exhausted failure budget causes downgrade, and drift-driven downgrade uses `DRIFT_SIGNAL_SUMMARY`, while throttled `DRIFT_EARLY_WARNING` prevents UI spam before downgrade thresholds are met.[^7_8][^7_3]

Per-task observability is captured in `EXECUTION_TRACE`, and sessions end with `SESSION_END_RECORD`. Baseline snapshots and Session Summary metrics standardize how failed or user-aborted runs are measured and compared over time, including coverage windows, missing-data handling, and exportability.[^7_4][^7_3]

## Integrations

The implementation stays inside the existing repo conventions: standard orchestration entrypoints, existing port manager behavior, existing `.env.example` and `docs/ENV-MATRIX.md` configuration patterns, current AI proxy mediation, HumanLayer-governed approvals, memory backend indexing, and A2A v2-compatible multi-agent messaging. The A2A protocol remains the interoperability contract for message structure and lifecycle visibility.[^7_1][^7_5][^7_2]

## Testing

Validation should rely on deterministic simulations and layered suites rather than only end-to-end smoke checks. Key coverage areas include orchestrator singleton behavior, restart recovery, confidence boundary logic, Waiting lifecycle and checkpoint durability, HumanLayer approval typing, preflight behavior, dry-run no-side-effects, deviation routing, tool mock coverage, validation fail-closed behavior, branch integrity, rollback learning linkage, A2A v2 schema compliance, and dashboard/session summary rendering with partial or missing evidence.[^7_4][^7_3]

## Data model

No schema migration is introduced at the product level in this summary. The change is primarily additive at the artifact contract and orchestration behavior level, with new artifacts and evidence relationships layered onto the existing stack rather than requiring a foundational data model rewrite.[^7_3]
<span style="display:none">[^7_10][^7_11][^7_12][^7_13][^7_14][^7_15][^7_16][^7_9]</span>

<div align="center">⁂</div>

[^7_1]: https://a2a-protocol.org/latest/specification/

[^7_2]: https://humanlayer.dev/docs/introduction

[^7_3]: https://learnwithparam.com/blog/architecting-ai-agents-multi-step-reasoning-execution-loops

[^7_4]: https://ai-reliability.institute/research/agentic-ai-reliability-checklist.html

[^7_5]: https://a2acn.com/en/specification/core/

[^7_6]: https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/

[^7_7]: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-episodic-prompt.html

[^7_8]: https://testrigor.com/blog/different-evals-for-agentic-ai/

[^7_9]: https://a2acn.com/en/docs/

[^7_10]: https://a2a-protocol.org/latest/

[^7_11]: https://agent2agent.info/specification/

[^7_12]: https://deepwiki.com/google/A2A/2-protocol-specification

[^7_13]: https://www.scribd.com/document/892597030/Agent2Agent-A2A-Protocol-Specification

[^7_14]: https://blogs.mathworks.com/matlab/2026/01/26/matlab-agentic-ai-the-workflow-that-actually-works/

[^7_15]: https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/

[^7_16]: https://www.linkedin.com/posts/osamamabrouk_bmad-methoddistteamsteam-fullstacktxt-activity-7374243309591937025-TjfZ


---

# Test Summary

This plan covers manual end-to-end testing of the agentpro autonomy-first session-driven agent, focusing on real operator/developer flows in the Web UI, deterministic safety gating, async waiting/resume, memory-enriched planning, dry-run deviation control, and branch-isolated delivery. Emphasis is on validating session reliability, gating triggers, UI/UX stability, and correct artifact emission across the stack.
Environments \& Test Data
Setup
Use the staging environment with all services started via the root orchestrator (npm run dev or ./start-all.sh), ensuring port allocation/cleanup is handled by the port manager.
Environment variables should match .env.example and docs/ENV-MATRIX.md (ports, secrets, AI proxy, Redis, Postgres, etc.).
Use at least 2 test operator accounts (one with admin/supervisor rights, one standard).
Ensure all infrastructure dependencies (PostgreSQL, Redis, Ollama, AI proxy) are running and healthy.
Sample Test Data
2 test repositories (one with simple tasks, one with complex/multi-step tasks and TODO/FIXME markers).
1 session with ambiguous task input (to trigger clarification).
1 session with a task designed to fail confidence gating.
1 session with a task requiring HumanLayer approval (critical path).
1 session with a dry-run deviation (e.g., unverifiable tool or branch-safety violation).
1 session with a long-running async step (to test waiting/resume/expiry).
1 malformed task (to test error handling and rollback).
Test Checklist
Authentication \& Environment
Operator can log in and log out via the Web UI.
Environment variables are loaded and validated (invalid/missing vars block startup with clear error).
Port manager allocates and cleans up ports on stack start/stop; no orphaned processes remain.
All required services (server, client, AI proxy, Redis, Postgres) are reachable and healthy.
Project \& Session Management
Operator can create/select a Project and Session from the Projects Panel.
Session creation modal validates required fields and handles server errors gracefully.
Session Window opens with task input focused after session creation.
Operator can view and switch between multiple sessions.
Task Submission \& Flow
Operator submits a manual task; Task Flow Panel shows step-by-step execution.
Ambiguous task triggers a single clarification question from the agent.
Confidence below gate after self-correction (≤3 attempts) triggers HumanLayer intervention.
Irreversible failure or blacklisted action triggers deterministic stop/escalation.
SelfFix loop (BACKTRACK → SWITCH → REFINE) attempts up to 3 times before escalation.
Operator can pause/resume/cancel/stop a session; UI reflects correct state transitions.
Waiting steps are checkpoint-backed, resumable, and do not block unrelated queued work.
Waiting expiry triggers reroute or escalation per policy.
Safety Gating \& Autonomy
Confidence-gated transitions block unsafe actions; gating outcomes are visible in Task Flow.
Dry-run deviation detection emits DRYRUN_DELTA with correct severity and required action.
Donecriteria validation blocks delivery if criteria are not met, even if tests pass.
Branch-isolated delivery is enforced; no direct push to main is possible.
Loop detection triggers autonomy downgrade and is visible in the UI.
Memory \& Planning
TaskEnricher injects episodic recall, PatternStore, LessonStore, and InternalTrace risk signals.
Memory-influenced planning is visible in the Task Flow and Storage Panel.
Operator can browse/download artifacts from StepStorage, ArtifactStore, and CheckpointStore.
HumanLayer \& HITL
Critical approvals trigger modal dialogs; non-critical approvals use non-blocking UI.
Escalations create Waiting steps and are resumable from durable checkpoints.
HumanLayer policy (auto_approve, require_approval, escalation chain) is enforced per session.
UI/UX \& Notifications
All panels (Session, Task Flow, Terminal, Storage, Notification Center) are dockable/floating and update in real time.
Error, confirmation, and approval modals display correct information and block/allow actions as appropriate.
Notification Center logs all critical events, errors, and approvals.
UI tooltips and overlays (e.g., Agentic Confidence, Loop Detection) display correct metadata.
Artifact \& Evidence Emission
Each session emits canonical artifacts: CONFIDENCE_TRACE, EXECUTION_DECISION, WAITING_STATE, LOOP_SIGNAL, TRACE_RISK, DRYRUN_DELTA, ROLLBACK_LESSON, MEMORY_INFLUENCE.
Artifacts are accessible in the Storage Panel and downloadable.
Integrity checks on resume validate checkpoint schema and artifact existence.
Metrics \& Reporting
Session summaries report: end reason, waiting resolution time (p50/p95), validation pass rates, rollback rate, regressions prevented, autonomy downgrade frequency, dry-run deviation rate, loop interruption rate, confidence-below-gate rate, MTTR.
Metrics are accurate and reflect real session outcomes.
Error Handling \& Recovery
Malformed tasks and system errors trigger clear error notifications and do not crash the stack.
Rollback is triggered and logged when required; ROLLBACK_LESSON is emitted.
Operator can recover from failed/aborted sessions and resume from checkpoints.
Note: All flows should be tested in both autonomy-first (default) and hybrid HITL modes, with and without pre-flight UX (improvement analyzer + dry run). Edge cases (network loss, service crash, expired waiting) should be simulated where feasible.GTM Summary
Launching a session-driven autonomous agent platform for operators and developers to run safe, continuous improvement workflows on code repositories.
Targeting AI/ML engineers, DevOps teams, and developer tool integrators who need deterministic safety gating, durable async execution, and human-in-the-loop control.
Goal is to reduce failed or user-aborted session runs by 30% within 30 days post-release by validating confidence gating, dry-run deviation control, and branch-isolated delivery.
Initial launch via internal beta with progressive onboarding of power users and developer advocates to gather feedback on UI clarity, gating thresholds, and session reliability.
Target Persona
Operators and developers managing autonomous agent workflows in software repositories.
DevOps engineers responsible for safe continuous integration and delivery pipelines with AI-driven automation.
AI/ML platform teams integrating autonomous agents with human oversight and safety controls.
Early adopters of session-driven agent orchestration seeking improved reliability and auditability.
Positioning \& Messaging
“Run autonomous agents with confidence: safe, session-driven, and human-in-the-loop.”
“Reduce failed runs by 30% with deterministic gating and durable async execution.”
“Full visibility and control with memory-enriched planning and dry-run deviation detection.”
“Branch-isolated delivery ensures safe, auditable autonomous workflows.”
Emphasize operator empowerment, safety-first autonomy, and seamless session management.
Distribution Plan
Direct outreach to existing internal users and developer advocates familiar with the platform.
Demo sessions and walkthroughs highlighting new UI panels (Session Window, Task Flow, Terminal, Storage).
Share detailed release notes and usage guides in internal channels and developer forums.
Collect feedback via surveys and interactive Q\&A sessions post-launch.
Leverage internal newsletters and technical blogs to highlight success stories and usage metrics.
Success Criteria
Achieve 50+ active sessions running autonomous agents within first 2 weeks.
Reduce failed or user-aborted session runs by at least 30% compared to baseline.
≥40% of sessions utilize confidence gating and dry-run deviation features actively.
Positive qualitative feedback on UI clarity and gating interrupt handling.
Evidence of branch-isolated delivery preventing unsafe merges or deployments.
Out of Scope for Launch
Separate world-model service or unbounded parallel agent execution.
Typed evaluator suite or policy self-mutation engine.
Live multi-agent communication beyond single-entry orchestration.
Third-party integrations beyond core repo and AI proxy services.

**Готово — Test \& GTM Summary собран в отдельный Markdown-файл.**

## Содержимое (108 строк)

Документ структурирует **Test Checklist** (end-to-end manual testing) + **GTM Plan** для запуска A2A:

### Test Summary

- **Setup**: staging env, .env.example, 2 accounts, deps healthy.
- **Checklist**: auth, session mgmt, task flow, safety gating, memory, HumanLayer, UI, artifacts, metrics, errors.
- **Data**: repos + sessions для edge cases (ambiguous, fail, approval, deviation, waiting, malformed).


### GTM Summary

- **Target**: AI/ML engineers, DevOps (-30% failed sessions).
- **Messaging**: "safe autonomy-first + HITL".
- **Distribution**: beta, demos, notes.
- **Success**: 50+ sessions, 30% reduction, 40% gating usage.
- **Out of Scope**: world-model, parallel agents.


## Полная A2A Коллекция (8 файлов)

| Файл | Описание | Строки |
| :-- | :-- | :-- |
| **Master Spec** | Все фичи объединено | 1671 |
| **Technical Summary** | Архитектура/UI/Backend | 113 |
| **Test \& GTM** | Тесты + запуск | **108** |
| Part1-4 | Детали фич | ~1400 |

**Теперь вся документация A2A (spec + tech + test + GTM) готова!**[^8_1][^8_2]

<div align="center">⁂</div>

[^8_1]: https://learnwithparam.com/blog/architecting-ai-agents-multi-step-reasoning-execution-loops

[^8_2]: https://ai-reliability.institute/research/agentic-ai-reliability-checklist.html

