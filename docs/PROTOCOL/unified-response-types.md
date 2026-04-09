# Unified Response Types

The unified response types provide a standardized format for all responses in the A2A system, enabling consistent handling across different response types and improving client integration.

## ResponseType

Enumeration of all possible unified response types.

### Values

#### action_proposal
- **Description**: Server proposes actions for client execution
- **Usage**: Initial response when server determines what actions to take
- **Client Action**: Review and potentially modify proposed actions

#### action_executing
- **Description**: Server is currently executing an action
- **Usage**: Progress updates during action execution
- **Client Action**: Display progress or wait for completion

#### action_progress
- **Description**: Progress update for ongoing action execution
- **Usage**: Detailed progress information during long-running tasks
- **Client Action**: Update progress indicators

#### action_completed
- **Description**: Action execution has completed successfully
- **Usage**: Final result of successful action execution
- **Client Action**: Process results and continue workflow

#### action_error
- **Description**: Action execution failed with an error
- **Usage**: Error reporting and handling
- **Client Action**: Handle error, potentially retry or inform user

## BaseResponse

Common fields shared by all unified responses.

### Fields

#### success
- **Type**: `boolean`
- **Description**: Overall success status of the operation
- **Usage**: Quick determination of response outcome
- **Service Responsibility**: Set based on operation success

#### timestamp
- **Type**: `string`
- **Description**: ISO timestamp when response was generated
- **Usage**: Response timing and debugging
- **Service Responsibility**: Auto-generated on response creation

## ActionProposalResponse

Response sent when server proposes actions to the client.

### Fields

#### type
- **Type**: `'action_proposal'`
- **Description**: Response type identifier
- **Usage**: Type discrimination in union types

#### result
- **Type**: `ActionProposalResult`
- **Description**: Action proposal data and context
- **Usage**: Contains proposed actions and supporting information

### ActionProposalResult

Data structure for action proposals.

#### Fields

##### context
- **Type**: `ContextBlock`
- **Description**: Updated context block for the next iteration
- **Usage**: Maintains state across proposal and execution phases

##### fallbackActions
- **Type**: `FallbackAction[]` (optional)
- **Description**: Alternative actions if primary proposals fail
- **Usage**: Error recovery and alternative execution paths

## ActionExecutingResponse

Response sent when server begins executing an action.

### Fields

#### type
- **Type**: `'action_executing'`
- **Description**: Response type identifier

#### result
- **Type**: `ActionExecutingResult`
- **Description**: Execution state and next steps information

### ActionExecutingResult

Data structure for action execution state.

#### Fields

##### executingAction
- **Type**: `Action`
- **Description**: The action currently being executed
- **Usage**: Client can display current action information

##### nextSteps
- **Type**: `Action[]`
- **Description**: Upcoming actions in the execution pipeline
- **Usage**: Client can show execution queue or plan

## ActionProgressResponse

Response sent during action execution to report progress.

### Fields

#### type
- **Type**: `'action_progress'`
- **Description**: Response type identifier

#### result
- **Type**: `ActionProgressResult`
- **Description**: Detailed progress information

### ActionProgressResult

Detailed progress update structure.

#### Fields

##### actionId
- **Type**: `string`
- **Description**: Identifier of the action being executed
- **Usage**: Associate progress with specific action

##### currentStep
- **Type**: `object`
- **Description**: Current execution step details
- **Properties**:
  - **id**: `string` - Step identifier
  - **title**: `string` - Human-readable step name
  - **code**: `string` (optional) - Code or script being executed
  - **progress**: `number` - Step completion percentage (0-100)

##### completedSteps
- **Type**: `string[]`
- **Description**: IDs of steps that have been completed
- **Usage**: Track overall progress through step sequence

##### remainingSteps
- **Type**: `string[]`
- **Description**: IDs of steps yet to be executed
- **Usage**: Show upcoming work and estimated completion

##### message
- **Type**: `string` (optional)
- **Description**: Human-readable progress message
- **Usage**: Provide additional context or status information

## ActionCompletedResponse

Response sent when action execution completes successfully.

### Fields

#### type
- **Type**: `'action_completed'`
- **Description**: Response type identifier

#### result
- **Type**: `ActionCompletedResult`
- **Description**: Completion results and metadata

### ActionCompletedResult

Successful completion result structure.

#### Fields

##### actionId
- **Type**: `string`
- **Description**: Identifier of the completed action

##### summary
- **Type**: `string`
- **Description**: Human-readable summary of what was accomplished
- **Usage**: Display to user or log for auditing

##### output
- **Type**: `unknown` (optional)
- **Description**: Structured output data from the action
- **Usage**: Pass results to next processing steps

##### filesModified
- **Type**: `string[]` (optional)
- **Description**: List of files that were modified during execution
- **Usage**: Track changes and trigger dependent processes

