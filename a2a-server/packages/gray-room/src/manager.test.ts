import { describe, it, expect } from "vitest";
import { GrayRoomManager } from "../src/manager.js";
import { defaultGrayRoomConfig } from "../src/config.js";

describe("GrayRoomManager", () => {
  it("should create tickets", () => {
    const manager = new GrayRoomManager(defaultGrayRoomConfig);
    const ticketId = manager.createTicket("test-session", { test: true });

    expect(ticketId).toContain("gr-test-session");
    expect(manager.getActiveSessions()).toContain(ticketId);
  });

  it("should find matching tasks", async () => {
    const manager = new GrayRoomManager(defaultGrayRoomConfig);
    const ticketId = manager.createTicket("test-session", {
      projectRoot: "/test",
    });

    const results = await manager.trigger(ticketId, "pre_request");

    // Should find the pre_request_context_scan task
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].taskId).toBe("pre_request_context_scan");
  });

  it("should respect task conditions", async () => {
    const manager = new GrayRoomManager(defaultGrayRoomConfig);
    const ticketId = manager.createTicket("test-session", {}); // No projectRoot

    const results = await manager.trigger(ticketId, "pre_request");

    // Should not find tasks because condition not met
    expect(results.length).toBe(0);
  });
});
