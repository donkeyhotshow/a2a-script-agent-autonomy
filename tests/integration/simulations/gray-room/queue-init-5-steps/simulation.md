# Gray Room Queue Initialization Test (5 Steps)

## Description
This test verifies that the gray room processing correctly initializes a sequence queue with 5 steps when starting from an empty sequence.

## Steps
1. Start with empty sequence in workbench
2. Process the initialization request
3. Verify that 5 steps are created with correct properties
4. Verify that headIndex is 0
5. Verify that step 1 status is "in_progress"
6. Verify that steps 2-5 status is "pending"

## Expected Behavior
The sequence should be initialized with:
- Step 1: "Initialize System" (in_progress)
- Step 2: "Load Dependencies" (pending)
- Step 3: "Configure Environment" (pending)
- Step 4: "Run Initial Tests" (pending)
- Step 5: "Deploy Application" (pending)

All steps should have appropriate exit criteria and dependencies as defined.