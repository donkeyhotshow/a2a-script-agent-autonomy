#!/usr/bin/env bash
# scripts/test-groq.sh — Smoke test for the Groq API key and model availability.
# Usage: GROQ_API_KEY=sk-... [GROQ_MODEL=llama-3.3-70b-versatile] bash scripts/test-groq.sh

set -euo pipefail

API_KEY="${GROQ_API_KEY:-}"
MODEL="${GROQ_MODEL:-llama-3.3-70b-versatile}"
BASE="${GROQ_BASE_URL:-https://api.groq.com/openai/v1}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: GROQ_API_KEY is not set." >&2
  exit 1
fi

echo "==> Groq smoke test"
echo "    Base : $BASE"
echo "    Model: $MODEL"

RESPONSE=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${BASE}/chat/completions" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Reply with the single word: pong\"}],
    \"max_tokens\": 10
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "    HTTP : $HTTP_STATUS"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "FAIL: Groq API returned HTTP $HTTP_STATUS" >&2
  echo "$BODY" >&2
  exit 1
fi

# Extract the content field
CONTENT=$(echo "$BODY" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try { const j=JSON.parse(d); console.log(j.choices?.[0]?.message?.content??''); }
    catch(e){ console.error('Parse error',e.message); process.exit(1); }
  });
")

echo "    Reply: $CONTENT"
echo "OK: Groq API is reachable and responded."
