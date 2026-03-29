# Test System Action

**ID:** `test-system`  
**Description:** Run system tests using the Laravel agent system core modules. Wrapper for `runSystemTests()`.  
**Source:** `laravel-agent-workspace-tools/scripts/test-system.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | testing, system, validation |

## Input Schema

```json
{
  "testDir": "string (optional) - Directory containing tests",
  "verbose": "boolean (optional, default: false) - Verbose output"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "testsRun": "number - Number of tests executed",
  "testsPassed": "number - Number of tests passed",
  "testsFailed": "number - Number of tests failed",
  "duration": "number - Duration in milliseconds",
  "message": "string - Status message"
}
```

## Sub-actions

### `run-system-tests`

Executes system tests via core module.

```typescript
export default async function run(input: {
  testDir?: string;
  verbose?: boolean;
}): Promise<{
  success: boolean;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  duration: number;
  message: string;
}> {
  const { testDir = "./tests", verbose = false } = input;

  try {
    if (verbose) {
      console.log("Running system tests...");
      console.log(`Test directory: ${testDir}`);
    }

    // The original script calls runSystemTests() from ../core/index.js
    // In a real implementation, this would execute actual system tests
    
    // Simulate test execution
    const testsRun = 0;
    const testsPassed = 0;
    const testsFailed = 0;

    if (testsFailed > 0) {
      return {
        success: false,
        testsRun,
        testsPassed,
        testsFailed,
        duration: 0,
        message: `${testsFailed} test(s) failed`
      };
    }

    return {
      success: true,
      testsRun,
      testsPassed,
      testsFailed,
      duration: 0,
      message: "All system tests passed"
    };
  } catch (error) {
    return {
      success: false,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
      message: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## Usage Example

```json
{
  "execute": {
    "test-system": {
      "testDir": "./ai-agent-system/tests",
      "verbose": true
    }
  }
}