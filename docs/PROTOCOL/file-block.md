# FileBlock

The FileBlock object represents a file with its content and optional line range information.

## Fields

### path
- **Type**: `string`
- **Description**: File path (absolute or relative to project root)
- **Usage**: Identifies which file the block represents

### content
- **Type**: `string`
- **Description**: File content as a string
- **Usage**: Contains the actual file data being transmitted

### startLine
- **Type**: `number` (optional)
- **Description**: Starting line number (1-indexed) if representing a portion of the file
- **Usage**: Used when transmitting only a specific range of lines from a file

### endLine
- **Type**: `number` (optional)
- **Description**: Ending line number (1-indexed, inclusive) if representing a portion of the file
- **Usage**: Used when transmitting only a specific range of lines from a file

## Usage

FileBlock objects are typically found in:
- ClientMessage.files array
- ServerMessage.files array
- Used for transmitting file content between client and server

FileBlockRequest is used when requesting specific portions of files.

## Example

Full file:
```typescript
{
  path: "src/components/Button.tsx",
  content: "import React from 'react';\n\nexport default function Button() {\n  return <button>Click me</button>;\n}"
}
```

File portion (lines 10-20):
```typescript
{
  path: "src/components/Button.tsx",
  content: "  return <button>Click me</button>;\n}\n\nexport default Button;",
  startLine: 10,
  endLine: 20
}
```