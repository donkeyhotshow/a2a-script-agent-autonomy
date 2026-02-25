# generate-controller

Generate controller with actions. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
80

## Triggers
- generate controller
- controller generation
- create controller

## Sub-actions

### 1. generate-controller-analyze
Analyze task to determine controller requirements.

**Input:** task, rootDir?  
**Output:** controllerSpec

```typescript
export default async function analyze(input: { task: string; rootDir?: string }): Promise<{ controllerSpec: { name: string; resource: string; actions: string[]; module?: string } }> {
  const task = input.task.toLowerCase();
  
  // Determine resource name from task
  const resourceMatch = task.match(/(?:for|resource|сущность|модель)\s+(\w+)/i);
  const resourceName = resourceMatch ? resourceMatch[1] : 'Resource';
  
  // Determine controller name
  let controllerName = resourceName + 'Controller';
  if (task.includes('api')) {
    controllerName = resourceName + 'ApiController';
  }
  
  // Determine required actions
  const actions: string[] = [];
  if (task.includes('crud') || task.includes('full')) {
    actions.push('index', 'show', 'store', 'update', 'destroy');
  } else {
    if (task.includes('list') || task.includes('index')) actions.push('index');
    if (task.includes('show') || task.includes('view')) actions.push('show');
    if (task.includes('create') || task.includes('add')) actions.push('store');
    if (task.includes('edit') || task.includes('update')) actions.push('update');
    if (task.includes('delete') || task.includes('remove')) actions.push('destroy');
  }
  
  // Determine module
  let module: string | undefined;
  const moduleMatch = task.match(/module\s+(\w+)/i);
  if (moduleMatch) module = moduleMatch[1];
  
  return {
    controllerSpec: {
      name: controllerName,
      resource: resourceName.toLowerCase(),
      actions,
      module
    }
  };
}
```

### 2. generate-controller-create
Create controller file with basic structure.

**Input:** controllerSpec, rootDir?  
**Output:** filePath

```typescript
export default async function createController(input: { controllerSpec: { name: string; resource: string; actions: string[]; module?: string }; rootDir?: string }): Promise<{ filePath: string; code: string }> {
  const { name, resource, actions, module } = input.controllerSpec;
  const rootDir = input.rootDir || process.cwd();
  
  // Determine controller path based on module
  const controllerDir = module 
    ? `${rootDir}/app/Http/Controllers/${module}`
    : `${rootDir}/app/Http/Controllers`;
  
  // Generate actions code
  const actionsCode = actions.map(action => {
    switch (action) {
      case 'index':
        return `    public function index(Request $request)
    {
        $${resource} = ${name}::paginate(15);
        return response()->json($${resource});
    }`;
      case 'show':
        return `    public function show(int $id)
    {
        $${resource} = ${name}::findOrFail($id);
        return response()->json($${resource});
    }`;
      case 'store':
        return `    public function store(Request $request)
    {
        $validated = $request->validate([
            // Add validation rules
        ]);
        $${resource} = ${name}::create($validated);
        return response()->json($${resource}, 201);
    }`;
      case 'update':
        return `    public function update(Request $request, int $id)
    {
        $${resource} = ${name}::findOrFail($id);
        $validated = $request->validate([
            // Add validation rules
        ]);
        $${resource}->update($validated);
        return response()->json($${resource});
    }`;
      case 'destroy':
        return `    public function destroy(int $id)
    {
        $${resource} = ${name}::findOrFail($id);
        $${resource}->delete();
        return response()->json(['message' => 'Deleted']);
    }`;
      default:
        return `    public function ${action}() { /* TODO: implement */ }`;
    }
  }).join('\n\n');

  const controllerCode = `<?php

namespace App\\Http\\Controllers${module ? `\\${module}` : ''};

use App\\Models\\${name.replace('Controller', '')};
use Illuminate\\Http\\Request;

class ${name} extends Controller
{
${actionsCode}
}
`;

  const filePath = `${controllerDir}/${name}.php`;

  return {
    filePath,
    code: controllerCode
  };
}
```

### 3. generate-controller-routes
Register REST routes for controller.

**Input:** controllerSpec, rootDir?  
**Output:** routesFile, routesAdded

```typescript
export default async function addRoutes(input: { controllerSpec: { name: string; resource: string; actions: string[]; module?: string }; rootDir?: string }): Promise<{ routesFile: string; routesAdded: string[] }> {
  const { name, resource, actions, module } = input.controllerSpec;
  const rootDir = input.rootDir || process.cwd();
  
  const routesFile = `${rootDir}/routes/api.php`;
  const routesAdded: string[] = [];
  
  // Generate route definitions
  const controllerPath = module ? `${module}\\` : '';
  const controllerFullName = `${controllerPath}${name}`;
  
  if (actions.includes('index')) {
    routesAdded.push(`Route::get('/${resource}', [${controllerFullName}::class, 'index']);`);
  }
  if (actions.includes('store')) {
    routesAdded.push(`Route::post('/${resource}', [${controllerFullName}::class, 'store']);`);
  }
  if (actions.includes('show')) {
    routesAdded.push(`Route::get('/${resource}/{id}', [${controllerFullName}::class, 'show']);`);
  }
  if (actions.includes('update')) {
    routesAdded.push(`Route::put('/${resource}/{id}', [${controllerFullName}::class, 'update']);`);
    routesAdded.push(`Route::patch('/${resource}/{id}', [${controllerFullName}::class, 'update']);`);
  }
  if (actions.includes('destroy')) {
    routesAdded.push(`Route::delete('/${resource}/{id}', [${controllerFullName}::class, 'destroy']);`);
  }

  return {
    routesFile,
    routesAdded
  };
}
```

### 4. generate-controller-validate
Validate generated controller code.

**Input:** code, filePath  
**Output:** valid, errors

```typescript
export default async function validateController(input: { code: string; filePath: string }): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Basic syntax checks
  if (!input.code.includes('<?php')) {
    errors.push('Missing PHP opening tag');
  }
  
  if (!input.code.includes('namespace App\\Http\\Controllers')) {
    errors.push('Missing or invalid namespace');
  }
  
  if (!input.code.includes('class ')) {
    errors.push('Missing class declaration');
  }
  
  if (!input.code.includes('extends Controller')) {
    errors.push('Controller must extend base Controller class');
  }
  
  // Check for common issues
  if (input.code.includes('function index()') && !input.code.includes('$request')) {
    errors.push('index method should accept Request parameter');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```
