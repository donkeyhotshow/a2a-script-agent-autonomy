import { describe, expect, it } from "vitest";
import {
  resolveA2aTraceId,
  readA2aTraceIdFromHeaders,
} from "../../../../server-utils/src/trace-resolve.js";
import { A2A_TRACE_CONTEXT_KEY } from "../../../../server-utils/src/trace-constants.js";

describe("trace-resolve", () => {
  it("resolveA2aTraceId prefers context value", () => {
    expect(
      resolveA2aTraceId(
        { [A2A_TRACE_CONTEXT_KEY]: "trace-abc" } as Record<string, unknown>,
        "prom_x",
      ),
    ).toBe("trace-abc");
  });

  it("resolveA2aTraceId falls back to promiseId", () => {
    expect(resolveA2aTraceId({}, "prom_fallback")).toBe("prom_fallback");
  });

  it("readA2aTraceIdFromHeaders reads lowercase header", () => {
    expect(
      readA2aTraceIdFromHeaders({ "x-a2a-trace-id": "hdr-1" }),
    ).toBe("hdr-1");
  });
});
