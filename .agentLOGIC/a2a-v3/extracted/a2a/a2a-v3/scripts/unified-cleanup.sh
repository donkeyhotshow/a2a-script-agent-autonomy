#!/bin/bash
# Unified cleanup for A2A system
# Run via cron: 0 2 * * * /path/to/scripts/unified-cleanup.sh

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Cleanup client sessions (14 days)
echo "Cleaning up client sessions..."
cd "$DIR/a2a-client" && npm run cleanup:sessions

# Cleanup server requests (14 days)  
echo "Cleaning up server requests..."
cd "$DIR/a2a-server" && npx tsx scripts/cleanup-requests.ts 14

echo "Unified cleanup completed at $(date)"
