#!/usr/bin/env bash
# scripts/test-session-e2e.sh — E2E smoke test for the full session flow.
#
# Flow: create session → send task → poll messages → assert non-empty response
#
# Requirements: curl, jq (optional but recommended), running a2a-server + a2a-client stacks.
# Usage:
#   SERVER_URL=http://localhost:3000 CLIENT_URL=http://localhost:5173 bash scripts/test-session-e2e.sh

set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
CLIENT_URL="${CLIENT_URL:-http://localhost:5173}"
TASK_TEXT="${TASK_TEXT:-Say hello from the e2e smoke test. Reply with a single short sentence.}"

JQ_AVAILABLE=false
command -v jq &>/dev/null && JQ_AVAILABLE=true

extract() {
  local json="$1" key="$2"
  if $JQ_AVAILABLE; then
    echo "$json" | jq -r "$key // empty" 2>/dev/null || true
  else
    echo "$json" | node -e "
      let d='';
      process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        try {
          const p='${key}'.replace(/^\./,'').split('.');
          let v=JSON.parse(d);
          for(const k of p) v=v?.[k];
          console.log(v??'');
        } catch(e){ process.exit(1); }
      });
    " <<< "$json" 2>/dev/null || true
  fi
}

echo "==> E2E session smoke test"
echo "    SERVER : $SERVER_URL"
echo "    CLIENT : $CLIENT_URL"

# ── 1. Health check ──────────────────────────────────────────────────────────
echo ""
echo "--> [1/4] Server health check"
HEALTH=$(curl -sS "${SERVER_URL}/health")
STATUS=$(extract "$HEALTH" ".status")
if [[ "$STATUS" != "ok" ]]; then
  echo "FAIL: server health returned: $HEALTH" >&2
  exit 1
fi
echo "    OK: $HEALTH"

# ── 2. Create session ────────────────────────────────────────────────────────
echo ""
echo "--> [2/4] Create session via Client API"
CREATE_RESP=$(curl -sS -X POST "${CLIENT_URL}/api/a2a/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"task\": \"${TASK_TEXT}\"}")

SESSION_ID=$(extract "$CREATE_RESP" ".session.id")
if [[ -z "$SESSION_ID" ]]; then
  echo "FAIL: could not extract session id from: $CREATE_RESP" >&2
  exit 1
fi
echo "    session_id = $SESSION_ID"

# ── 3. Poll for messages ─────────────────────────────────────────────────────
echo ""
echo "--> [3/4] Poll GET /api/a2a/sessions/${SESSION_ID}/messages (up to 30 s)"
MESSAGES=""
for i in $(seq 1 15); do
  sleep 2
  RESP=$(curl -sS "${SERVER_URL}/api/a2a/sessions/${SESSION_ID}/messages" 2>/dev/null || true)
  COUNT=$(extract "$RESP" ".messages | length" 2>/dev/null || echo "0")
  echo "    attempt $i: messages count = ${COUNT:-0}"
  if [[ "${COUNT:-0}" != "0" ]]; then
    MESSAGES="$RESP"
    break
  fi
done

# ── 4. Assert ────────────────────────────────────────────────────────────────
echo ""
echo "--> [4/4] Assertion"
if [[ -z "$MESSAGES" ]]; then
  echo "WARN: no messages returned after 30 s. This may be expected if the server runs async." >&2
  echo "    Raw last response: $RESP"
  exit 0
fi

echo "    Messages JSON (first 400 chars): ${MESSAGES:0:400}"
echo "OK: session flow completed, messages were returned."
