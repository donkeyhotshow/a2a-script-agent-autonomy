#!/usr/bin/env bash
# scripts/deploy.sh — One-command production deploy
# Usage: ./scripts/deploy.sh [--dry-run]
set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

echo "▶ Installing dependencies..."
npm ci

echo "▶ Building all packages..."
npm run build

echo "▶ Running TypeScript checks..."
cd a2a-server && npx tsc --noEmit && cd ..
echo "✅ TypeScript: 0 errors"

if [[ -f scripts/scale-test.sh ]]; then
  echo "▶ Running scale test..."
  bash scripts/scale-test.sh && echo "✅ Scale test passed"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "ℹ️  Dry run — skipping Vercel deploy."
  exit 0
fi

if ! command -v vercel &> /dev/null; then
  echo "▶ Installing Vercel CLI..."
  npm install -g vercel
fi

echo "▶ Deploying to Vercel (production)..."
vercel --prod --yes

LIVE_URL=$(vercel ls 2>/dev/null | grep "a2a-script-agent" | head -1 | awk '{print $2}' || echo "see above")
echo ""
echo "✅ LIVE: https://${LIVE_URL}"
