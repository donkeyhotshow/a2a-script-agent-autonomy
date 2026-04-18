/**
 * memory/store.ts — Episodic memory per chat.
 * Stores past task/response pairs so they can be retrieved as context.
 * Primary: Redis sorted set scored by timestamp. Fallback: in-memory array.
 */
import { Redis as IoRedis } from "ioredis"
import { config } from "../config.js"

type RedisClient = IoRedis

export interface MemoryEntry {
  role: "user" | "agent"
  content: string
  timestamp: number
}

export interface MemoryStore {
  add(chatId: number, entry: MemoryEntry): Promise<void>
  recent(chatId: number, limit?: number): Promise<MemoryEntry[]>
  clear(chatId: number): Promise<void>
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const MAX_MEMORY = 50

class MemoryMemoryStore implements MemoryStore {
  private store = new Map<number, MemoryEntry[]>()

  async add(chatId: number, entry: MemoryEntry): Promise<void> {
    const list = this.store.get(chatId) ?? []
    list.push(entry)
    if (list.length > MAX_MEMORY) list.shift()
    this.store.set(chatId, list)
  }

  async recent(chatId: number, limit = 10): Promise<MemoryEntry[]> {
    const list = this.store.get(chatId) ?? []
    return list.slice(-limit)
  }

  async clear(chatId: number): Promise<void> {
    this.store.delete(chatId)
  }
}

// ── Redis sorted-set store ────────────────────────────────────────────────────

class RedisMemoryStore implements MemoryStore {
  constructor(private redis: RedisClient) {}

  private key(chatId: number): string {
    return `tg:memory:${chatId}`
  }

  async add(chatId: number, entry: MemoryEntry): Promise<void> {
    const key = this.key(chatId)
    await this.redis.zadd(key, entry.timestamp, JSON.stringify(entry))
    // Keep only the last MAX_MEMORY entries
    await this.redis.zremrangebyrank(key, 0, -(MAX_MEMORY + 1))
    await this.redis.expire(key, config.session.ttlDays * 24 * 60 * 60)
  }

  async recent(chatId: number, limit = 10): Promise<MemoryEntry[]> {
    const key = this.key(chatId)
    // zrevrangebyscore returns entries in descending score (newest first), capped by limit
    const items = await this.redis.zrevrangebyscore(key, "+inf", "-inf", "LIMIT", 0, limit)
    return items.map((s: string) => JSON.parse(s) as MemoryEntry)
  }

  async clear(chatId: number): Promise<void> {
    await this.redis.del(this.key(chatId))
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _store: MemoryStore | null = null

export async function getMemoryStore(): Promise<MemoryStore> {
  if (_store) return _store
  const url = config.session.redisUrl
  if (url) {
    try {
      const redis = new IoRedis(url, { lazyConnect: true })
      await redis.connect()
      _store = new RedisMemoryStore(redis)
      return _store
    } catch {
      // fall through to in-memory
    }
  }
  _store = new MemoryMemoryStore()
  return _store
}
