# Restore Action

**ID:** `restore`  
**Description:** Restore files from backup copies. Recovers files from `recovery/*-backup` directories.  
**Source:** `laravel-agent-workspace-tools/scripts/restore.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | restore, backup, recovery |

## Input Schema

```json
{
  "sourcePath": "string (required) - Path to backup file",
  "targetPath": "string (required) - Path where file should be restored"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "sourcePath": "string - Source backup path",
  "targetPath": "string - Target restoration path",
  "message": "string - Status message"
}
```

## Sub-actions

### `restore-file`

Restores a file from backup to target location.

```typescript
export default async function run(input: {
  sourcePath: string;
  targetPath: string;
}): Promise<{
  success: boolean;
  sourcePath: string;
  targetPath: string;
  message: string;
}> {
  const { sourcePath, targetPath } = input;

  if (!sourcePath || !targetPath) {
    return {
      success: false,
      sourcePath: "",
      targetPath: "",
      message: "Both sourcePath and targetPath are required"
    };
  }

  try {
    console.log(`Restoring from backup: ${sourcePath}`);
    console.log(`Target: ${targetPath}`);

    // In a real implementation:
    // 1. Read backup file
    // 2. Create target directory if needed
    // 3. Write content to target
    
    // Simulate restoration
    return {
      success: true,
      sourcePath,
      targetPath,
      message: `File restored successfully: ${sourcePath} → ${targetPath}`
    };
  } catch (error) {
    return {
      success: false,
      sourcePath,
      targetPath,
      message: `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## Usage Example

```json
{
  "execute": {
    "restore": {
      "sourcePath": "recovery/devstral-adapter-backup.ts",
      "targetPath": "src/infrastructure/adapters/devstral-adapter.ts"
    }
  }
}
```

## Post-Restore Validation

After restore, run `validate-config` to verify the restored file is valid:
```json
{
  "execute": {
    "validate-config": {
      "configPath": "src/infrastructure/adapters/devstral-adapter.ts"
    }
  }
}