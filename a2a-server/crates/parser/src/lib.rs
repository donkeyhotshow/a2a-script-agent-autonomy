//! a2a-parser — Message parsing (Rust N-API module)
//!
//! ADR-ClawCode-Orchestration §14.4 — target: < 0.1 ms per message.
//!
//! Exposes fast JSON message parsing / extraction to Node.js so that
//! the hot-path interrupt-extraction loop avoids repeated V8 JSON.parse
//! allocations on large LLM response blobs.
//!
//! # Exposed functions
//!
//! - `parseMessage(raw: string) -> ParsedMessage`
//! - `extractExecuteBlock(raw: string) -> string | null`
//! - `extractResultBlock(raw: string) -> string | null`

#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde_json::Value;

/// Lightweight parsed message representation returned to Node.js.
#[napi(object)]
pub struct ParsedMessage {
    /// Whether the raw string is valid JSON
    pub valid: bool,
    /// Stringified `execute` block if present, else empty string
    pub execute: String,
    /// Stringified `result` block if present, else empty string
    pub result: String,
    /// Stringified `context` block if present, else empty string
    pub context: String,
    /// Any parse error description
    pub error: String,
}

/// Parse a raw LLM / server JSON message and extract the top-level blocks.
#[napi]
pub fn parse_message(raw: String) -> ParsedMessage {
    match serde_json::from_str::<Value>(&raw) {
        Err(e) => ParsedMessage {
            valid: false,
            execute: String::new(),
            result: String::new(),
            context: String::new(),
            error: e.to_string(),
        },
        Ok(v) => ParsedMessage {
            valid: true,
            execute: extract_block(&v, "execute"),
            result: extract_block(&v, "result"),
            context: extract_block(&v, "context"),
            error: String::new(),
        },
    }
}

/// Extract and return the raw JSON string of the `execute` block, or null.
#[napi]
pub fn extract_execute_block(raw: String) -> Option<String> {
    extract_key_json(&raw, "execute")
}

/// Extract and return the raw JSON string of the `result` block, or null.
#[napi]
pub fn extract_result_block(raw: String) -> Option<String> {
    extract_key_json(&raw, "result")
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn extract_block(v: &Value, key: &str) -> String {
    v.get(key)
        .map(|b| serde_json::to_string(b).unwrap_or_default())
        .unwrap_or_default()
}

fn extract_key_json(raw: &str, key: &str) -> Option<String> {
    let v: Value = serde_json::from_str(raw).ok()?;
    let block = v.get(key)?;
    serde_json::to_string(block).ok()
}
