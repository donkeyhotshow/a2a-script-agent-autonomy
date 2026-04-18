/**
 * memory/injector.ts — Injects relevant past context into the task string
 * when memory_injection is enabled. Prepends a short conversation summary.
 */
import { getMemoryStore } from "./store.js"
import { config } from "../config.js"

/**
 * Optionally prepend recent memory context to the task string.
 * Returns the (possibly augmented) task string.
 */
export async function injectMemory(
  chatId: number,
  task: string,
  limit = 5
): Promise<string> {
  if (!config.features.memoryInjection) return task

  try {
    const store = await getMemoryStore()
    const recent = await store.recent(chatId, limit)
    if (recent.length === 0) return task

    const contextLines = recent
      .map((e) => `[${e.role === "user" ? "User" : "Agent"}]: ${e.content.slice(0, 200)}`)
      .join("\n")

    return `[Prior context]\n${contextLines}\n\n[Current task]\n${task}`
  } catch (err) {
    console.warn("[memory/injector] Failed to inject memory:", err)
    return task
  }
}

/**
 * Record a user message and agent response to memory.
 */
export async function recordExchange(
  chatId: number,
  userTask: string,
  agentResponse: string
): Promise<void> {
  if (!config.features.memoryInjection) return
  try {
    const store = await getMemoryStore()
    const now = Date.now()
    await store.add(chatId, { role: "user", content: userTask, timestamp: now })
    await store.add(chatId, { role: "agent", content: agentResponse, timestamp: now + 1 })
  } catch (err) {
    console.warn("[memory/injector] Failed to record exchange:", err)
  }
}
