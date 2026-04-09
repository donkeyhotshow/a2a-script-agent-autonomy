# A2A Simulations

Moved from a2a-server/scripts/. Standalone simulation runner, validator, reporter for A2A protocol tests.

## Setup
```bash
cd tests/simulations
npm install
```

## Usage
```bash
# Run single simulation
npm run sim:run ../../a2a-ai-hub/simulation/sync/agent/1

# Validate all
npm run sim:validate -- --all

# Lint all
npm run sim:lint -- --all

# Report
npm run sim:report

# Full suite
npm run sim:all
```

Sim data in `../../a2a-ai-hub/simulation/` (sync/, async/, gray-room/).

## Structure
- `scripts/` - runners (tsx CLI)
- Core: sim-run-core.ts (shared logic)

See TODO.md for progress.

