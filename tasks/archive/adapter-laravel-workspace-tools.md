# Task: Adapt laravel-agent-workspace-tools scripts to a2a-server actions

**Priority:** High

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-2\laravel-agent-workspace-tools\scripts\`

**Scripts (16):** Laravel-specific

---

## Analysis Results

### Category 1: Validation Scripts (3 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `architecture-validator.js` | Validates architectural dependency rules between layers | `validate-architecture` → uses JSON config for layer rules, file glob patterns |
| `validate-config.js` | Configuration validation | `validate-config` → reads JSON config, validates structure |
| `validate-migration-scenarios.js` | Validates Tailwind migration scenarios | `validate-migration-scenarios` → validates JSON structure |

**Action Definition Pattern:**
```yaml
execute:
  script:
    scriptId: "validate-architecture"
    params:
      configPath: "./config/architecture-rules.json"
      targetDir: "${targetDir}"
```

### Category 2: Migration Scripts (4 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `migrate-php-components.js` | Migrates PHP business logic (Services, Models, Controllers) | `migrate-php-components` |
| `migrate-vue-components.js` | Migrates Vue.js components | `migrate-vue-components` |
| `migrate-registry.js` | Registry migration | `migrate-registry` |
| `migrate-tests.js` | Test migration | `migrate-tests` |

**Action Definition Pattern:**
```yaml
execute:
  script:
    scriptId: "migrate-php-components"
    params:
      sourceDir: "${sourceDir}"
      targetSystem: "${targetSystem}"
      taskId: "${taskId}"
      dryRun: "${dryRun}"
```

### Category 3: Patch Generation (3 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `batch-generate-patches.js` | Batch generates patches for Vue components via LLM | `batch-generate-patches` |
| `fast-patch.js` | Processes approved tickets, calls LLM for patches | `process-fast-patch` |
| `process-response-patches.js` | Processes response patches | `process-response-patches` |

**Action Definition Pattern:**
```yaml
execute:
  script:
    scriptId: "batch-generate-patches"
    params:
      inventoryPath: "migration-inventory.json"
      model: "stepfun/step-3.5-flash:free"
```

### Category 4: Utility Scripts (6 scripts)

| Script | Functionality | a2a-server Action Pattern |
|--------|--------------|--------------------------|
| `cli-hub.js` | CLI hub interface | N/A - wrapper only |
| `list-tickets.js` | List tickets | N/A - minimal |
| `restore.js` | Restore from backup | `restore-backup` |
| `test-system.js` | Test system | N/A - minimal |
| `migration-inventory.json` | Data file | Use as input |
| `models-config.example.json` | Data file | Use as template |

---

## Action Definitions to Create

### Priority 1: Validation Actions (High Value)

1. **`validate-architecture`** - Architecture validation
   - Input: `configPath`, `targetDir`
   - Output: JSON with violations array
   - Handler: `architecture-validator.js` logic

2. **`validate-config`** - Config file validation
   - Input: `configPath`
   - Output: Validation result

3. **`validate-migration-scenarios`** - Migration scenario validation
   - Input: `scenariosDir`
   - Output: Valid/invalid counts, errors array

### Priority 2: Migration Actions (High Value)

4. **`migrate-php-components`** - PHP component migration
   - Input: `sourceDir`, `targetSystem`, `taskId`, `backup`, `dryRun`
   - Output: Migration result with files created

5. **`migrate-vue-components`** - Vue component migration
   - Input: `sourceDir`, `targetSystem`, `taskId`, `backup`, `dryRun`
   - Output: Migration result with files created

6. **`migrate-registry`** - Registry migration
   - Input: Registry config
   - Output: Migration result

### Priority 3: Patch Actions (Medium Value)

7. **`batch-generate-patches`** - Batch patch generation
   - Input: `inventoryPath`, `model`
   - Output: Patches array

8. **`process-fast-patch`** - Fast patch processing
   - Input: `ticketDir`, `model`
   - Output: Processed tickets

---

## Implementation Notes

### Script Handler Location
Actions can use `run-script` handler with predefined script IDs:
- Action definitions in `a2a-server/src/actions/definitions/yaml/actions/`
- Scripts placed in accessible location (shared or project-specific)

### Parameters Standardization
All scripts accept these standard parameters:
- `sourceDir` - Source directory path
- `targetDir` - Target directory path  
- `dryRun` - Boolean for dry run mode
- `backup` - Boolean for backup creation
- `taskId` - Optional task tracking ID

### Cross-Reference with ai-survey-platform

| laravel-agent-workspace-tools | ai-survey-platform | Reuse Potential |
|-----------------------------|-------------------|----------------|
| validate-migration-scenarios.js | validate-migrations.js | HIGH |
| migrate-*-components.js | migrate-*.mjs | MEDIUM |
| batch-generate-patches.js | generate-role-files.js | MEDIUM |

---

## Definition of Done

- [x] Scripts analyzed and categorized
- [ ] Action definitions created for high-value scripts (8 recommended)
- [ ] Actions tested with Laravel project
- [ ] DEV_STATE.md updated
