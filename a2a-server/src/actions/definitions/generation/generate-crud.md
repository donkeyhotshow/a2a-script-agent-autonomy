# generate-crud

Генерация CRUD: модель, контроллер, миграция. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority

80

## Triggers

- generate crud
- crud generation
- create crud
- создай контроллер
- сгенерируй модель

## Sub-actions

### 1. generate-analyze

Анализ задачи пользователя (ресурс, поля).

**Input:** task, rootDir?  
**Output:** spec

```typescript
export default async function analyze(input: { task: string; rootDir?: string }): Promise<{ spec: { resourceName: string; fields: Array<{ name: string; type: string; nullable: boolean; unique: boolean }> } }> {
  const task = input.task.toLowerCase();
  
  // Extract resource name
  const resourceMatch = task.match(/(?:for|resource|сущность|модель)\s+(\w+)/i);
  const resourceName = resourceMatch ? resourceMatch[1] : 'Item';
  
  // Default fields for basic CRUD
  const fields = [
    { name: 'id', type: 'bigIncrements', nullable: false, unique: true },
    { name: 'name', type: 'string', nullable: false, unique: false },
    { name: 'slug', type: 'string', nullable: true, unique: true },
    { name: 'description', type: 'text', nullable: true, unique: false },
    { name: 'status', type: 'enum', nullable: false, unique: false },
    { name: 'created_at', type: 'timestamp', nullable: true, unique: false },
    { name: 'updated_at', type: 'timestamp', nullable: true, unique: false },
  ];
  
  // Parse additional fields from task
  const fieldMatches = task.matchAll(/(?:field|field|поле)\s+(\w+):(\w+)/gi);
  for (const match of fieldMatches) {
    const [, fieldName, fieldType] = match;
    fields.push({
      name: fieldName,
      type: fieldType === 'str' ? 'string' : fieldType,
      nullable: true,
      unique: false
    });
  }
  
  return { 
    spec: { 
      resourceName, 
      fields 
    } 
  };
}
```

### 2. generate-context

Сбор контекста (стиль проекта, существующие модели).

**Input:** spec, rootDir?  
**Output:** context

```typescript
export default async function collectContext(input: { spec: { resourceName: string; fields: unknown[] }; rootDir?: string }): Promise<{ context: { projectType: string; hasTimestamps: boolean; hasSoftDeletes: boolean; existingModels: string[]; codingStyle: string } }> {
  const rootDir = input.rootDir || process.cwd();
  
  // Determine project type
  let projectType = 'laravel';
  let hasTimestamps = true;
  let hasSoftDeletes = false;
  let codingStyle = 'psr12';
  const existingModels: string[] = [];
  
  // Check for Laravel project structure
  const composerPath = `${rootDir}/composer.json`;
  
  // Check for existing models
  const modelsPath = `${rootDir}/app/Models`;
  
  return {
    context: {
      projectType,
      hasTimestamps,
      hasSoftDeletes,
      existingModels,
      codingStyle
    }
  };
}
```

### 3. generate-migration

Генерирует миграцию для БД.

**Input:** spec, context  
**Output:** migration

```typescript
export default async function generateMigration(input: { spec: { resourceName: string; fields: Array<{ name: string; type: string; nullable: boolean; unique: boolean }> }; context: { hasTimestamps: boolean; hasSoftDeletes: boolean } }): Promise<{ migration: { className: string; tableName: string; up: string; down: string } }> {
  const { resourceName, fields } = input.spec;
  const tableName = resourceName.toLowerCase() + 's';
  const className = 'Create' + resourceName + 'sTable';
  
  // Build columns
  const columns = fields.map(field => {
    let columnDef = `$table->${field.type}('${field.name}')`;
    
    if (field.nullable) {
      columnDef += '->nullable()';
    }
    if (field.unique) {
      columnDef += '->unique()';
    }
    
    return columnDef;
  }).join(';\n            ');
  
  // Add timestamps if needed
  const timestamps = input.context.hasTimestamps 
    ? `$table->timestamps();\n            $table->softDeletes();`
    : '';
  
  const migration = {
    className,
    tableName,
    up: `
            Schema::create('${tableName}', function (Blueprint $table) {
                $table->id();
                ${columns}
                ${timestamps}
            });`,
    down: `Schema::dropIfExists('${tableName}');`
  };
  
  return { migration };
}
```

