import * as path from "path";
import { logger } from "../../../utils/logger.js";
import { runPromptsTransform, syncLiveContextHistoryFromResultMessage, } from "../../../transform/index.js";
import { mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext, } from "../../transform/interrupt-trace-contract.js";
import { extractLlmTextFromHubResponseBody, initAiHubChatPromise, pollReadyThenFetch, } from "../../../daemon/llm-hub-poll.js";
import { validateExecuteShapeForSchema, validateLlmOutputShape, validateRouterResultShape, shouldEnforceTransformStrictMode, } from "./validators/transform-execute-validator.js";
import { resolveHistoryLength, toInvokeShapeForPromptsTransform, } from "./normalization.js";
import { grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext, } from "./llm-model-resolver.js";
import { globalArtifactStore } from "../artifact-store.js";
import { DedicatedAnalyzer } from "../analyzer.js";
import { globalExperienceBank } from "../../memory/experience-bank.js";
import { globalMcpRegistry } from "../../mcp/registry.js";
// Import trigger detection logic
import { readGrayRoomInterruptBudget, } from "./gray-room-trigger.js";
// Import utilities
import { mergeGrayRoomFinalizeInnerContext, } from "./gray-room-utils.js";
// Import interrupt handlers
import { handleCompressHistory } from "./gray-room-interrupt-handlers/compress-history.js";
import { handleThinking } from "./gray-room-interrupt-handlers/thinking.js";
import { handleAutoReadFile } from "./gray-room-interrupt-handlers/auto-read-file.js";
import { handleAutoRagPage } from "./gray-room-interrupt-handlers/auto-rag-page.js";
import { handleClarify } from "./gray-room-interrupt-handlers/clarify.js";
import { handleAlgorithmInvoke } from "./gray-room-interrupt-handlers/algorithm-invoke.js";
import { globalVisionTester } from "../vision-tester.js";
import { globalRoleRegistry } from "../agent-role-registry.js";
import { globalSafetyLayer } from "../safety-layer.js";
import { globalIntentGate } from "../intent-gate.js";
import { bugFixer } from "../../llm/bug-fixer.js";
import { repoMapService } from "../../context/repo-map.service.js";
import { resolveAiHubBaseUrl } from "../../utils/ai-hub-url.js";
import { mkdtempOsTmp } from "../../utils/mkdtemp-os-tmp.js";
import { prepareLlmMessages } from "./llm-orchestration.js";
export class GrayRoomOrchestrator {
    maxInterruptTurns;
    aiHubUrl;
    model;
    promptsTransformsPath;
    static activeControllers = new Map();
    constructor(options) {
        this.maxInterruptTurns =
            options.maxInterruptTurns ?? readGrayRoomInterruptBudget();
        this.aiHubUrl = resolveAiHubBaseUrl(options.aiHubUrl);
        this.model = options.model ?? grayRoomLlmModelFallback();
        this.promptsTransformsPath = options.promptsTransformsPath;
    }
    /**
     * Run the Gray Room interrupt loop starting from an initial LLM response.
     * @param processInterrupts When false (gray room opted off), one response transform only; `interrupt` is ignored.
     */
    async runLoop(ctx, schemaName, responseMd, promiseId, recovered = false, processInterrupts = true) {
        let workingCtx = ctx;
        let md = responseMd;
        let isRecovered = recovered;
        let interruptBudget = this.maxInterruptTurns;
        let activeSchemaName = schemaName;
        const trace = [];
        let turn = 0;
        const startedAt = new Date().toISOString();
        const grayRoom = {
            enabled: processInterrupts,
            planId: promiseId,
            phase: "response_transform",
            maxTurns: this.maxInterruptTurns,
            turn: 0,
            status: "running",
            timestamps: { startedAt, lastUpdateAt: startedAt },
            remainingBudget: interruptBudget,
            traceRef: { length: 0 },
        };
        const controller = new AbortController();
        GrayRoomOrchestrator.activeControllers.set(promiseId, controller);
        const touchGrayRoom = (patch) => {
            Object.assign(grayRoom, patch);
            grayRoom.timestamps = {
                startedAt,
                lastUpdateAt: new Date().toISOString(),
            };
            grayRoom.traceRef = { length: trace.length };
        };
        // -- SAFETY & INTENT INITIALIZATION (ADR-0035 / ADR-0050) --
        globalSafetyLayer.reset();
        globalIntentGate.lockIntent(workingCtx["task"] || "");
        const sessionStartTime = Date.now();
        // ADR-0092: Generate Project Repo Map for structural awareness
        const repoRoot = workingCtx["projectRoot"] || process.cwd();
        try {
            const projectMap = await repoMapService.generateMapMd(repoRoot);
            workingCtx["repo_map"] = projectMap;
        }
        catch (e) {
            logger.warn("[GrayRoom] Failed to generate RepoMap", {
                error: String(e),
            });
        }
        // -------------------------------------------------------------
        // ADR-0093: Internal Debate for the first turn to refine the plan (agent-style tasks).
        // Skip when recovering from a hub promise: `md` is the completed hub body; debate would
        // replace it and runs 3 sync hub calls (proxy errors / timeouts).
        // Skip for `dialog` schema: the main dialog LLM response is already the user-facing turn;
        // debate was causing failed invokes (e.g. upstream/proxy "terminated") before response transform.
        if (turn === 0 &&
            processInterrupts &&
            !isRecovered &&
            schemaName !== "dialog") {
            logger.info("[GrayRoom] Running ADR-0093 Internal Debate");
            try {
                // TODO: Replace with invoke mechanism
                throw new Error("Gray room debate LLM functionality disabled - use invoke mechanism");
            }
            catch (e) {
                logger.warn("[GrayRoom] Internal debate skipped — using primary LLM output", {
                    error: String(e),
                });
            }
        }
        // ---------------------------------------------------------
        // Event-driven Actor Model Step
        return new Promise((resolve) => {
            const processTick = async () => {
                if (controller.signal.aborted) {
                    logger.warn("[GrayRoom] Externally halted!", { promiseId });
                    GrayRoomOrchestrator.activeControllers.delete(promiseId);
                    resolve({
                        outcome: "failed",
                        error: "Task halted by operator",
                        context: workingCtx,
                    });
                    return;
                }
                // -- SAFETY INTERCEPT (ADR-0035 / ADR-0050) --
                const safety = globalSafetyLayer.intercept(workingCtx);
                if (safety.halt) {
                    logger.error("[GrayRoom] Safety halt!", { reason: safety.reason });
                    resolve({
                        outcome: "failed",
                        error: safety.reason || "Safety violation detected",
                        context: workingCtx,
                    });
                    return;
                }
                // --------------------------------------------
                // -- EXPERIENCE BANK (PRE) --
                try {
                    const exprs = await globalExperienceBank.getRelevantExperiences(JSON.stringify(workingCtx).slice(0, 500));
                    if (exprs.length > 0) {
                        workingCtx["relevant_experiences"] = exprs.map((e) => e.action_payload);
                    }
                }
                catch (err) {
                    logger.warn("[GrayRoom] ExperienceBank get failure", {
                        error: String(err),
                    });
                }
                // --------------------------
                touchGrayRoom({
                    phase: "response_transform",
                    turn,
                    remainingBudget: interruptBudget,
                });
                trace.push({
                    kind: "llm_output",
                    phase: turn === 0 ? "primary" : "follow_up",
                    chars: md.length,
                });
                const pair = await this.runResponseTransform(activeSchemaName, workingCtx, md, isRecovered);
                isRecovered = false;
                if (!pair) {
                    resolve({
                        outcome: "failed",
                        error: "Response transform failed",
                    });
                    return;
                }
                const { result, rawOutput } = pair;
                // -- MCP TOOL BRIDGE (ADR-0078) --
                const executeCall = result.execute;
                if (executeCall) {
                    const actionName = Object.keys(executeCall)[0];
                    const mcpTool = globalMcpRegistry.getTool(actionName);
                    if (mcpTool) {
                        logger.info("[GrayRoom] Executing MCP Tool", { actionName });
                        try {
                            const mcpResult = await mcpTool.execute(executeCall[actionName]);
                            result.result = { [actionName]: mcpResult };
                        }
                        catch (e) {
                            logger.error("[GrayRoom] MCP Tool failed, triggering BugFixer", {
                                actionName,
                                error: e.message,
                            });
                            const fix = await bugFixer.fix(JSON.stringify(executeCall[actionName]), e.message);
                            if (fix.fixed) {
                                logger.info("[GrayRoom] BugFixer produced a patch", {
                                    actionName,
                                });
                                result.result = {
                                    error: e.message,
                                    bugfix_analysis: fix.analysis,
                                    recommended_patch: fix.patches,
                                };
                            }
                            else {
                                result.result = { error: e.message };
                            }
                        }
                    }
                }
                // --------------------------------
                const interrupt = this.extractInterrupt(rawOutput);
                trace.push({
                    kind: "response_transform",
                    interruptReason: interrupt?.reason,
                });
                if (interrupt && !processInterrupts) {
                    trace.push({
                        kind: "interrupt_skipped",
                        reason: interrupt.reason,
                        detail: "gray_room_disabled",
                    });
                    touchGrayRoom({
                        phase: "completed",
                        status: "completed",
                        turn,
                        remainingBudget: interruptBudget,
                        lastReason: interrupt.reason,
                    });
                    resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                    return;
                }
                if (!interrupt) {
                    // Dialog: response transform already produced user-facing execute — skip syndicate path here
                    // (same as non-dialog: SIEGE_REVIEW only when primary JSON sets result.completed, see below).
                    if (activeSchemaName === "dialog") {
                        touchGrayRoom({
                            phase: "completed",
                            status: "completed",
                            turn,
                            remainingBudget: interruptBudget,
                        });
                        GrayRoomOrchestrator.activeControllers.delete(promiseId);
                        resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                        return;
                    }
                    const primaryTurnComplete = this.isResponseTransformCompleted(rawOutput);
                    // -- INTENT DRIFT CHECK (ADR-0050) --
                    if (globalIntentGate.getTurnCount() >= 5) {
                        const executeKey = Object.keys(result.execute || {}).find((k) => k !== "noop" && k !== "message" && k !== "form");
                        const currentPlan = executeKey || workingCtx["task"] || "";
                        const driftCheck = await globalIntentGate.checkDrift(currentPlan, workingCtx);
                        if (driftCheck.hasDrift && driftCheck.confidence > 0.7) {
                            logger.error("[GrayRoom] Intent drift detected - halting", {
                                confidence: driftCheck.confidence,
                                reason: driftCheck.reason,
                            });
                            touchGrayRoom({
                                phase: "completed",
                                status: "halted",
                                turn,
                                remainingBudget: interruptBudget,
                                lastReason: `intent_drift: ${driftCheck.reason}`,
                            });
                            GrayRoomOrchestrator.activeControllers.delete(promiseId);
                            resolve(this.mergeTraceIntoResult({
                                ...result,
                                context: { ...workingCtx, intent_drift_detected: true },
                            }, trace, grayRoom));
                            return;
                        }
                    }
                    if (primaryTurnComplete) {
                        logger.info("[GrayRoom] Primary turn result.completed=true. Entering SIEGE_REVIEW");
                        const reviewResult = await globalRoleRegistry.executeSyndicateReview(workingCtx);
                        if (reviewResult.passed) {
                            logger.info("[GrayRoom] SIEGE_REVIEW passed. Completing session.");
                        }
                        else {
                            logger.warn("[GrayRoom] SIEGE_REVIEW failed.", {
                                reason: reviewResult.reason,
                            });
                            workingCtx["task"] =
                                `[SIEGE REVIEW FAILED] ${reviewResult.reason}\n\nPlease correct these issues.`;
                        }
                    }
                    // Without a gray-room interrupt there is no valid follow-up loop here; previously we fell
                    // through to interruptWhenSatisfied(null) → throw and left the A2A promise stuck processing.
                    touchGrayRoom({
                        phase: "completed",
                        status: "completed",
                        turn,
                        remainingBudget: interruptBudget,
                    });
                    GrayRoomOrchestrator.activeControllers.delete(promiseId);
                    resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                    return;
                }
                if (!this.interruptWhenSatisfied(interrupt, workingCtx)) {
                    trace.push({
                        kind: "interrupt_skipped",
                        reason: interrupt.reason,
                        detail: "when_clause_not_met",
                    });
                    touchGrayRoom({
                        phase: "completed",
                        status: "completed",
                        turn,
                        remainingBudget: interruptBudget,
                        lastReason: interrupt.reason,
                    });
                    resolve(this.mergeTraceIntoResult(result, trace, grayRoom));
                    return;
                }
                if (typeof interrupt.maxTurns === "number" &&
                    Number.isFinite(interrupt.maxTurns) &&
                    interrupt.maxTurns >= 0) {
                    interruptBudget = Math.min(interruptBudget, interrupt.maxTurns);
                }
                if (interruptBudget <= 0) {
                    const c = result.context;
                    touchGrayRoom({
                        phase: "completed",
                        status: "truncated",
                        turn,
                        remainingBudget: 0,
                        lastReason: interrupt.reason,
                    });
                    resolve(this.mergeTraceIntoResult({
                        ...result,
                        context: { ...c, interrupt_truncated: true },
                    }, trace, grayRoom));
                    return;
                }
                interruptBudget--;
                // -- DEDICATED ANALYZER INTEGRATION (ADR-0060) --
                const analyzer = new DedicatedAnalyzer(globalArtifactStore);
                const currentConfidence = workingCtx["confidence"] ?? 0.5;
                // Note: We need a way to get artifacts, but for now we'll pass an empty array or query globalArtifactStore if needed.
                // ADR: Insights are extracted from history and artifacts.
                const responseArtifacts = await globalArtifactStore.query({
                    turn_id: `turn-${turn}`,
                });
                const sessionHistory = workingCtx["history"] ?? [];
                const insights = await analyzer.analyze(responseArtifacts, sessionHistory, currentConfidence, turn);
                // Inject insights into next iteration via thinkingSlot
                workingCtx = {
                    ...workingCtx,
                    thinkingSlot: {
                        ...(workingCtx["thinkingSlot"] ?? {}),
                        analyzer_insights: insights,
                        recommended_strategy: insights.recommended_strategy,
                    },
                };
                // -- EXPERIENCE BANK (POST) --
                try {
                    await globalExperienceBank.recordTurn(workingCtx["session_id"] || "unknown", `turn-${turn}`, JSON.stringify(workingCtx), { type: "interrupt", payload: interrupt.reason }, insights.confidence_delta);
                }
                catch (err) {
                    logger.warn("[GrayRoom] ExperienceBank record failure", {
                        error: String(err),
                    });
                }
                // ------------------------------------------------
                logger.info("[GrayRoom] Iteration start", {
                    turn,
                    state: currentState,
                });
                // -- AGENT ROLE INTEGRATION (ADR-0038) --
                const activeRole = globalRoleRegistry.getRoleForState(currentState);
                const roleInstruction = globalRoleRegistry.getInstruction(activeRole);
                workingCtx = {
                    ...workingCtx,
                    agent_role: activeRole,
                    system_instruction_override: roleInstruction,
                };
                logger.info("[GrayRoom] Role assigned", { role: activeRole });
                // ---------------------------------------
                // -- VISION QA INTEGRATION (ADR-0060) --
                let lastOutcome = workingCtx["result"]?.["outcome"] || "noop";
                // -- OVERRIDE OUTCOME FOR REVIEW/DEBATE (ADR-0038) --
                if (currentState === OrchestratorState.REVIEWING &&
                    workingCtx["REVIEW_RESULT"]) {
                    const res = workingCtx["REVIEW_RESULT"];
                    lastOutcome = res.passed ? "review_passed" : "review_failed";
                    // Clear result for next turns if necessary, or let kernel handle it
                }
                if (currentState === OrchestratorState.DEBATING &&
                    workingCtx["DEBATE_OUTCOME"]) {
                    lastOutcome = "debate_resolved";
                }
                // --------------------------------------------------
                const { nextState, artifact } = this.kernel.transition(currentState, lastOutcome, workingCtx);
                const lastAction = workingCtx["execute"]?.["write-file"] ||
                    workingCtx["execute"]?.["edit-file"];
                const isUIChange = lastAction &&
                    (lastAction.path?.endsWith(".html") ||
                        lastAction.path?.endsWith(".css") ||
                        lastAction.path?.endsWith(".vue") ||
                        lastAction.path?.endsWith(".tsx") ||
                        lastAction.path?.endsWith(".jsx"));
                if (isUIChange) {
                    try {
                        // Logic to determine internal URL - usually a dev server
                        const devUrl = process.env.A2A_PREVIEW_URL || "http://localhost:5173"; // Default Vite port
                        const screenshotPath = `storage/screenshots/turn-${turn}.png`;
                        await globalVisionTester.captureScreenshot(devUrl, screenshotPath);
                        const visionResult = await globalVisionTester.performVisualQA(screenshotPath, workingCtx["task"] || "UI matching manifesto");
                        if (!visionResult.passed) {
                            workingCtx = {
                                ...workingCtx,
                                visual_critique: visionResult.critique,
                                thinkingSlot: {
                                    ...(workingCtx["thinkingSlot"] ??
                                        {}),
                                    visual_feedback: visionResult.critique,
                                },
                            };
                            logger.warn("[GrayRoom] Vision QA failed, injecting critique", {
                                critique: visionResult.critique,
                            });
                        }
                        else {
                            logger.info("[GrayRoom] Vision QA passed");
                        }
                    }
                    catch (err) {
                        logger.info("[GrayRoom] Transitioning state", {
                            from: currentState,
                            to: nextState,
                        });
                        currentState = nextState;
                    }
                }
                // --------------------------------------
                // -- SPECIAL HANDLING FOR REVIEWING STATE --
                if (currentState === OrchestratorState.REVIEWING) {
                    logger.info("[GrayRoom] Entering Review Phase");
                    // The REVIEWER will analyze the work done in EXECUTING
                    // We'll give it the context and ask for a critique.
                    // For now, we trigger an LLM-based critique turn.
                    // In a real implementation, this might be a specialized transform.
                    workingCtx["task"] =
                        `Review the recent execution. Find bugs or design flaws. Return 'passed: true' or 'passed: false' with critique.`;
                }
                // -----------------------------------------
                const { nextCtx, continueLoop } = await this.applyInterrupt(interrupt, workingCtx, promiseId, trace);
                if (continueLoop &&
                    typeof interrupt.schema === "string" &&
                    interrupt.schema.trim() !== "") {
                    activeSchemaName = interrupt.schema.trim();
                }
                trace.push({
                    kind: "interrupt_handler",
                    reason: interrupt.reason,
                    continueLoop,
                    note: interrupt.reason === "auto_rag_page"
                        ? "merge_context_reenter"
                        : undefined,
                });
                touchGrayRoom({
                    phase: "interrupt_handler",
                    lastReason: interrupt.reason,
                    turn,
                    remainingBudget: interruptBudget,
                });
                if (!continueLoop) {
                    const normalizedExecute = rawOutput.execute;
                    const mergedInner = mergeGrayRoomFinalizeInnerContext(rawOutput.context, nextCtx);
                    const res = {
                        outcome: "completed",
                        context: mergedInner,
                        execute: normalizedExecute,
                    };
                    this.warnOnInvalidExecute(res, "grayRoom.finalize", activeSchemaName, rawOutput);
                    touchGrayRoom({
                        phase: "completed",
                        status: "completed",
                        turn,
                        remainingBudget: interruptBudget,
                    });
                    resolve(this.mergeTraceIntoResult(res, trace, grayRoom));
                    return;
                }
                workingCtx = nextCtx;
                // Rebuild request for next LLM turn
                const outputDir = await this.createTempDir();
                const invokeShape = toInvokeShapeForPromptsTransform(workingCtx);
                const requestTransformResult = await runPromptsTransform(this.promptsTransformsPath, activeSchemaName, invokeShape, "request", { forceServerTransforms: true, outputDir });
                if (!requestTransformResult.success) {
                    resolve({
                        outcome: "failed",
                        error: requestTransformResult.error ||
                            "Request transform failed (gray room loop)",
                    });
                    return;
                }
                trace.push({ kind: "request_rebuild" });
                touchGrayRoom({
                    phase: "follow_up_llm",
                    turn,
                    remainingBudget: interruptBudget,
                });
                const files = requestTransformResult.files || {};
                const requestMd = files["request.md"];
                if (!requestMd) {
                    resolve({
                        outcome: "failed",
                        error: "Request transform did not produce request.md (gray room)",
                    });
                    return;
                }
                const messages = prepareLlmMessages(files, workingCtx["system_instruction_override"] ||
                    undefined);
                const subHeader = `${promiseId}-intr-${interruptBudget}`;
                const llmModel = resolveGrayRoomLlmModelFromContext(workingCtx, this.model);
                const chatInit = await initAiHubChatPromise(this.aiHubUrl, subHeader, {
                    model: llmModel,
                    messages,
                    stream: false,
                });
                if (!chatInit.ok) {
                    if (chatInit.reason === "bad_http_status") {
                        logger.error("[GrayRoom] LLM promise init failed", {
                            status: chatInit.status,
                            error: chatInit.bodyText,
                        });
                        resolve({
                            outcome: "failed",
                            error: `LLM error (gray room): ${chatInit.status} ${chatInit.bodyText.slice(0, 200)}`,
                        });
                    }
                    else {
                        resolve({
                            outcome: "failed",
                            error: "No promiseId in LLM response (gray room)",
                        });
                    }
                    return;
                }
                const subLlmId = chatInit.llmPromiseId;
                const nextMdRaw = chatInit.inlineResponseBody ??
                    (await pollReadyThenFetch(this.aiHubUrl, subLlmId));
                const nextMd = nextMdRaw
                    ? extractLlmTextFromHubResponseBody(nextMdRaw)
                    : null;
                if (!nextMd?.trim()) {
                    resolve({
                        outcome: "failed",
                        error: "LLM response fetch failed (gray room)",
                    });
                    return;
                }
                md = nextMd;
                turn++;
                // -- INTENT GATE TURN COUNT (ADR-0050) --
                globalIntentGate.incrementTurn();
                // -- HARD TIMEOUT CIRCUIT BREAKER --
                const elapsedMs = Date.now() - sessionStartTime;
                const HARD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes hard cap
                if (elapsedMs >= HARD_TIMEOUT_MS) {
                    logger.error("[GrayRoom] Hard timeout reached", { elapsedMs, turn });
                    touchGrayRoom({
                        phase: "completed",
                        status: "truncated",
                        turn,
                        remainingBudget: 0,
                        lastReason: "hard_timeout",
                    });
                    const timeoutCtxBase = result.context &&
                        typeof result.context === "object" &&
                        !Array.isArray(result.context)
                        ? { ...result.context }
                        : { ...workingCtx };
                    resolve(this.mergeTraceIntoResult({
                        ...result,
                        context: { ...timeoutCtxBase, hard_timeout: true },
                    }, trace, grayRoom));
                    return;
                }
                // -----------------------------------
                // -- HANDLE REVIEW OUTCOME (ADR-0038) --
                if (currentState === OrchestratorState.REVIEWING) {
                    const isPassed = md.toLowerCase().includes("passed: true");
                    const result = {
                        passed: isPassed,
                        critique: md,
                        turn: turn,
                    };
                    workingCtx["REVIEW_RESULT"] = result;
                    if (isPassed) {
                        logger.info("[GrayRoom] Review passed");
                        // We need a way to trigger review_passed event
                        // The simplest way is to inject an interrupt that the kernel understands
                        // Or let the next iteration handle the transition
                    }
                    else {
                        logger.warn("[GrayRoom] Review failed");
                    }
                }
                // -------------------------------------
                // Queue next tick instead of blocking for-loop
                setImmediate(processTick);
            };
            // Start the actor loop
            setImmediate(processTick);
        });
    }
    async createTempDir() {
        return mkdtempOsTmp("a2a-gray-room-");
    }
    async runResponseTransform(schemaName, ctx, responseMd, _recovered) {
        try {
            const { writeFile } = await import("node:fs/promises");
            const tempDir = await this.createTempDir();
            await writeFile(path.join(tempDir, "response.md"), responseMd, "utf-8");
            // Request transforms fold `result.message` into history on a clone only; live `ctx` still
            // needs the same user line before append-to-array adds assistant (see materialize-result-for-llm).
            syncLiveContextHistoryFromResultMessage(ctx);
            const responseData = { context: ctx, llm: { response: responseMd } };
            const responseTransformResult = await runPromptsTransform(this.promptsTransformsPath, schemaName, responseData, "response", { baseDir: tempDir, forceServerTransforms: true });
            if (!responseTransformResult.success) {
                logger.error("[GrayRoom] Response transform pipeline failed", {
                    error: responseTransformResult.error ?? "unknown",
                });
                return null;
            }
            const output = responseTransformResult.output;
            const rawOutput = output;
            const intrRaw = rawOutput["interrupt"];
            const interruptPassthrough = intrRaw && typeof intrRaw === "object" && !Array.isArray(intrRaw)
                ? intrRaw
                : undefined;
            const result = {
                outcome: "completed",
                context: rawOutput.context ?? ctx,
                execute: rawOutput.execute,
                ...(interruptPassthrough ? { interrupt: interruptPassthrough } : {}),
            };
            this.warnOnInvalidExecute(result, "runResponseTransform", schemaName, rawOutput);
            return { rawOutput, result };
        }
        catch (err) {
            logger.error("[GrayRoom] Transform error", { error: err });
            return null;
        }
    }
    extractInterrupt(output) {
        const raw = output["interrupt"];
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            return null;
        const d = raw;
        if (typeof d.reason !== "string")
            return null;
        return d;
    }
    /** `result.completed` from response transforms (agent/dialog/coder); optional top-level `completed` fallback. */
    isResponseTransformCompleted(raw) {
        const res = raw["result"];
        if (res && typeof res === "object" && !Array.isArray(res)) {
            const c = res["completed"];
            if (c === true)
                return true;
        }
        return raw["completed"] === true;
    }
    interruptWhenSatisfied(interrupt, ctx) {
        const w = interrupt.when;
        if (!w)
            return true;
        const len = resolveHistoryLength(ctx);
        if (w.historyMinLength != null && len < w.historyMinLength)
            return false;
        if (w.historyMaxLength != null && len > w.historyMaxLength)
            return false;
        return true;
    }
    async applyInterrupt(interrupt, ctx, promiseId, trace) {
        const { reason, context: extraCtx, data } = interrupt;
        const nextCtx = extraCtx ? { ...ctx, ...extraCtx } : { ...ctx };
        switch (reason) {
            case "compress_history": {
                return await handleCompressHistory(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case "thinking": {
                return await handleThinking(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case "auto_read_file": {
                return await handleAutoReadFile(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case "auto_rag_page": {
                return await handleAutoRagPage(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case "clarify": {
                return await handleClarify(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            case "algorithm_invoke": {
                return await handleAlgorithmInvoke(interrupt, ctx, promiseId, this.aiHubUrl, this.model, trace);
            }
            default:
                logger.warn("[GrayRoom] Unknown reason", { reason });
                return { nextCtx, continueLoop: false };
        }
    }
    /**
     * Halt an active gray room loop by promiseId.
     */
    static halt(promiseId) {
        const controller = this.activeControllers.get(promiseId);
        if (controller) {
            controller.abort();
            this.activeControllers.delete(promiseId);
            return true;
        }
        return false;
    }
    mergeTraceIntoResult(result, trace, grayRoom) {
        let ctx = result.context &&
            typeof result.context === "object" &&
            !Array.isArray(result.context)
            ? result.context
            : {};
        if (trace.length > 0) {
            ctx = mergeInterruptTraceIntoContext(ctx, trace);
        }
        if (grayRoom) {
            ctx = mergeGrayRoomSlotIntoContext(ctx, grayRoom);
        }
        return { ...result, context: ctx };
    }
    warnOnInvalidExecute(result, source, schemaName, rawTransformOutput) {
        const topMsg = rawTransformOutput && typeof rawTransformOutput["message"] === "string"
            ? rawTransformOutput["message"].trim()
            : "";
        const issues = [
            ...validateExecuteShapeForSchema(schemaName, result.execute),
            ...(schemaName === "router" ? validateRouterResultShape(result) : []),
            ...validateLlmOutputShape({
                ...(topMsg ? { message: topMsg } : {}),
                execute: result.execute,
            }),
        ];
        if (issues.length === 0)
            return;
        if (shouldEnforceTransformStrictMode()) {
            throw new Error(`Gray room transform contract violation (${source}): ${issues.map((i) => i.code).join(", ")}`);
        }
        logger.warn("[GrayRoom] Transform execute validation warnings", {
            source,
            issues: issues.map((i) => i.code),
        });
    }
}
//# sourceMappingURL=gray-room-orchestrator.js.map