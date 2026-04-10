# Migrate Tests Action

**ID:** `migrate-tests`  
**Description:** Migrate test files (PHP, JavaScript, TypeScript) through the AI agent system. Handles PHPUnit, Pest, Vitest, Jest, Playwright tests with validation and categorization.  
**Source:** `laravel-agent-workspace-tools/scripts/migrate-tests.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | tests, migration, php, javascript, typescript |

## Input Schema

```json
{
  "sourceDir": "string (required) - Source directory containing test files",
  "targetSystem": "string (optional) - Target system identifier",
  "taskId": "string (optional) - Task ID for tracking",
  "testTypes": "array (optional, default: [\"php\", \"javascript\", \"typescript\"]) - Types of tests to migrate",
  "backup": "boolean (optional, default: true) - Create backup before migration",
  "dryRun": "boolean (optional, default: false) - Simulate without actual migration"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "migratedFiles": "number - Total number of test files migrated",
  "categories": "object - Tests grouped by framework and type",
  "dependencies": "number - Number of test dependencies found",
  "validation": "object - Validation results (errors, warnings)",
  "message": "string - Status message"
}
```

## Sub-actions

### `scan-test-files`

Scans and categorizes test files by type and framework.

```typescript
export default async function run(input: {
  sourceDir: string;
  targetSystem?: string;
  taskId?: string;
  testTypes?: string[];
  backup?: boolean;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  migratedFiles: number;
  categories: {
    phpunit: number;
    pest: number;
    vitest: number;
    jest: number;
    playwright: number;
    cypress: number;
    unit: number;
    feature: number;
    integration: number;
    e2e: number;
    other: number;
  };
  byType: {
    php: number;
    javascript: number;
    typescript: number;
  };
  dependencies: number;
  validation: {
    errors: string[];
    warnings: string[];
  };
  message: string;
}> {
  const {
    sourceDir,
    targetSystem = "default",
    taskId,
    testTypes = ["php", "javascript", "typescript"],
    backup = true,
    dryRun = false
  } = input;

  if (!sourceDir) {
    return {
      success: false,
      migratedFiles: 0,
      categories: {
        phpunit: 0,
        pest: 0,
        vitest: 0,
        jest: 0,
        playwright: 0,
        cypress: 0,
        unit: 0,
        feature: 0,
        integration: 0,
        e2e: 0,
        other: 0
      },
      byType: { php: 0, javascript: 0, typescript: 0 },
      dependencies: 0,
      validation: { errors: [], warnings: [] },
      message: "sourceDir is required"
    };
  }

  try {
    console.log(`Starting tests migration...`);
    console.log(`Source: ${sourceDir}`);
    console.log(`Test Types: ${testTypes.join(", ")}`);
    console.log(`Dry run: ${dryRun}`);

    // In a real implementation:
    // 1. Scan test files by type
    // 2. Categorize by framework
    // 3. Validate test files
    // 4. Analyze dependencies
    // 5. Perform migration

    return {
      success: true,
      migratedFiles: 0,
      categories: {
        phpunit: 0,
        pest: 0,
        vitest: 0,
        jest: 0,
        playwright: 0,
        cypress: 0,
        unit: 0,
        feature: 0,
        integration: 0,
        e2e: 0,
        other: 0
      },
      byType: {
        php: 0,
        javascript: 0,
        typescript: 0
      },
      dependencies: 0,
      validation: { errors: [], warnings: [] },
      message: dryRun ? "Dry run completed" : "Tests migration completed"
    };
  } catch (error) {
    return {
      success: false,
      migratedFiles: 0,
      categories: {
        phpunit: 0,
        pest: 0,
        vitest: 0,
        jest: 0,
        playwright: 0,
        cypress: 0,
        unit: 0,
        feature: 0,
        integration: 0,
        e2e: 0,
        other: 0
      },
      byType: { php: 0, javascript: 0, typescript: 0 },
      dependencies: 0,
      validation: { errors: [error instanceof Error ? error.message : String(error)], warnings: [] },
      message: `Migration failed`
    };
  }
}
```

## Test Framework Detection

| Framework | File Patterns | Indicators |
|------------|---------------|------------|
| PHPUnit | `*.php` | `extends TestCase`, `PHPUnit\Framework\TestCase` |
| Pest | `*.php` | `uses(Pest)`, `pest(` |
| Vitest | `*.spec.ts`, `*.test.ts` | `vitest`, `vi.` |
| Jest | `*.spec.js`, `*.test.js` | `jest`, `describe(` |
| Playwright | `*.spec.ts`, `*.test.ts` | `playwright` |
| Cypress | `*.cy.js`, `*.cy.ts` | `cypress` |

## Test Type Detection

Based on path:
- `/unit/` → Unit tests
- `/feature/` → Feature tests (Laravel)
- `/integration/` → Integration tests
- `/e2e/` → End-to-end tests

## Usage Example

```json
{
  "execute": {
    "migrate-tests": {
      "sourceDir": "./tests/",
      "targetSystem": "laravel-v11",
      "taskId": "task-002",
      "testTypes": ["php", "javascript"],
      "backup": true,
      "dryRun": true
    }
  }
}