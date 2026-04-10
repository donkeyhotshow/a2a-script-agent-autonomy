import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAiHubGenerateText } from "../../../llm/src/llm/ai-hub-generate.ts";

describe("fetchAiHubGenerateText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes hub base (trailing slash) in request URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("http://gen.example/api/generate");
        return new Response(JSON.stringify({ response: "x" }), { status: 200 });
      }),
    );
    await fetchAiHubGenerateText(
      "http://gen.example/",
      { model: "m", prompt: "p", stream: false },
      5000,
    );
  });

  it("returns response text on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(String(url)).toContain("/api/generate");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ response: "hello" }), {
          status: 200,
        });
      }),
    );
    const t = await fetchAiHubGenerateText(
      "http://hub",
      { model: "m", prompt: "p", stream: false },
      5000,
    );
    expect(t).toBe("hello");
  });

  it("serializes images in POST body when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          images?: string[];
        };
        expect(body.images).toEqual(["b64"]);
        return new Response(JSON.stringify({ response: "ok" }), {
          status: 200,
        });
      }),
    );
    await fetchAiHubGenerateText(
      "http://hub",
      { model: "m", prompt: "p", stream: false, images: ["b64"] },
      5000,
    );
  });

  it("throws on non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("err", { status: 502, statusText: "Bad" }),
      ),
    );
    await expect(
      fetchAiHubGenerateText(
        "http://hub",
        { model: "m", prompt: "p", stream: false },
        5000,
      ),
    ).rejects.toThrow(/502/);
  });

  it("throws message includes statusText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("", { status: 503, statusText: "Service Unavailable" }),
      ),
    );
    await expect(
      fetchAiHubGenerateText(
        "http://hub",
        { model: "m", prompt: "p", stream: false },
        5000,
      ),
    ).rejects.toThrow(/503.*Service Unavailable/s);
  });

  it("returns empty string when JSON omits response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
    const t = await fetchAiHubGenerateText(
      "http://hub",
      { model: "m", prompt: "p", stream: false },
      5000,
    );
    expect(t).toBe("");
  });

  it("propagates fetch rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.reject(new DOMException("aborted", "AbortError")),
      ),
    );
    await expect(
      fetchAiHubGenerateText(
        "http://hub",
        { model: "m", prompt: "p", stream: false },
        5000,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("propagates when 200 body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("plain", { status: 200 })),
    );
    await expect(
      fetchAiHubGenerateText(
        "http://hub",
        { model: "m", prompt: "p", stream: false },
        5000,
      ),
    ).rejects.toThrow();
  });
});
