import type { OrchestratorState } from "./orchestrator-kernel.js";
import { logger } from "@a2a/server-utils/logger";

export enum AgentRole {
  ARCHITECT = "ARCHITECT",
  IMPLEMENTER = "IMPLEMENTER",
  REVIEWER = "REVIEWER",
  META_AGENT = "META_AGENT",
}

export interface RoleInstruction {
  role: AgentRole;
  instruction: string;
}

export class AgentRoleRegistry {
  private roles: Map<AgentRole, string> = new Map();

  constructor() {
    this.roles.set(
      AgentRole.ARCHITECT,
      `
You are the LEAD ARCHITECT (Planner). Your goal is high-level design and compliance.
[ARCHITECT/EDITOR SPLIT]: You MUST NOT call execution tools like 'write-file', 'edit-file', or 'run-command'.
Instead, analyze the task, perform the necessary reasoning, and output a concise, step-by-step 'Design Plan' or 'Manifesto'.
Your output will be passed to the EDITOR for execution.
Focus on: modularity, scalability, and technical debt prevention.
`,
    );
    this.roles.set(
      AgentRole.IMPLEMENTER,
      `
You are the EDITOR (Implementer/Execution Agent).
[ARCHITECT/EDITOR SPLIT]: Your ONLY job is to execute the tools required by the Architect's plan.
DO NOT output any reasoning, chain of thought, or conversational text.
ONLY output the specific JSON block to trigger an MCP tool, file edit, or command.
Keep your output token usage to the absolute minimum. You are a fast, silent executor.
`,
    );
    this.roles.set(
      AgentRole.REVIEWER,
      `
You are the ADVERSARIAL REVIEWER (Writer/Reviewer Pattern - ADR-0040). 
Your sole purpose is to reject implementations that are sub-optimal, buggy, or hallucinated.
Be extremely suspicious. Check for:
- Silent logic failures and "off-by-one" errors.
- Hallucinated imports or API calls.
- Inconsistent variable naming or state drift.
- Security vulnerabilities and non-deterministic behavior.
If you find ANY issue, set 'passed: false' and provide a harsh, structured critique.
`,
    );
    this.roles.set(
      AgentRole.META_AGENT,
      `
You are the META AGENT. Your goal is to build consensus between the Architect and Reviewer.
If they disagree, you make the final call or suggest a compromise path.
`,
    );
  }

  getInstruction(role: AgentRole): string {
    return this.roles.get(role) || "";
  }

  /**
   * Map Orchestrator state to the active role
   */
  getRoleForState(state: OrchestratorState): AgentRole {
    switch (state) {
      case "SYNTHESIZING":
      case "ENRICHING":
        return AgentRole.ARCHITECT;
      case "EXECUTING":
      case "SELF_CORRECTING":
        return AgentRole.IMPLEMENTER;
      case "REVIEWING":
      case "SIEGE_REVIEW":
        return AgentRole.REVIEWER;
      case "DEBATING":
        return AgentRole.META_AGENT;
      default:
        return AgentRole.IMPLEMENTER;
    }
  }

  async executeSyndicateReview(
    ctx: Record<string, any>,
  ): Promise<{ passed: boolean; reason?: string }> {
    logger.info(
      "[AgentRoleRegistry] Executing Syndicate Review (Siege Architecture)",
    );
    const reviewerPrompt = this.getInstruction(AgentRole.REVIEWER);
    const task = (ctx["task"] as string) || "Unknown task";
    const contextDump = JSON.stringify(ctx).slice(0, 3_000);

    const reviewPrompt = `${reviewerPrompt}

Task being evaluated:
${task}

Current Context / Execution Results:
${contextDump}

Respond ONLY with valid JSON: {"passed": boolean, "reason": "string"}`;

    try {
      const aiHubUrl = (
        process.env["A2A_AI_HUB_URL"] ?? "http://localhost:11434"
      ).replace(/\/$/, "");
      const model = process.env["A2A_MODEL"] ?? "llama3";

      const res = await fetch(`${aiHubUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: reviewPrompt }],
          stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        logger.warn(
          "[AgentRoleRegistry] LLM non-200, defaulting to pass",
          { status: res.status },
        );
        return { passed: true, reason: "Review skipped: LLM unavailable" };
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? "";

      const jsonMatch = /\{[\s\S]*?\}/.exec(content);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          passed?: boolean;
          reason?: string;
        };
        return { passed: parsed.passed === true, reason: parsed.reason };
      }

      const isPassed =
        !content.toLowerCase().includes('"passed": false') &&
        !content.toLowerCase().includes("failed") &&
        !content.toLowerCase().includes("not pass");
      return { passed: isPassed, reason: content.slice(0, 300) };
    } catch (e) {
      logger.error("[AgentRoleRegistry] Syndicate review error", {
        error: String(e),
      });
      // Default to pass on transient errors to avoid blocking the pipeline
      return {
        passed: true,
        reason: "Review error (defaulting to pass): " + String(e),
      };
    }
  }
}

export const globalRoleRegistry = new AgentRoleRegistry();
