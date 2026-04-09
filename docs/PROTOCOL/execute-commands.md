# Execute Commands

Execute commands are used by the server to instruct the client to perform specific actions. They follow the action-key shape format: `{ execute: { "action-type": { ...params } } }`.

## Available Execute Command Types

### Form
Interactive form with choices and/or input fields.

#### Fields
- **title** (string, optional): Form title
- **description** (string, optional): Form description
- **choices** (Array<{ id: string; label: string }>, optional): Selectable choices
- **input** (Array, optional): Input fields array
  - **id** (string): Field identifier
  - **label** (string): Field label
  - **type** ('text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio'): Input type
  - **required** (boolean, optional): Whether field is required
  - **placeholder** (string, optional): Placeholder text
  - **options** (Array<{ label: string; value: string }>, optional): Options for select/radio/checkbox types

### Script
Execute DSL code on the client.

#### Fields
- **input** (Record<string, unknown>): Input data for the script
- **output** (string): Name of the output variable to return
- **code** (string): The script code to execute

### Read-file
Read contents of a file.

#### Fields
- **path** (string): File path to read
- **startLine** (number, optional): Starting line number (1-indexed)
- **endLine** (number, optional): Ending line number (1-indexed, inclusive)

### Write-file
Write content to a file.

#### Fields
- **path** (string): File path to write
- **content** (string): Content to write to the file

### RAG-search
Perform a RAG (Retrieval-Augmented Generation) search.

#### Fields
- **query** (string): Search query
- **limit** (number, optional): Maximum number of results to return

### Execute-command
Execute a shell command.

#### Fields
- **command** (string): Command to execute
- **cwd** (string, optional): Working directory for command execution
- **timeout** (number, optional): Timeout in milliseconds

### List-directory
List contents of a directory.

#### Fields
- **path** (string): Directory path to list

### Grep-search
Search for a pattern in files.

#### Fields
- **pattern** (string): Regex pattern to search for
- **path** (string, optional): Directory or file path to search in
- **glob** (string, optional): Glob pattern for file matching

## Usage

Execute commands are included in ServerMessage.execute field using the action-key shape:
```typescript
{
  execute: {
    "read-file": {
      "path": "src/components/Button.tsx",
      "startLine": 1,
      "endLine": 10
    }
  }
}
```