# VueFlow Tests TODO

## Unit Tests (jest/vitest)

### 1. nodes.test.js - Custom Node Tests
- [ ] Test TaskInputNode renders correctly
- [ ] Test ActionProposalNode renders with subActions
- [ ] Test SubActionNode displays DSL/script
- [ ] Test ResultNode shows success/error state
- [ ] Test ActionCompleteNode shows summary stats

### 2. protocol.test.js - Protocol Mapping Tests
- [ ] Test mapSimulationResponseToFlow() with action_proposal
- [ ] Test mapSimulationResponseToFlow() with action_executing
- [ ] Test mapSimulationResponseToFlow() with action_complete
- [ ] Test edge creation between nodes
- [ ] Test animated edges for running steps

### 3. flow-manager.test.js - A2AFlowManager Tests
- [ ] Test init() creates VueFlow instance
- [ ] Test addTask() adds task node
- [ ] Test loadContext() updates flow
- [ ] Test zoomIn/zoomOut/fitView methods
- [ ] Test clear() removes all nodes

## Integration Tests

### 4. web-app.test.js - Updated Tests
- [ ] Test index.html contains VueFlow scripts
- [ ] Test flow-container exists in layout
- [ ] Test sessions.js integrates with flow

## Test Stubs - nodes.test.js
```
javascript
// TODO: Implement node rendering tests
describe('VueFlow Nodes', () => {
  it('should render TaskInputNode', () => {
    // Stub: Test TaskInputNode component
  });
  
  it('should render ActionProposalNode with subActions', () => {
    // Stub: Test ActionProposalNode with subActions list
  });
  
  it('should render SubActionNode with DSL', () => {
    // Stub: Test SubActionNode displays script/input/output
  });
  
  it('should render ResultNode with status', () => {
    // Stub: Test ResultNode shows success/failure
  });
  
  it('should render ActionCompleteNode with summary', () => {
    // Stub: Test ActionCompleteNode shows stats
  });
});
```

## Test Stubs - protocol.test.js
```
javascript
// TODO: Implement protocol mapping tests
describe('Protocol Mapping', () => {
  it('should map action_proposal to nodes', () => {
    // Stub: Test outcome='action_proposal' mapping
  });
  
  it('should map action_executing to nodes', () => {
    // Stub: Test outcome='action_executing' with executingAction
  });
  
  it('should map action_complete to nodes', () => {
    // Stub: Test outcome='action_complete' with finalResult
  });
  
  it('should create edges between nodes', () => {
    // Stub: Test edge creation from task→proposal→execute→complete
  });
  
  it('should animate running step edge', () => {
    // Stub: Test animated edge for current step
  });
});
```

## Test Stubs - flow-manager.test.js
```
javascript
// TODO: Implement flow manager tests
describe('A2AFlowManager', () => {
  it('should initialize VueFlow', () => {
    // Stub: Test VueFlow instance creation
  });
  
  it('should add task node', () => {
    // Stub: Test addTask() method
  });
  
  it('should load context from response', () => {
    // Stub: Test loadContext() with simulation data
  });
  
  it('should clear flow', () => {
    // Stub: Test clear() removes all nodes/edges
  });
  
  it('should handle zoom controls', () => {
    // Stub: Test zoomIn, zoomOut, fitView
  });
});
