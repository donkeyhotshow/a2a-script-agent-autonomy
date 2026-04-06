# Gray Room Algorithm Invoke (Black Room) Test

## Description
Tests the `algorithm_invoke` gray room interrupt handler which delegates to the
Black Room Orchestrator for deterministic algorithm execution (Ollama-powered,
non-creative computation).

## Steps
1. User requests a deterministic computation: `fib(10)`
2. LLM recognizes the task as suitable for Black Room → emits `interrupt: algorithm_invoke`
3. Gray room orchestrator calls `handleAlgorithmInvoke()` → BlackRoomOrchestrator
4. Black Room runs the `fibonacci` algorithm template with `{ n: 10 }`
5. Result `55` is merged into `workbench.sections.algorithm_result`
6. Response returns `execute.message` with the computed result

## Expected Behavior
- `execute.message` should contain the computed result (fib(10) = 55)
- `context.workbench.sections.algorithm_result.result` should be `55`
- `context.workbench.sections.algorithm_result.status` should be `"completed"`
- `context.workbench.slots.interruptTrace` should include:
  - `{ kind: 'black_room_start', algorithmId: 'fibonacci' }`
  - `{ kind: 'black_room_complete', algorithmId: 'fibonacci', status: 'completed' }`

## Gray Room Interrupt Chain
- Triggered by: `interrupt.reason === 'algorithm_invoke'`
- Handler: `handleAlgorithmInvoke()` in `gray-room-interrupt-handlers/algorithm-invoke.ts`
- Delegates to: `BlackRoomOrchestrator.runAlgorithm()`
- Outcome: `continueLoop: true` (result merged back for final LLM summarization)