##### executionTimeMs
- **Type**: `number` (optional)
- **Description**: Total execution time in milliseconds
- **Usage**: Performance monitoring and optimization

## ActionErrorResponse

Response sent when action execution fails.

### Fields

#### type
- **Type**: `'action_error'`
- **Description**: Response type identifier

#### result
- **Type**: `ActionErrorResult`
- **Description**: Error details and recovery information

### ActionErrorResult

Error result structure with recovery options.

#### Fields

##### actionId
- **Type**: `string`
- **Description**: Identifier of the failed action

##### error
- **Type**: `ActionError`
- **Description**: Structured error information

##### failedStep
- **Type**: `string` (optional)
- **Description**: Identifier of the step where failure occurred
- **Usage**: Pinpoint exact failure location

##### canRetry
- **Type**: `boolean`
- **Description**: Whether the action can be retried
- **Usage**: Client decision on retry vs. alternative actions

## Action

Common action structure used across response types.

### Fields

#### id
- **Type**: `string`
- **Description**: Unique action identifier

#### name
- **Type**: `string`
- **Description**: Human-readable action name

#### description
- **Type**: `string` (optional)
- **Description**: Detailed action description

#### priority
- **Type**: `number` (optional)
- **Description**: Action priority for ordering (higher numbers = higher priority)

#### dsl
- **Type**: `Record<string, unknown>` (optional)
- **Description**: Domain-specific language definition for action execution

## ActionError

Structured error information for action failures.

### Fields

#### code
- **Type**: `string`
- **Description**: Machine-readable error code

#### message
- **Type**: `string`
- **Description**: Human-readable error message

#### details
- **Type**: `Record<string, unknown>` (optional)
- **Description**: Additional error context and debugging information

#### stack
- **Type**: `string` (optional)
- **Description**: Stack trace for debugging (sanitized in production)

## FallbackAction

Alternative action for error recovery scenarios.

### Fields

#### id
- **Type**: `string`
- **Description**: Unique fallback action identifier

#### name
- **Type**: `string`
- **Description**: Human-readable fallback action name

#### description
- **Type**: `string` (optional)
- **Description**: Explanation of when and why to use this fallback

#### reason
- **Type**: `string` (optional)
- **Description**: Reason why primary action failed, justifying this fallback

## Usage Patterns

### Action Proposal Flow
```typescript
// Server proposes action
{
  type: 'action_proposal',
  success: true,
  timestamp: '2024-01-01T00:00:00Z',
  result: {
    context: { /* updated context */ },
    fallbackActions: [
      {
        id: 'fallback-1',
        name: 'Alternative Approach',
        reason: 'Primary method unavailable'
      }
    ]
  }
}

// Client acknowledges and server begins execution
{
  type: 'action_executing',
  success: true,
  timestamp: '2024-01-01T00:00:01Z',
  result: {
    executingAction: {
      id: 'action-1',
      name: 'Process Data',
      description: 'Transform input data'
    },
    nextSteps: [
      { id: 'step-2', name: 'Validate Results' }
    ]
  }
}
```

### Progress Updates
```typescript
{
  type: 'action_progress',
  success: true,
  timestamp: '2024-01-01T00:00:02Z',
  result: {
    actionId: 'action-1',
    currentStep: {
      id: 'step-1',
      title: 'Data Processing',
      progress: 75
    },
    completedSteps: ['step-1'],
    remainingSteps: ['step-2', 'step-3'],
    message: 'Processing record 750 of 1000'
  }
}
```

### Completion
```typescript
{
  type: 'action_completed',
  success: true,
  timestamp: '2024-01-01T00:00:05Z',
  result: {
    actionId: 'action-1',
    summary: 'Successfully processed 1000 records',
    output: { processedCount: 1000, errors: 0 },
    filesModified: ['data/output.json'],
    executionTimeMs: 4000
  }
}
```

### Error Handling
```typescript
{
  type: 'action_error',
  success: false,
  timestamp: '2024-01-01T00:00:03Z',
  result: {
    actionId: 'action-1',
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data format in input file',
      details: { field: 'email', reason: 'Invalid format' }
    },
    failedStep: 'step-1',
    canRetry: true
  }
}
```

## Service Responsibilities

- **Action Coordinator**: Determines response types and orchestrates flow
- **Progress Tracker**: Generates progress updates with accurate timing
- **Error Handler**: Converts exceptions to structured ActionError format
- **State Manager**: Maintains execution context across response sequence
- **Result Processor**: Structures completion results and metadata

## Client Integration

Clients should implement:

1. **Type Guards**: Use provided type guard functions for safe type checking
2. **State Management**: Track action execution state across response sequence
3. **Progress Display**: Show appropriate UI for each response type
4. **Error Recovery**: Handle errors and implement retry logic where `canRetry` is true
5. **Context Updates**: Apply context changes from each response