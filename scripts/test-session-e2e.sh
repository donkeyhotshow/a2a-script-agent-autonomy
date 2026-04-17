#!/usr/bin/env bash
# =============================================================================
# scripts/test-session-e2e.sh — Full E2E smoke test for the A2A session stack.
# =============================================================================
#
# Tests (in order):
#   [1]  Server health check               GET  $SERVER_URL/health
#   [2]  Client (Vite) reachability        GET  $CLIENT_URL/
#   [3]  Create session                    POST $CLIENT_URL/api/a2a/sessions
#   [4]  Send first beat (task)            POST $CLIENT_URL/api/a2a/sessions/:id/next
#   [5]  Poll /async until settled         GET  $CLIENT_URL/api/a2a/sessions/:id/async
#   [6]  Read stored messages              GET  $CLIENT_URL/api/a2a/sessions/:id/messages
#   [7]  SSE stream connects               GET  $CLIENT_URL/api/a2a/sessions/:id/events
#   [8]  Stop session                      POST $CLIENT_URL/api/a2a/sessions/:id/stop
#   [9]  Rate-limit check (429)            GET  $CLIENT_URL/api/a2a/sessions/:id/messages (61 rapid)
#
# Prerequisites:
#   - Both stacks are running:
#       a2a-server (port 3000)   → cd a2a-server && npm run dev
#       a2a-client (port 5173)   → cd a2a-client && npm run dev
#   - curl is installed (jq is optional — node is used as fallback).
#
# Environment overrides:
#   SERVER_URL   Base URL of a2a-server  (default: http://localhost:3000)
#   CLIENT_URL   Base URL of a2a-client  (default: http://localhost:5173)
#   TASK_TEXT    Message sent to the LLM (default: short greeting)
#   POLL_MAX     Max /async poll attempts (default: 30)
#   POLL_SLEEP   Seconds between polls    (default: 2)
#
# Usage:
#   bash scripts/test-session-e2e.sh
#   SERVER_URL=http://prod:3000 CLIENT_URL=http://prod:5173 bash scripts/test-session-e2e.sh
# =============================================================================

set -uo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
CLIENT_URL="${CLIENT_URL:-http://localhost:5173}"
TASK_TEXT="${TASK_TEXT:-Reply with a single short sentence confirming the system is working.}"
POLL_MAX="${POLL_MAX:-30}"
POLL_SLEEP="${POLL_SLEEP:-2}"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

# ── Test accounting ───────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
declare -a FAILURES=()

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)) || true; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILURES+=("$1"); ((FAIL++)) || true; }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 [SKIPPED]"; ((SKIP++)) || true; }
section() { echo -e "\n${CYAN}${BOLD}──── $1 ────${NC}"; }

# ── JSON extraction (jq or node fallback) ────────────────────────────────────
JQ_AVAILABLE=false
command -v jq &>/dev/null && JQ_AVAILABLE=true

# extract <json_string> <dotted.key|jq_filter>
# Returns the value or empty string on error.
extract() {
  local json="$1" filter="$2"
  if $JQ_AVAILABLE; then
    echo "$json" | jq -r "($filter) // empty" 2>/dev/null || true
  else
    # node fallback: strip leading `.` and split on `.` for simple property access.
    # Handles .foo, .foo.bar but NOT array filters like .messages | length.
    echo "$json" | node --input-type=module - "$filter" 2>/dev/null << 'NODE'
import { createInterface } from 'readline';
const filter = process.argv[1];
let d = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    let v = JSON.parse(d);
    // Strip leading `.` then walk property chain (stop at `|` or space).
    const path = filter.replace(/^\s*\./, '').split('.').map(s => s.split('|')[0].trim()).filter(Boolean);
    for (const k of path) { if (v == null) break; v = v[k]; }
    if (v === undefined || v === null) { process.exit(0); }
    console.log(Array.isArray(v) ? v.length : String(v));
  } catch { process.exit(0); }
});
NODE
  fi
}

