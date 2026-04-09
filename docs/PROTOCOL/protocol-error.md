# ProtocolError

The ProtocolError object represents an error encountered during protocol processing.

## Fields

### code
- **Type**: `string`
- **Description**: Error code identifier for categorizing the error
- **Usage**: Used for programmatic error handling and error type identification

### message
- **Type**: `string`
- **Description**: Human-readable error message describing what went wrong
- **Usage**: Displayed to users or logged for debugging purposes

### file
- **Type**: `string` (optional)
- **Description**: File path where the error occurred (if applicable)
- **Usage**: Helps with debugging by indicating the source location

### line
- **Type**: `number` (optional)
- **Description**: Line number where the error occurred (if applicable)
- **Usage**: Used in conjunction with file for precise error location

## Usage

ProtocolError objects are typically found in:
- ContextBlock.errors array
- Used for error reporting and handling throughout the protocol

## Example

```typescript
{
  code: "VALIDATION_ERROR",
  message: "Invalid context block structure",
  file: "src/types/index.ts",
  line: 45
}
```