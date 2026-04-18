/**
 * session-store.ts — Maps Telegram chat_id → A2A session_id.
 * Primary: Redis HSET with 7-day TTL.
 * Fallback: in-memory Map (resets on process restart).
 */
import { env } from "./env.js"
import Redis from "ioredis"

export interface SessionStore {
  get(chatId: number): Promise<string | null>
  set(chatId: number, sessionId: string): Promise<void>
  delete(chatId: number): Promise<void>
}

const REDIS_KEY = "tg:sessions"
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

// ── In-memory fallback ────────────────────────────────────────────────────────

class MemoryStore implements SessionStore {
  private store = new Map<number, string>()

  async get(chatId: number): Promise<string | null> {
    return this.store.get(chatId) ?? null
  }

  async set(chatId: number, sessionId: string): Promise<void> {
    this.store.set(chatId, sessionId)
  }

  async delete(chatId: number): Promise<void> {
    this.store.delete(chatId)
  }
}

// ── Redis-backed store ────────────────────────────────────────────────────────

async function createRedisStore(url: string): Promise<SessionStore> {
  const redis = new Redis(url, { lazyConnect: true })

  try {
    await redis.connect()
    console.log("[session-store] Using Redis backend:", url.replace(/:[^:@]+@/, ":***@"))
  } catch (err) {
    console.warn("[session-store] Redis connection failed, falling back to in-memory store:", err)
    await redis.disconnect()
    throw err
  }

  return {
    async get(chatId: number): Promise<string | null> {
      const val = await redis.hget(REDIS_KEY, String(chatId))
      return val ?? null
    },
    async set(chatId: number, sessionId: string): Promise<void> {
      await redis.hset(REDIS_KEY, String(chatId), sessionId)
      await redis.expire(REDIS_KEY, TTL_SECONDS)
    },
    async delete(chatId: number): Promise<void> {
      await redis.hdel(REDIS_KEY, String(chatId))
    },
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export async function createStore(): Promise<SessionStore> {
  if (env.REDIS_URL) {
    try {
      return await createRedisStore(env.REDIS_URL)
    } catch {
      // Already logged inside createRedisStore
    }
  } else {
    console.log("[session-store] No REDIS_URL set, using in-memory store")
  }
  return new MemoryStore()
}