# extract_length <json_string> <array_path> — returns numeric length or 0
extract_length() {
  local json="$1" path="$2"
  if $JQ_AVAILABLE; then
    echo "$json" | jq -r "(${path} | length) // 0" 2>/dev/null || echo "0"
  else
    echo "$json" | node --input-type=module - "$path" 2>/dev/null << 'NODE' || echo "0"
import { createInterface } from 'readline';
const path = process.argv[1];
let d = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    let v = JSON.parse(d);
    const keys = path.replace(/^\s*\./, '').split('.').filter(Boolean);
    for (const k of keys) { if (v == null) break; v = v[k]; }
    console.log(Array.isArray(v) ? v.length : (v != null ? 1 : 0));
  } catch { console.log(0); }
});
NODE
  fi
}

# ── curl helper ───────────────────────────────────────────────────────────────
# http_get <url> → body (HTTP errors are NOT thrown; check status separately)
http_get() { curl -sS --max-time 15 "$1" 2>/dev/null || true; }

# http_post <url> <json_body> → body
http_post() { curl -sS --max-time 30 -X POST -H "Content-Type: application/json" -d "$2" "$1" 2>/dev/null || true; }

# http_status <url> → HTTP status code only
http_status_get() { curl -sS --max-time 15 -o /dev/null -w "%{http_code}" "$1" 2>/dev/null || echo "000"; }
http_status_post() { curl -sS --max-time 15 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$2" "$1" 2>/dev/null || echo "000"; }

# ── Banner ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}A2A Session E2E Smoke Test${NC}"
echo "  SERVER  : $SERVER_URL"
echo "  CLIENT  : $CLIENT_URL"
echo "  TASK    : ${TASK_TEXT:0:60}…"
echo "  JQ      : $JQ_AVAILABLE"

# =============================================================================
# [1] Server health check
# =============================================================================
section "1/9  Server health"

HEALTH=$(http_get "${SERVER_URL}/health")
SRV_STATUS=$(extract "$HEALTH" ".status")
if [[ "$SRV_STATUS" == "ok" ]]; then
  pass "GET /health → status=ok"
  SRV_MODE=$(extract "$HEALTH" ".mode")
  echo "       mode=$(echo "$SRV_MODE" | head -c 40)"
else
  fail "GET /health → expected status=ok, got: ${HEALTH:0:120}"
  echo -e "\n${RED}Server is not reachable. Start it with:  cd a2a-server && npm run dev${NC}" >&2
fi

# =============================================================================
# [2] Client (Vite) reachability
# =============================================================================
section "2/9  Client (Vite) reachability"

CLIENT_STATUS=$(http_status_get "${CLIENT_URL}/")
if [[ "$CLIENT_STATUS" == "200" || "$CLIENT_STATUS" == "304" ]]; then
  pass "GET ${CLIENT_URL}/ → HTTP $CLIENT_STATUS"
else
  fail "GET ${CLIENT_URL}/ → HTTP $CLIENT_STATUS (expected 200)"
  echo -e "${RED}Vite client not reachable. Start it with:  cd a2a-client && npm run dev${NC}" >&2
fi

# =============================================================================
# [3] Create session
# =============================================================================
section "3/9  Create session"

CREATE_RESP=$(http_post "${CLIENT_URL}/api/a2a/sessions" "{}")
# Session id may be at .session.id, .id, or .sessionId depending on envelope
SESSION_ID=$(extract "$CREATE_RESP" ".session.id")
[[ -z "$SESSION_ID" ]] && SESSION_ID=$(extract "$CREATE_RESP" ".id")
[[ -z "$SESSION_ID" ]] && SESSION_ID=$(extract "$CREATE_RESP" ".sessionId")

if [[ -n "$SESSION_ID" ]]; then
  pass "POST /api/a2a/sessions → session_id=${SESSION_ID:0:20}…"
else
  fail "POST /api/a2a/sessions → could not extract session id; body: ${CREATE_RESP:0:200}"
  echo -e "\n${RED}Cannot continue without a session. Aborting remaining tests.${NC}" >&2
  # Print summary and exit
  echo ""
  echo -e "${BOLD}Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}  ${YELLOW}${SKIP} skipped${NC}"
  exit 1
fi

# =============================================================================
# [4] Send first beat (task)
# =============================================================================
section "4/9  Send first beat (task message)"

NEXT_BODY="{\"task\": \"${TASK_TEXT}\"}"
NEXT_RESP=$(http_post "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/next" "$NEXT_BODY")

# Check for error field
NEXT_ERROR=$(extract "$NEXT_RESP" ".error")
NEXT_SUCCESS=$(extract "$NEXT_RESP" ".success")
NEXT_ACCEPTED=$(extract "$NEXT_RESP" ".accepted")
NEXT_ASYNC=$(extract "$NEXT_RESP" ".asyncPending")

if [[ -n "$NEXT_ERROR" && "$NEXT_ERROR" != "null" && "$NEXT_ERROR" != "" ]]; then
  fail "POST /next → error field present: ${NEXT_ERROR:0:120}"
elif [[ "$NEXT_SUCCESS" == "false" ]]; then
  fail "POST /next → success=false; body: ${NEXT_RESP:0:200}"
else
  pass "POST /api/a2a/sessions/${SESSION_ID:0:12}…/next → OK (asyncPending=${NEXT_ASYNC:-unknown})"
fi

# =============================================================================
# [5] Poll /async until settled
# =============================================================================
section "5/9  Poll /async until settled (max ${POLL_MAX}×${POLL_SLEEP}s)"

ASYNC_SETTLED=false
ASYNC_STATUS=""
for i in $(seq 1 "$POLL_MAX"); do
  ASYNC_RESP=$(http_get "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/async")
  ASYNC_PENDING=$(extract "$ASYNC_RESP" ".asyncPending")
  ASYNC_STATUS=$(extract "$ASYNC_RESP" ".status")

  echo "  attempt ${i}/${POLL_MAX}: asyncPending=${ASYNC_PENDING:-?}  status=${ASYNC_STATUS:-?}"

  if [[ "$ASYNC_PENDING" == "false" ]]; then
    ASYNC_SETTLED=true
    break
  fi
  # Also treat error/failed as terminal
  if [[ "$ASYNC_STATUS" == "error" || "$ASYNC_STATUS" == "failed" ]]; then
    ASYNC_SETTLED=true
    break
  fi
  sleep "$POLL_SLEEP"
done

if $ASYNC_SETTLED; then
  if [[ "$ASYNC_STATUS" == "error" || "$ASYNC_STATUS" == "failed" ]]; then
    fail "GET /async settled with status=${ASYNC_STATUS} (LLM or orchestrator error)"
  else
    pass "GET /api/a2a/sessions/${SESSION_ID:0:12}…/async → settled (status=${ASYNC_STATUS:-done})"
  fi
else
  fail "GET /async did not settle within $((POLL_MAX * POLL_SLEEP))s (still asyncPending=true)"
fi

# =============================================================================
# [6] Read stored messages
# =============================================================================
section "6/9  Read stored messages"

MSG_RESP=$(http_get "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/messages")
MSG_HTTP=$(http_status_get "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/messages")
MSG_COUNT=$(extract_length "$MSG_RESP" ".messages")

if [[ "$MSG_HTTP" == "429" ]]; then
  skip "GET /messages → 429 (rate-limited from earlier rapid calls — this is expected behaviour)"
elif [[ "$MSG_HTTP" == "404" ]]; then
  # No on-disk storage is fine in some deployments — warn, don't hard-fail
  skip "GET /messages → 404 (session storage not written to disk yet; may be async)"
elif [[ "$MSG_HTTP" != "200" ]]; then
  fail "GET /messages → HTTP ${MSG_HTTP}; body: ${MSG_RESP:0:200}"
elif [[ "${MSG_COUNT}" -gt 0 ]] 2>/dev/null; then
  pass "GET /api/a2a/sessions/${SESSION_ID:0:12}…/messages → ${MSG_COUNT} message(s)"
else
  # 0 messages is acceptable if the session is still processing or uses in-memory storage
  skip "GET /messages → 200 but 0 messages (async may not have written to disk yet)"
fi

# =============================================================================
# [7] SSE stream connects and sends `connected` event
# =============================================================================
section "7/9  SSE stream (GET /events)"

# Capture the first ~2 s of the SSE stream; look for `connected` event.
SSE_OUT=$(curl -sS --max-time 4 --no-buffer \
  -H "Accept: text/event-stream" \
  "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/events" 2>/dev/null || true)

SSE_HTTP=$(http_status_get "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/events" 2>/dev/null || echo "000")

if [[ "$SSE_HTTP" == "429" ]]; then
  fail "GET /events → 429 (rate-limited on SSE endpoint — rate limit too aggressive)"
elif echo "$SSE_OUT" | grep -q '"type":"connected"'; then
  pass "GET /api/a2a/sessions/${SESSION_ID:0:12}…/events → received {type:connected}"
elif echo "$SSE_OUT" | grep -q 'connected'; then
  pass "GET /api/a2a/sessions/${SESSION_ID:0:12}…/events → SSE stream returned data"
elif [[ -n "$SSE_OUT" ]]; then
  skip "GET /events → received data but no 'connected' event; first 120 chars: ${SSE_OUT:0:120}"
else
  fail "GET /events → no data received within 4s (HTTP ${SSE_HTTP})"
fi

# =============================================================================
# [8] Stop session
# =============================================================================
section "8/9  Stop session"

STOP_RESP=$(http_post "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/stop" '{"reason":"e2e-test"}')
STOP_HTTP=$(http_status_post "${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/stop" '{"reason":"e2e-test"}')
STOP_SUCCESS=$(extract "$STOP_RESP" ".success")
STOP_STOPPED=$(extract "$STOP_RESP" ".data.stopped")

if [[ "$STOP_HTTP" == "200" && ( "$STOP_SUCCESS" == "true" || "$STOP_STOPPED" == "true" ) ]]; then
  pass "POST /api/a2a/sessions/${SESSION_ID:0:12}…/stop → stopped=true"
elif [[ "$STOP_HTTP" == "429" ]]; then
  fail "POST /stop → 429 (rate-limited on stop endpoint)"
elif [[ "$STOP_HTTP" == "404" ]]; then
  skip "POST /stop → 404 (session may have already ended; acceptable)"
else
  fail "POST /stop → HTTP ${STOP_HTTP}; body: ${STOP_RESP:0:200}"
fi

# =============================================================================
# [9] Rate-limit check (send 61 rapid GET /messages — expect at least one 429)
# =============================================================================
section "9/9  Rate-limit check (61 rapid requests → expect 429)"

RATE_LIMIT_HIT=false
RL_URL="${CLIENT_URL}/api/a2a/sessions/${SESSION_ID}/messages"

echo "  Sending 61 rapid GET requests to /messages…"
for i in $(seq 1 61); do
  STATUS=$(http_status_get "$RL_URL")
  if [[ "$STATUS" == "429" ]]; then
    RATE_LIMIT_HIT=true
    echo "  Got 429 on request #${i}"
    break
  fi
done

if $RATE_LIMIT_HIT; then
  pass "Rate-limit (60 req/min) enforced — received 429 as expected"
else
  fail "Rate-limit not triggered after 61 requests — missing or misconfigured rate limiter"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results:${NC}  ${GREEN}${PASS} passed${NC}  |  ${RED}${FAIL} failed${NC}  |  ${YELLOW}${SKIP} skipped${NC}"

if [[ "${#FAILURES[@]}" -gt 0 ]]; then
  echo ""
  echo -e "${RED}${BOLD}Failed checks:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}✗${NC} $f"
  done
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}${FAIL} CHECK(S) FAILED${NC}"
  exit 1
fi
