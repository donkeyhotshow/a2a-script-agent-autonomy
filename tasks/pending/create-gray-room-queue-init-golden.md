# Create Golden Test Files for Gray Room Queue Initialization

## Task Description
Create golden test files in `simulations/gray-room/` for queue initialization with 5 steps as specified in task #5 of `tasks/pending/gray-room-system-tasks.md`.

## Requirements
1. Create a new simulation directory: `simulations/gray-room/queue-init-5-steps/`
2. Create the following files in this directory:
   - `request.json` - Initial request with empty sequence
   - `request.md` - Human-readable version of request
   - `response.json` - Expected response after processing (should show initialized queue with 5 steps)
   - `response.md` - Human-readable version of response
   - Optionally: `simulation.md` describing the test case

## Sequence Specification
The initialization should create a sequence with 5 steps:
- Step 1: "Initialize System", "Set up basic configuration", ["config_ready"]
- Step 2: "Load Dependencies", "Install required packages", ["deps_loaded"]
- Step 3: "Configure Environment", "Set environment variables", ["env_configured"]
- Step 4: "Run Initial Tests", "Execute test suite", ["tests_passed"]
- Step 5: "Deploy Application", "Deploy to staging environment", ["deployed"]

All steps should start with status "pending" except the first which should be "in_progress".

## Success Criteria
- `sim:check-md --path simulations/gray-room/queue-init-5-steps/` should pass
- The sequence should be properly initialized with 5 steps
- headIndex should be 0 (first step)
- Step 1 status should be "in_progress"
- Steps 2-5 status should be "pending"

## Related Files
- Parent task: `tasks/pending/gray-room-system-tasks.md` #5
- Sequence schema: `docs/references/sequence-schema.json`
- Sequence implementation: `a2a-server/src/services/core/request-processor/sequence-workbench.ts`
