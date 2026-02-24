import { Redis } from 'ioredis';
import { config } from './index.js';

/**
 * Redis Configuration
 * Redis client setup and connection management
 */

let redis: Redis | null = null;

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redis) {
    // Parse Redis URL to get connection details
    const redisUrl = config.redisUrl;
    const url = new URL(redisUrl);
    const port = parseInt(url.port || '6379', 10);
    const host = url.hostname;
    const password = url.password || undefined;

    redis = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
  }
  
  return redis;
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
  await client.ping();
  console.log('Redis connected successfully');
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis disconnected');
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    await client.ping();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (e) {
    return {
      status: 'unhealthy',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Cache operations
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttlMs) {
      await client.set(key, serialized, 'PX', ttlMs);
    } else {
      await client.set(key, serialized);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    return client.del(...keys);
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Set TTL on key
   */
  async expire(key: string, ttlMs: number): Promise<void> {
    const client = getRedisClient();
    await client.pexpire(key, ttlMs);
  },
};

/**
 * Pub/Sub operations
 */
export const pubsub = {
  /**
   * Publish message
   */
  async publish(channel: string, message: unknown): Promise<void> {
    const client = getRedisClient();
    await client.publish(channel, JSON.stringify(message));
  },

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: unknown) => void): Promise<void> {
    const client = getRedisClient();
    const subscriber = client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch: string, msg: string) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  },
};
