import { describe, expect, it } from "vitest";
import { prepareInvokePayloadForLlmPrompt } from "../../../../transform/src/materialize-result-for-llm.js";

const A2A_TRACE_CONTEXT_KEY = "a2aTraceId";

describe("prepareInvokePayloadForLlmPrompt", () => {
  it("strips a2aTraceId from root and nested context before materialize", () => {
    const out = prepareInvokePayloadForLlmPrompt({
      [A2A_TRACE_CONTEXT_KEY]: "t1",
      context: {
        [A2A_TRACE_CONTEXT_KEY]: "t2",
        execution: { action: "dialog", step: "init" },
      },
      result: { message: "hi" },
    } as Record<string, unknown>);
    expect(out[A2A_TRACE_CONTEXT_KEY]).toBeUndefined();
    const inner = out["context"] as Record<string, unknown> | undefined;
    expect(inner?.[A2A_TRACE_CONTEXT_KEY]).toBeUndefined();
  });
});
