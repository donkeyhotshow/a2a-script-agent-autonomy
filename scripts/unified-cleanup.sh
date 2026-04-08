#!/bin/bash
# Unified cleanup for A2A system
# Run via cron: 0 2 * * * /path/to/scripts/unified-cleanup.sh

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Client API session trees: full wipe under storage/sessions (no age-based pruning).
# Intentional for scheduled resets; do not use if you need existing session bindings.
echo "Wiping all client session trees..."
cd "$DIR/a2a-client" && npm run cleanup:sessions

# Server request snapshots (retention by days — see a2a-server request cleanup)
echo "Cleaning up server requests..."
cd "$DIR/a2a-server" && npx tsx scripts/cleanup-requests.ts 14

echo "Unified cleanup completed at $(date)"
