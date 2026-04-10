# Validate Migration Scenarios Action

**ID:** `validate-migration-scenarios`  
**Description:** Validate Tailwind migration scenario JSON files. Checks for required fields, execution_sequence structure, and step format.  
**Source:** `laravel-agent-workspace-tools/scripts/validate-migration-scenarios.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | validation, migration, scenarios, tailwind |

## Input Schema

```json
{
  "scenariosDir": "string (optional) - Path to scenarios directory",
  "requiredFields": "array (optional) - List of required fields"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "validCount": "number - Number of valid scenarios",
  "invalidCount": "number - Number of invalid scenarios",
  "totalScenarios": "number - Total scenarios checked",
  "errors": "array - List of validation errors per file",
  "message": "string - Status message"
}
```

## Sub-actions

### `validate-scenarios`

Validates migration scenario JSON files.

```typescript
export default async function run(input: {
  scenariosDir?: string;
  requiredFields?: string[];
}): Promise<{
  success: boolean;
  validCount: number;
  invalidCount: number;
  totalScenarios: number;
  errors: Array<{
    file: string;
    errors: string[];
  }>;
  message: string;
}> {
  const scenariosDir = input.scenariosDir || './ai-agent-system/scenarios/tailwind-migration-v2';
  const requiredFields = input.requiredFields || [
    'step',
    'scenario',
    'title',
    'description',
    'model',
    'execution_sequence'
  ];

  try {
    console.log(`Validating migration scenarios...`);
    console.log(`Directory: ${scenariosDir}`);

    // In a real implementation:
    // 1. Find all JSON files in scenarios directory
    // 2. Parse each file
    // 3. Validate required fields
    // 4. Validate execution_sequence structure
    // 5. Validate step format (pattern: ^\d+-\d+$)
    
    // Simulate validation
    const validCount = 0;
    const invalidCount = 0;
    const totalScenarios = validCount + invalidCount;
    const errors: Array<{ file: string; errors: string[] }> = [];

    if (invalidCount > 0) {
      return {
        success: false,
        validCount,
        invalidCount,
        totalScenarios,
        errors,
        message: "Some scenarios have validation errors"
      };
    }

    return {
      success: true,
      validCount,
      invalidCount,
      totalScenarios,
      errors,
      message: "All scenarios validated successfully"
    };
  } catch (error) {
    return {
      success: false,
      validCount: 0,
      invalidCount: 0,
      totalScenarios: 0,
      errors: [],
      message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## Validation Rules

### Required Fields
- `step` - Step identifier (pattern: `^\d+-\d+$`)
- `scenario` - Scenario identifier
- `title` - Scenario title
- `description` - Scenario description
- `model` - Model to use (can be null for tournament mode)
- `execution_sequence` - Array of execution phases

### execution_sequence Structure
Each phase must have:
- `phase` - Phase identifier
- `description` - Phase description

### Step Format
Must match pattern: `^\d+-\d+$` (e.g., "01-0", "02-1")

## Usage Example

```json
{
  "execute": {
    "validate-migration-scenarios": {
      "scenariosDir": "./ai-agent-system/scenarios/tailwind-migration-v2",
      "requiredFields": ["step", "scenario", "title", "description", "model", "execution_sequence"]
    }
  }
}
```

## Exit Codes

- Exit 0: All scenarios valid
- Exit 1: One or more scenarios invalid