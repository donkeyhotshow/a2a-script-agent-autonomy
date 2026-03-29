# Migrate Vue Components Action

**ID:** `migrate-vue-components`  
**Description:** Migrate Vue.js components and TypeScript files. Handles Vue components, TypeScript, composables, stores, services with validation and categorization.  
**Source:** `laravel-agent-workspace-tools/scripts/migrate-vue-components.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | vue, typescript, migration, components |

## Input Schema

```json
{
  "sourceDir": "string (required) - Source directory containing Vue/TS files",
  "targetSystem": "string (optional) - Target system identifier",
  "taskId": "string (optional) - Task ID for tracking",
  "backup": "boolean (optional, default: true) - Create backup before migration",
  "dryRun": "boolean (optional, default: false) - Simulate without actual migration"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "migratedFiles": "number - Total files migrated",
  "vueCategories": "object - Vue files by category",
  "tsCategories": "object - TypeScript files by category",
  "scopedComponents": "number - Components with scoped styles",
  "message": "string - Status message"
}
```

## Sub-actions

### `scan-vue-files`

Scans Vue and TypeScript files for migration.

```typescript
export default async function run(input: {
  sourceDir: string;
  targetSystem?: string;
  taskId?: string;
  backup?: boolean;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  migratedFiles: number;
  vueCategories: {
    pages: number;
    components: number;
    layouts: number;
    other: number;
  };
  tsCategories: {
    composables: number;
    types: number;
    stores: number;
    utils: number;
    services: number;
    other: number;
  };
  scopedComponents: number;
  message: string;
}> {
  const {
    sourceDir,
    targetSystem = "default",
    taskId,
    backup = true,
    dryRun = false
  } = input;

  if (!sourceDir) {
    return {
      success: false,
      migratedFiles: 0,
      vueCategories: { pages: 0, components: 0, layouts: 0, other: 0 },
      tsCategories: { composables: 0, types: 0, stores: 0, utils: 0, services: 0, other: 0 },
      scopedComponents: 0,
      message: "sourceDir is required"
    };
  }

  try {
    console.log(`Starting Vue components migration...`);
    console.log(`Source: ${sourceDir}`);
    console.log(`Dry run: ${dryRun}`);

    // In a real implementation:
    // 1. Scan Vue files (.vue)
    // 2. Scan TypeScript files (.ts, .tsx)
    // 3. Categorize Vue files (pages, components, layouts)
    // 4. Categorize TS files (composables, types, stores, etc.)
    // 5. Validate TypeScript syntax
    // 6. Analyze scoped styles
    // 7. Perform migration

    return {
      success: true,
      migratedFiles: 0,
      vueCategories: { pages: 0, components: 0, layouts: 0, other: 0 },
      tsCategories: { composables: 0, types: 0, stores: 0, utils: 0, services: 0, other: 0 },
      scopedComponents: 0,
      message: dryRun ? "Dry run completed" : "Vue migration completed"
    };
  } catch (error) {
    return {
      success: false,
      migratedFiles: 0,
      vueCategories: { pages: 0, components: 0, layouts: 0, other: 0 },
      tsCategories: { composables: 0, types: 0, stores: 0, utils: 0, services: 0, other: 0 },
      scopedComponents: 0,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
```

## Vue File Categories

| Category | Path Pattern |
|----------|--------------|
| pages | `/pages/` or `/views/` |
| components | `/components/` |
| layouts | `/layouts/` |

## TypeScript File Categories

| Category | Path/File Pattern |
|----------|-------------------|
| composables | `/composables/` or `*composable*` |
| types | `/types/` or `*.d.ts` or `*types*` |
| stores | `/stores/` or `*store*` |
| utils | `/utils/` or `/helpers/` or `*util*` |
| services | `/services/` or `*service*` |

## Usage Example

```json
{
  "execute": {
    "migrate-vue-components": {
      "sourceDir": "./resources/js/",
      "targetSystem": "laravel-vite",
      "taskId": "task-003",
      "backup": true,
      "dryRun": true
    }
  }
}