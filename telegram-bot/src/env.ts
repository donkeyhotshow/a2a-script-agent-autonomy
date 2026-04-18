/**
 * env.ts — Validates and exports all required environment variables at startup.
 * Throws a descriptive error if any required variable is missing.
 */
import "dotenv/config"

function required(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`[env] Missing required environment variable: ${name}`)
  return val
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

function optionalNumber(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (!raw) return defaultValue
  const n = parseInt(raw, 10)
  if (isNaN(n)) throw new Error(`[env] ${name} must be a number, got: ${raw}`)
  return n
}

export const env = {
  TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  A2A_API_URL: optional("A2A_API_URL", "http://localhost:3001"),
  ALLOWED_CHAT_IDS: process.env["ALLOWED_CHAT_IDS"]
    ? process.env["ALLOWED_CHAT_IDS"].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : [],
  REDIS_URL: process.env["REDIS_URL"] ?? null,
  POLL_INTERVAL_MS: optionalNumber("POLL_INTERVAL_MS", 800),
  POLL_MAX_ATTEMPTS: optionalNumber("POLL_MAX_ATTEMPTS", 60),
  PORT: optionalNumber("PORT", 4000),
} as const
