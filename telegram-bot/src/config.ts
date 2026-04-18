/**
 * config.ts — Unified configuration loader.
 * Reads telegram-bot/config.toml (optional) and merges environment variables on top.
 * Environment variables always win over TOML values.
 */
import "dotenv/config"
import * as fs from "node:fs"
import * as path from "node:path"
import * as TOML from "smol-toml"

// ── TOML shape ────────────────────────────────────────────────────────────────

interface TomlConfig {
  telegram?: {
    bot_token?: string
    allowed_chat_ids?: number[]
    require_auth_code?: boolean
  }
  a2a?: {
    api_url?: string
    poll_interval_ms?: number
    poll_max_attempts?: number
  }
  session?: {
    persist_backend?: "redis" | "memory"
    redis_url?: string
    ttl_days?: number
  }
  rate_limit?: {
    requests_per_minute?: number
    per_chat?: boolean
  }
  features?: {
    voice_transcription?: boolean
    photo_notifications?: boolean
    memory_injection?: boolean
    verbose_tool_calls?: boolean
  }
  permissions?: {
    admin_ids?: number[]
    operator_ids?: number[]
  }
  watchdog?: {
    timeout_seconds?: number
    notify_on_timeout?: boolean
  }
}

// ── Load TOML ─────────────────────────────────────────────────────────────────

function loadToml(): TomlConfig {
  const candidates = [
    path.join(process.cwd(), "config.toml"),
    path.join(__dirname, "..", "config.toml"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8")
        console.log(`[config] Loaded TOML config from ${p}`)
        return TOML.parse(raw) as TomlConfig
      } catch (err) {
        console.warn(`[config] Failed to parse ${p}:`, err)
      }
    }
  }
  return {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function required(envName: string, tomlValue: string | undefined): string {
  const val = process.env[envName] ?? tomlValue
  if (!val) throw new Error(`[config] Missing required config: env ${envName} or TOML equivalent`)
  return val
}

function str(envName: string, tomlValue: string | undefined, defaultValue: string): string {
  return process.env[envName] ?? tomlValue ?? defaultValue
}

function num(envName: string, tomlValue: number | undefined, defaultValue: number): number {
  const raw = process.env[envName]
  if (raw) {
    const n = parseInt(raw, 10)
    if (isNaN(n)) throw new Error(`[config] ${envName} must be a number, got: ${raw}`)
    return n
  }
  return tomlValue ?? defaultValue
}

function bool(envName: string, tomlValue: boolean | undefined, defaultValue: boolean): boolean {
  const raw = process.env[envName]
  if (raw !== undefined) return raw === "1" || raw.toLowerCase() === "true"
  return tomlValue ?? defaultValue
}

function chatIds(envName: string, tomlValue: number[] | undefined): number[] {
  const raw = process.env[envName]
  if (raw) {
    return raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  }
  return tomlValue ?? []
}

// ── Build config ──────────────────────────────────────────────────────────────

const toml = loadToml()

export const config = {
  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN", toml.telegram?.bot_token),
    allowedChatIds: chatIds("ALLOWED_CHAT_IDS", toml.telegram?.allowed_chat_ids),
    requireAuthCode: bool("REQUIRE_AUTH_CODE", toml.telegram?.require_auth_code, false),
  },
  a2a: {
    apiUrl: str("A2A_API_URL", toml.a2a?.api_url, "http://localhost:3001"),
    pollIntervalMs: num("POLL_INTERVAL_MS", toml.a2a?.poll_interval_ms, 800),
    pollMaxAttempts: num("POLL_MAX_ATTEMPTS", toml.a2a?.poll_max_attempts, 60),
  },
  session: {
    persistBackend: str(
      "SESSION_BACKEND",
      toml.session?.persist_backend,
      "memory"
    ) as "redis" | "memory",
    redisUrl: process.env["REDIS_URL"] ?? toml.session?.redis_url ?? null,
    ttlDays: num("SESSION_TTL_DAYS", toml.session?.ttl_days, 7),
  },
  rateLimit: {
    requestsPerMinute: num(
      "RATE_LIMIT_RPM",
      toml.rate_limit?.requests_per_minute,
      20
    ),
    perChat: bool("RATE_LIMIT_PER_CHAT", toml.rate_limit?.per_chat, true),
  },
  features: {
    voiceTranscription: bool(
      "FEATURE_VOICE",
      toml.features?.voice_transcription,
      false
    ),
    photoNotifications: bool(
      "FEATURE_PHOTOS",
      toml.features?.photo_notifications,
      true
    ),
    memoryInjection: bool(
      "FEATURE_MEMORY",
      toml.features?.memory_injection,
      true
    ),
    verboseToolCalls: bool(
      "FEATURE_VERBOSE_TOOLS",
      toml.features?.verbose_tool_calls,
      true
    ),
  },
  permissions: {
    adminIds: toml.permissions?.admin_ids ?? [],
    operatorIds: toml.permissions?.operator_ids ?? [],
  },
  watchdog: {
    timeoutSeconds: num(
      "WATCHDOG_TIMEOUT_SECONDS",
      toml.watchdog?.timeout_seconds,
      120
    ),
    notifyOnTimeout: bool(
      "WATCHDOG_NOTIFY",
      toml.watchdog?.notify_on_timeout,
      true
    ),
  },
  openaiApiKey: process.env["OPENAI_API_KEY"] ?? null,
  verboseLevel: (() => {
    const level = num("VERBOSE_LEVEL", undefined, 1)
    if (![0, 1, 2].includes(level))
      throw new Error(`[config] VERBOSE_LEVEL must be 0, 1, or 2; got ${level}`)
    return level as 0 | 1 | 2
  })(),
  port: num("PORT", undefined, 4000),
} as const