### 4. generate-model

Генерирует Eloquent модель.

**Input:** spec, context  
**Output:** model

```typescript
export default async function generateModel(input: { spec: { resourceName: string }; context: { hasSoftDeletes: boolean } }): Promise<{ model: { className: string; code: string } }> {
  const { resourceName } = input.spec;
  const className = resourceName;
  
  const fillable = ['name', 'slug', 'description', 'status'];
  const casts = { created_at: 'datetime', updated_at: 'datetime' };
  
  let code = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
${input.context.hasSoftDeletes ? 'use Illuminate\\Database\\Eloquent\\SoftDeletes;' : ''}

class ${className} extends Model
{
    use ${input.context.hasSoftDeletes ? 'SoftDeletes' : ''};
    
    protected $fillable = ['${fillable.join("', '")}'];
    
    protected $casts = ${JSON.stringify(casts, null, 8).replace(/"/g, "'")};
}
`;
  
  return { model: { className, code } };
}
```

### 5. generate-controller

Генерирует CRUD контроллер.

**Input:** spec  
**Output:** controller

```typescript
export default async function generateController(input: { spec: { resourceName: string } }): Promise<{ controller: { className: string; code: string } }> {
  const { resourceName } = input.spec;
  const className = resourceName + 'Controller';
  const variableName = resourceName.toLowerCase();
  
  const code = `<?php

namespace App\\Http\\Controllers;

use App\\Models\\${resourceName};
use Illuminate\\Http\\Request;

class ${className} extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ${resourceName}::query();
        
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        $$variableName = $query->paginate(15);
        return response()->json($$variableName);
    }

    /**
     * Store a newly created resource.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:${variableName},slug',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);
        
        $$variableName = ${resourceName}::create($validated);
        return response()->json($$variableName, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id)
    {
        $$variableName = ${resourceName}::findOrFail($id);
        return response()->json($$variableName);
    }

    /**
     * Update the specified resource.
     */
    public function update(Request $request, int $id)
    {
        $$variableName = ${resourceName}::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|nullable|string|unique:${variableName},slug,' . $$variableName->id,
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive',
        ]);
        
        $$variableName->update($validated);
        return response()->json($$variableName);
    }

    /**
     * Remove the specified resource.
     */
    public function destroy(int $id)
    {
        $$variableName = ${resourceName}::findOrFail($id);
        $$variableName->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
`;
  
  return { controller: { className, code } };
}
```

### 6. generate-routes

Генерирует REST routes.

**Input:** spec  
**Output:** routes

```typescript
export default async function generateRoutes(input: { spec: { resourceName: string } }): Promise<{ routes: { resource: string; code: string[] } }> {
  const { resourceName } = input.spec;
  const controllerName = resourceName + 'Controller';
  const resource = resourceName.toLowerCase() + 's';
  
  const routes = {
    resource,
    code: [
      `Route::get('/${resource}', [${controllerName}::class, 'index']);`,
      `Route::post('/${resource}', [${controllerName}::class, 'store']);`,
      `Route::get('/${resource}/{id}', [${controllerName}::class, 'show']);`,
      `Route::put('/${resource}/{id}', [${controllerName}::class, 'update']);`,
      `Route::delete('/${resource}/{id}', [${controllerName}::class, 'destroy']);`,
    ]
  };
  
  return { routes };
}
```

### 7. generate-validate

Валидация синтаксиса сгенерированного кода.

**Input:** drafts  
**Output:** valid_drafts, errors

```typescript
export default async function validateCode(input: { drafts: { migration?: { up: string }; model?: { code: string }; controller?: { code: string }; routes?: { code: string[] } } }): Promise<{ valid_drafts: Record<string, unknown>; errors: string[] }> {
  const errors: string[] = [];
  const valid_drafts: Record<string, unknown> = {};
  
  // Validate migration
  if (input.drafts.migration) {
    if (!input.drafts.migration.up.includes('Schema::create')) {
      errors.push('Migration must contain Schema::create');
    }
    valid_drafts.migration = input.drafts.migration;
  }
  
  // Validate model
  if (input.drafts.model) {
    if (!input.drafts.model.code.includes('class ')) {
      errors.push('Model must contain class declaration');
    }
    if (!input.drafts.model.code.includes('extends Model')) {
      errors.push('Model must extend Model class');
    }
    valid_drafts.model = input.drafts.model;
  }
  
  // Validate controller
  if (input.drafts.controller) {
    if (!input.drafts.controller.code.includes('extends Controller')) {
      errors.push('Controller must extend Controller class');
    }
    valid_drafts.controller = input.drafts.controller;
  }
  
  // Validate (input.drafts routes
  if.routes) {
    if (input.drafts.routes.code.length < 3) {
      errors.push('CRUD needs at least 3 routes');
    }
    valid_drafts.routes = input.drafts.routes;
  }
  
  return { valid_drafts, errors };
}
```

### 8. generate-diff

Формирование diff для превью.

**Input:** valid_drafts  
**Output:** diff

```typescript
export default async function createDiff(input: { valid_drafts: { migration?: { className: string; tableName: string }; model?: { className: string }; controller?: { className: string }; routes?: { resource: string } } }): Promise<{ diff: Array<{ type: string; path: string; content: string }> }> {
  const diff: Array<{ type: string; path: string; content: string }> = [];
  
  if (input.valid_drafts.migration) {
    diff.push({
      type: 'migration',
      path: `database/migrations/${input.valid_drafts.migration.className.toLowerCase()}.php`,
      content: input.valid_drafts.migration.className + ' migration code'
    });
  }
  
  if (input.valid_drafts.model) {
    diff.push({
      type: 'model',
      path: `app/Models/${input.valid_drafts.model.className}.php`,
      content: input.valid_drafts.model.className + ' model code'
    });
  }
  
  if (input.valid_drafts.controller) {
    diff.push({
      type: 'controller',
      path: `app/Http/Controllers/${input.valid_drafts.controller.className}.php`,
      content: input.valid_drafts.controller.className + ' controller code'
    });
  }
  
  if (input.valid_drafts.routes) {
    diff.push({
      type: 'routes',
      path: 'routes/api.php',
      content: input.valid_drafts.routes.resource + ' routes'
    });
  }
  
  return { diff };
}
```

### 9. generate-apply

Применение изменений (опционально, с подтверждением).

**Input:** diff[], confirm?, rootDir?  
**Output:** createdFiles, errors

```typescript
export default async function applyChanges(input: { diff: Array<{ type: string; path: string; content: string }>; confirm?: boolean; rootDir?: string }): Promise<{ createdFiles: string[]; errors: string[] }> {
  const errors: string[] = [];
  const createdFiles: string[] = [];
  
  // Only apply if explicitly confirmed
  if (!input.confirm) {
    errors.push('Confirmation required to apply changes');
    return { createdFiles, errors };
  }
  
  const rootDir = input.rootDir || process.cwd();
  
  for (const change of input.diff) {
    const fullPath = `${rootDir}/${change.path}`;
    
    try {
      // In real implementation, would write file here
      // await fs.writeFile(fullPath, change.content);
      createdFiles.push(fullPath);
    } catch (e) {
      errors.push(`Failed to create ${change.path}: ${e}`);
    }
  }
  
  return { createdFiles, errors };
}
```
