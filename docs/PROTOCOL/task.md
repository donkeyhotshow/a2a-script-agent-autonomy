# Task

The Task object represents a unit of work to be processed in the A2A protocol system.

## Fields

### id
- **Type**: `string`
- **Description**: Unique identifier for the task
- **Usage**: Used to track task progress and status across iterations

### type
- **Type**: `TaskType` ('analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete')
- **Description**: The type of operation to be performed
- **Values**:
  - 'analyze': Analysis tasks (code review, architecture analysis, etc.)
  - 'refactor': Code refactoring tasks
  - 'test': Test creation and execution tasks
  - 'document': Documentation generation tasks
  - 'fix': Bug fixing tasks
  - 'create': Creating new files or features
  - 'delete': Removing files or code

### status
- **Type**: `TaskStatus` ('pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled')
- **Description**: Current status of the task
- **Values**:
  - 'pending': Task is waiting to be processed
  - 'in_progress': Task is currently being worked on
  - 'completed': Task has been successfully finished
  - 'failed': Task encountered an error and did not complete
  - 'cancelled': Task was cancelled before completion

### target
- **Type**: `string` (optional)
- **Description**: Target identifier for the task (e.g., file path, function name, component identifier)

### progress
- **Type**: `number` (optional)
- **Description**: Progress percentage of the task (0-100)
- **Usage**: Used for long-running tasks to provide feedback on completion status

## Usage

Task objects are typically found in:
- ContextBlock.tasks array
- RequestContextBlock.tasks array
- Used by the request processor to track work items

## Example

```typescript
{
  id: "task-123",
  type: "fix",
  status: "in_progress",
  target: "src/components/Button.tsx",
  progress: 75
}
```