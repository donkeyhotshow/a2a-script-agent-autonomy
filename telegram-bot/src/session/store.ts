/**
 * session/store.ts — Maps Telegram chat_id → A2A session_id.
 * Primary: Redis HSET with configurable TTL.
 * Fallback: in-memory Map (resets on process restart).
 */
import { config } from "../config.js"
import { Redis as IoRedis } from "ioredis"

type RedisClient = IoRedis

export interface SessionStore {
  get(chatId: number): Promise<string | null>
  set(chatId: number, sessionId: string): Promise<void>
  delete(chatId: number): Promise<void>
}

const REDIS_KEY = "tg:sessions"

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

class RedisStore implements SessionStore {
  private ttlSeconds: number

  constructor(private redis: RedisClient, ttlDays: number) {
    this.ttlSeconds = ttlDays * 24 * 60 * 60
  }

  async get(chatId: number): Promise<string | null> {
    const val = await this.redis.hget(REDIS_KEY, String(chatId))
    return val ?? null
  }

  async set(chatId: number, sessionId: string): Promise<void> {
    await this.redis.hset(REDIS_KEY, String(chatId), sessionId)
    await this.redis.expire(REDIS_KEY, this.ttlSeconds)
  }

  async delete(chatId: number): Promise<void> {
    await this.redis.hdel(REDIS_KEY, String(chatId))
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export async function createStore(): Promise<SessionStore> {
  const url = config.session.redisUrl
  if (url) {
    const redis = new IoRedis(url, { lazyConnect: true })
    try {
      await redis.connect()
      console.log(
        "[session/store] Using Redis backend:",
        url.replace(/:[^:@]+@/, ":***@")
      )
      return new RedisStore(redis, config.session.ttlDays)
    } catch (err) {
      console.warn(
        "[session/store] Redis connection failed, falling back to in-memory store:",
        err
      )
      try {
        await redis.disconnect()
      } catch {
        // ignore
      }
    }
  } else {
    console.log("[session/store] No REDIS_URL set, using in-memory store")
  }
  return new MemoryStore()
}
