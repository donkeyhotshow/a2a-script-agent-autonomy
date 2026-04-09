#!/usr/bin/env bash
# scale-test.sh — A2A Registry v2 scale test (Week 5)
#
# Registers 10 agents then fires 100 routing requests, printing a summary.
#
# Usage:
#   chmod +x scripts/scale-test.sh
#   BASE_URL=http://localhost:3000 ./scripts/scale-test.sh
#
# Defaults to http://localhost:3000 when BASE_URL is not set.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
REGISTER_URL="${BASE_URL}/api/registry/register"
ROUTE_URL="${BASE_URL}/api/registry/route"
HEALTH_URL="${BASE_URL}/api/registry/health"

AGENT_COUNT=10
ROUTE_COUNT=100

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== A2A Registry v2 Scale Test ===${NC}"
echo "Base URL : ${BASE_URL}"
echo "Agents   : ${AGENT_COUNT}"
echo "Routes   : ${ROUTE_COUNT}"
echo ""

# ── 1. Register agents ────────────────────────────────────────────────────────
echo -e "${YELLOW}Step 1: Registering ${AGENT_COUNT} agents...${NC}"
for i in $(seq 1 "${AGENT_COUNT}"); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${REGISTER_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"agentId\":\"worker-${i}\",\"caps\":[\"code\",\"test\"],\"endpoint\":\"ws://worker-${i}:3001\",\"maxLoad\":10}")
  if [ "${HTTP_CODE}" -eq 201 ]; then
    echo "  [OK] worker-${i} registered (${HTTP_CODE})"
  else
    echo -e "  ${RED}[FAIL] worker-${i} got HTTP ${HTTP_CODE}${NC}"
  fi
done

# ── 2. Show registry health ───────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Step 2: Registry health snapshot...${NC}"
curl -s "${HEALTH_URL}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  online={d[\"online\"]}  draining={d[\"draining\"]}  total={d[\"total\"]}')
" 2>/dev/null || curl -s "${HEALTH_URL}"

# ── 3. Route 100 tasks ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Step 3: Routing ${ROUTE_COUNT} tasks (caps=[\"code\"])...${NC}"
ok=0; fail=0
for i in $(seq 1 "${ROUTE_COUNT}"); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${ROUTE_URL}" \
    -H "Content-Type: application/json" \
    -d '{"caps":["code"]}')
  if [ "${HTTP_CODE}" -eq 200 ]; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
  fi
done
echo "  Routed OK : ${ok}"
echo "  Failed    : ${fail}"

# ── 4. Final health snapshot ──────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Step 4: Final registry health...${NC}"
curl -s "${HEALTH_URL}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for aid, a in d.get('agents', {}).items():
    print(f'  {aid}: health={a[\"health\"]} load={a[\"load\"]}')
" 2>/dev/null || curl -s "${HEALTH_URL}"

echo ""
if [ "${fail}" -eq 0 ]; then
  echo -e "${GREEN}✅ Scale test PASSED — ${ok}/${ROUTE_COUNT} routes OK${NC}"
else
  echo -e "${RED}❌ Scale test PARTIAL — ${ok} OK, ${fail} failed${NC}"
  exit 1
fi
