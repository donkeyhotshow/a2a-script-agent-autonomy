# validate-config

Validates configuration files against JSON schemas (mirrors the `validate-config.js` script).

**Priority:** 6

## Sub-actions (2 steps)

### 1. validate-schema

Validates a single configuration file against its JSON schema.

**Input:** `{ configPath: string, schemaPath: string }`  
**Output:** `{ valid: boolean }`

```typescript
import fs from 'fs/promises';
import Ajv from 'ajv';

export default async function run(input: { configPath: string; schemaPath: string }): Promise<{ valid: boolean }> {
  const { configPath, schemaPath } = input;
  const ajv = new Ajv({ allErrors: true, verbose: true });
  
  try {
    // Load schema
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    const validate = ajv.compile(schema);
    
    // Load config
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Validate
    const valid = validate(config);
    if (!valid) {
      console.error(`❌ ${configPath} validation failed:`);
      validate.errors?.forEach(error => {
        console.error(`  - ${error.instancePath || 'root'}: ${error.message}`);
      });
    }
    return { valid };
  } catch (error) {
    console.error(`❌ Failed to validate ${configPath}:`, error.message);
    return { valid: false };
  }
}
```

### 2. validate-all-configs

Validates multiple configuration files against their respective schemas.

**Input:** `{ validations: Array<{ config: string; schema: string }>, projectRoot: string }`  
**Output:** `{ allValid: boolean }`

```typescript
import fs from 'fs/promises';
import path from 'path';

export default async function run(input: { validations: Array<{ config: string; schema: string }>; projectRoot: string }): Promise<{ allValid: boolean }> {
  const { validations, projectRoot } = input;
  let allValid = true;

  for (const { config, schema } of validations) {
    try {
      const configPath = path.join(projectRoot, config);
      const schemaPath = path.join(projectRoot, schema);
      
      await fs.access(configPath);
      await fs.access(schemaPath);
      
      const result = await runSubAction('validate-schema', { configPath, schemaPath });
      if (!result.valid) {
        allValid = false;
      }
    } catch (error) {
      console.error(`❌ Configuration file not found: ${config}`);
      allValid = false;
    }
  }

  console.log(`\n${allValid ? '✅' : '❌'} Configuration validation ${allValid ? 'passed' : 'failed'}`);
  return { allValid };
}
```

## Context

- Framework: Laravel (general purpose configuration validation)
- Uses AJV library for JSON schema validation
- Assumes configuration files and schemas are located in the project root
- Validates one or more configuration files in a batch

## Triggers

- validate configuration
- check config schemas
- validate json config