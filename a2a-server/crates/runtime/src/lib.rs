//! a2a-runtime — Session state management (Rust N-API module)
//!
//! ADR-ClawCode-Orchestration §14.4
//!
//! Exposes fast in-process session state operations to Node.js via N-API so
//! that the critical path (state read/write, FSM transition validation) runs
//! in < 0.1 ms without the V8 GC pauses incurred by large JSON objects.
//!
//! # Exposed functions (callable from Node.js)
//!
//! - `createSession(id: string, initialState: string) -> string`
//! - `getState(id: string) -> string | null`
//! - `setState(id: string, state: string) -> void`
//! - `deleteSession(id: string) -> bool`
//! - `sessionCount() -> u32`

#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;
use std::sync::Mutex;

// Global session registry.
//
// `Mutex<Option<HashMap>>` rather than `Mutex<HashMap>` is a Rust idiom for
// lazy initialisation: the inner `Option` starts as `None` and is populated
// the first time `with_sessions` is called via `get_or_insert_with`.  This
// avoids allocating the HashMap until the module is actually used, which is
// important for N-API modules loaded at server startup before any sessions exist.
static SESSIONS: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

fn with_sessions<F, R>(f: F) -> R
where
    F: FnOnce(&mut HashMap<String, String>) -> R,
{
    let mut guard = SESSIONS.lock().expect("session mutex poisoned");
    let map = guard.get_or_insert_with(HashMap::new);
    f(map)
}

/// Create a new session entry with the given `initial_state` JSON blob.
/// Returns the session id.
#[napi]
pub fn create_session(id: String, initial_state: String) -> String {
    with_sessions(|m| {
        m.insert(id.clone(), initial_state);
    });
    id
}

/// Retrieve the current state blob for a session, or `null` if not found.
#[napi]
pub fn get_state(id: String) -> Option<String> {
    with_sessions(|m| m.get(&id).cloned())
}

/// Overwrite the state blob for an existing session.
/// If the session does not exist it is created.
#[napi]
pub fn set_state(id: String, state: String) {
    with_sessions(|m| {
        m.insert(id, state);
    });
}

/// Remove a session. Returns `true` if the session existed.
#[napi]
pub fn delete_session(id: String) -> bool {
    with_sessions(|m| m.remove(&id).is_some())
}

/// Return the total number of live sessions.
#[napi]
pub fn session_count() -> u32 {
    with_sessions(|m| m.len() as u32)
}
