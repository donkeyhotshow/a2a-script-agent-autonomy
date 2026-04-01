//! a2a-hasher — Context SHA-256 hashing (Rust N-API module)
//!
//! ADR-ClawCode-Orchestration §14.4 — target: < 0.05 ms.
//!
//! Used by LoopDetector (ADR-0035) to produce deterministic context hashes
//! faster than Node.js `crypto.createHash`.  The Rust SHA-256 implementation
//! avoids V8 ↔ C++ boundary overhead for repeated calls in the gray-room loop.
//!
//! # Exposed functions
//!
//! - `sha256Hex(input: string) -> string`   — hex-encoded SHA-256 of input
//! - `sha256HexBytes(input: Buffer) -> string` — same, from raw bytes

#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::{Digest, Sha256};

/// Return the lowercase hex-encoded SHA-256 digest of a UTF-8 string.
///
/// This is the primary entry point used by LoopDetector to hash the
/// serialised context on each turn.
#[napi]
pub fn sha256_hex(input: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

/// Return the lowercase hex-encoded SHA-256 digest of a raw byte buffer.
///
/// Useful when the context has already been serialised to a `Buffer` in
/// Node.js and re-stringification would be wasteful.
#[napi]
pub fn sha256_hex_bytes(input: Buffer) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_ref());
    hex::encode(hasher.finalize())
}
