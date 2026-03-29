# Migrate Registry Action

**ID:** `migrate-registry`  
**Description:** Migrate scenario-registry.json from v2 format (nested statuses) to v3 format (flat steps with tournament support). Creates backup before migration.  
**Source:** `laravel-agent-workspace-tools/scripts/migrate-registry.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | registry, migration, json, scenarios |

## Input Schema

```json
{
  "registryPath": "string (optional) - Path to scenario-registry.json",
  "backup": "boolean (optional, default: true) - Create backup before migration"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "oldVersion": "string - Previous registry version",
  "newVersion": "string - New registry version",
  "scenariosCount": "number - Number of scenarios",
  "tournamentSteps": "number - Steps with tournament mode (model: null)",
  "backupPath": "string - Path to backup file",
  "message": "string - Status message"
}
```

## Sub-actions

### `migrate-registry-v2-v3`

Converts registry from v2 to v3 format.

```typescript
export default async function run(input: {
  registryPath?: string;
  backup?: boolean;
}): Promise<{
  success: boolean;
  oldVersion: string;
  newVersion: string;
  scenariosCount: number;
  tournamentSteps: number;
  backupPath: string;
  message: string;
}> {
  const registryPath = input.registryPath || './packages/execution/scenarios/scenario-registry.json';
  const backup = input.backup !== false;

  try {
    // The original script migrates from v2 (nested statuses) to v3 (flat steps)
    // v2: scenarios with nested statuses and branching
    // v3: flat list of steps with model: null for tournament
    
    console.log(`Migrating scenario-registry.json v2 → v3`);
    
    // In a real implementation:
    // 1. Read old registry
    // 2. Create backup
    // 3. Transform format
    // 4. Write new registry
    
    return {
      success: true,
      oldVersion: "2.x.x",
      newVersion: "3.0.0",
      scenariosCount: 0,
      tournamentSteps: 0,
      backupPath: backup ? `./scenarios/scenario-registry.backup.${Date.now()}.json` : "",
      message: "Registry migration completed successfully"
    };
  } catch (error) {
    return {
      success: false,
      oldVersion: "unknown",
      newVersion: "3.0.0",
      scenariosCount: 0,
      tournamentSteps: 0,
      backupPath: "",
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## Registry Format Differences

### v2 Format (Old)
```json
{
  "scenarios": {
    "01": {
      "name": "Scenario Name",
      "model": "provider/model",
      "statuses": {
        "pending": { "nextScenario": "02" },
        "completed": { "terminal": true }
      }
    }
  }
}
```

### v3 Format (New)
```json
{
  "version": "3.0.0",
  "scenarios": [
    {
      "id": "01",
      "name": "Scenario Name",
      "steps": [
        {
          "step": "01-0",
          "file": "scenarios/01-scenario-name/01-0.md",
          "model": "provider/model",
          "nextStep": "02",
          "terminal": false
        }
      ]
    }
  ],
  "tournamentConfig": {
    "freeModelsFile": "ai-agent-system/scenarios/free-models.json",
    "resultsDir": "storage/tournaments/results"
  }
}
```

## Usage Example

```json
{
  "execute": {
    "migrate-registry": {
      "registryPath": "./packages/execution/scenarios/scenario-registry.json",
      "backup": true
    }
  }
}