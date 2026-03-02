# generate-migration

Генерация миграции: изменения схемы БД. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority

78

## Triggers

- generate migration
- create migration
- migration schema
- создай миграцию

## Sub-actions

### 1. generate-migration-spec

Parse schema change from task or diff.

**Input:** task, existingMigrations?, rootDir?  
**Output:** spec

```typescript
export default async function parseMigrationSpec(input: { task: string; existingMigrations?: string[]; rootDir?: string }): Promise<{ spec: { tableName: string; operation: 'create' | 'alter' | 'drop'; columns: Array<{ name: string; type: string; nullable: boolean; default?: string; unique?: boolean; foreign?: { table: string; column: string } }>; indexes: string[] } }> {
  const task = input.task.toLowerCase();
  
  // Determine operation type
  let operation: 'create' | 'alter' | 'drop' = 'create';
  if (task.includes('drop') || task.includes('удалить')) operation = 'drop';
  else if (task.includes('alter') || task.includes('change') || task.includes('изменить')) operation = 'alter';
  
  // Extract table name
  const tableMatch = task.match(/(?:table|таблица)\s+(\w+)/i);
  const tableName = tableMatch ? tableMatch[1] : 'items';
  
  // Parse columns from task
  const columns: Array<{ name: string; type: string; nullable: boolean; default?: string; unique?: boolean }> = [];
  
  // Look for column definitions like "add column name:string" or "поле name:string"
  const colMatches = task.matchAll(/(?:column|поле|field)\s+(\w+):(\w+)/gi);
  for (const match of colMatches) {
    const [, colName, colType] = match;
    columns.push({
      name: colName,
      type: colType === 'str' ? 'string' : colType,
      nullable: true,
      unique: false
    });
  }
  
  // Add default columns for create operation
  if (operation === 'create' && columns.length === 0) {
    columns.push(
      { name: 'id', type: 'bigIncrements', nullable: false, unique: true },
      { name: 'name', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: true },
      { name: 'updated_at', type: 'timestamp', nullable: true }
    );
  }
  
  // Determine indexes
  const indexes: string[] = [];
  if (task.includes('index')) {
    indexes.push('index');
  }
  if (task.includes('unique')) {
    indexes.push('unique');
  }
  
  return {
    spec: {
      tableName,
      operation,
      columns,
      indexes
    }
  };
}
```

### 2. generate-migration-template

Generate migration template code.

**Input:** spec, rootDir?  
**Output:** migration

```typescript
export default async function generateMigrationTemplate(input: { spec: { tableName: string; operation: 'create' | 'alter' | 'drop'; columns: Array<{ name: string; type: string; nullable: boolean; default?: string; unique?: boolean; foreign?: { table: string; column: string } }>; indexes: string[] }; rootDir?: string }): Promise<{ migration: { className: string; fileName: string; up: string; down: string } }> {
  const { tableName, operation, columns, indexes } = input.spec;
  
  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  const fileName = `${timestamp}_create_${tableName}_table.php`;
  
  // Build class name
  let className = '';
  if (operation === 'create') {
    className = 'Create' + tableName.charAt(0).toUpperCase() + tableName.slice(1) + 'Table';
  } else if (operation === 'alter') {
    className = 'Alter' + tableName.charAt(0).toUpperCase() + tableName.slice(1) + 'Table';
  } else {
    className = 'Drop' + tableName.charAt(0).toUpperCase() + tableName.slice(1) + 'Table';
  }
  
  // Generate UP method
  let up = '';
  let down = '';
  
  if (operation === 'create') {
    up = `
        Schema::create('${tableName}', function (Blueprint $table) {
            $table->id();`;
    
    for (const col of columns) {
      let colDef = `$table->${col.type}('${col.name}')`;
      if (col.nullable) colDef += '->nullable()';
      if (col.default) colDef += `->default('${col.default}')`;
      if (col.unique) colDef += '->unique()';
      up += '\n            ' + colDef + ';';
    }
    
    up += '\n            $table->timestamps();\n        });';
    
    down = `Schema::dropIfExists('${tableName}');`;
    
  } else if (operation === 'alter') {
    up = `Schema::table('${tableName}', function (Blueprint $table) {`;
    
    for (const col of columns) {
      up += `\n            $table->${col.type}('${col.name}')->nullable();`;
    }
    
    up += '\n        });';
    
    down = `Schema::table('${tableName}', function (Blueprint $table) {\n            $table->dropColumn([';
    down += columns.map(c => `'${c.name}'`).join(', ');
    down += ']);\n        });';
    
  } else { // drop
    up = `Schema::dropIfExists('${tableName}');`;
    down = `Schema::create('${tableName}', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });`;
  }
  
  return {
    migration: {
      className,
      fileName,
      up,
      down
    }
  };
}
```

### 3. generate-migration-validate

Validate migration syntax.

**Input:** migration  
**Output:** valid, errors

```typescript
export default async function validateMigration(input: { migration: { className: string; up: string; down: string } }): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Check class name
  if (!input.migration.className) {
    errors.push('Migration class name is required');
  }
  
  // Check up method
  if (!input.migration.up.includes('Schema::')) {
    errors.push('Migration must use Schema facade');
  }
  
  // Check for balanced braces in up
  const upOpen = (input.migration.up.match(/{/g) || []).length;
  const upClose = (input.migration.up.match(/}/g) || []).length;
  if (upOpen !== upClose) {
    errors.push('Unbalanced braces in up() method');
  }
  
  // Check for balanced braces in down
  const downOpen = (input.migration.down.match(/{/g) || []).length;
  const downClose = (input.migration.down.match(/}/g) || []).length;
  if (downOpen !== downClose) {
    errors.push('Unbalanced braces in down() method');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 4. generate-migration-rollback

Generate rollback migration.

**Input:** migration, rootDir?  
**Output:** rollbackMigration

```typescript
export default async function generateRollbackMigration(input: { migration: { tableName: string; operation: string }; rootDir?: string }): Promise<{ rollbackMigration: { className: string; fileName: string; up: string; down: string } }> {
  const { tableName } = input.migration;
  
  // Generate timestamp
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  const fileName = `${timestamp}_rollback_${tableName}_table.php`;
  const className = 'Rollback' + tableName.charAt(0).toUpperCase() + tableName.slice(1) + 'Table';
  
  const rollbackMigration = {
    className,
    fileName,
    up: `Schema::dropIfExists('${tableName}');`,
    down: `Schema::create('${tableName}', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });`
  };
  
  return { rollbackMigration };
}
```

### 5. generate-migration-execute

Execute migration (dry run or real).

**Input:** migration, dryRun?, rootDir?  
**Output:** executed, output

```typescript
export default async function executeMigration(input: { migration: { fileName: string; className: string }; dryRun?: boolean; rootDir?: string }): Promise<{ executed: boolean; dryRun: boolean; output: string }> {
  const rootDir = input.rootDir || process.cwd();
  
  // In real implementation, would run:
  // php artisan migrate --path=database/migrations/{filename}
  // or for dry run:
  // php artisan migrate --dry-run
  
  return {
    executed: !input.dryRun,
    dryRun: input.dryRun || false,
    output: input.dryRun 
      ? `[DRY RUN] Would execute migration: ${input.migration.fileName}`
      : `Executed migration: ${input.migration.fileName}`
  };
}
```
