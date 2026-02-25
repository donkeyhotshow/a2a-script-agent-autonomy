# generate-model

Generate model/entity from schema or table. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
80

## Triggers
- generate model
- model generation
- create model

## Sub-actions

### 1. generate-model-analyze
Analyze task to determine model requirements.

**Input:** task, rootDir?  
**Output:** modelSpec

```typescript
export default async function analyzeModel(input: { task: string; rootDir?: string }): Promise<{ modelSpec: { name: string; table?: string; fillable: string[]; hidden: string[]; casts: Record<string, string>; relations: Array<{ type: string; model: string; foreignKey: string }> } }> {
  const task = input.task.toLowerCase();
  
  // Extract model name
  const nameMatch = task.match(/(?:model|модель)\s+(\w+)/i);
  const name = nameMatch ? nameMatch[1] : 'Item';
  
  // Extract table name
  const tableMatch = task.match(/table\s+(\w+)/i);
  const table = tableMatch ? tableMatch[1] : name.toLowerCase() + 's';
  
  // Default attributes
  const fillable = ['name', 'slug', 'description', 'status'];
  const hidden = ['password', 'remember_token'];
  const casts: Record<string, string> = {
    created_at: 'datetime',
    updated_at: 'datetime',
    is_active: 'boolean',
    settings: 'array'
  };
  
  // Parse relations
  const relations: Array<{ type: string; model: string; foreignKey: string }> = [];
  
  // Check for hasMany relations
  const hasManyMatch = task.matchAll(/(?:has many|имеет много)\s+(\w+)/gi);
  for (const match of hasManyMatch) {
    relations.push({
      type: 'hasMany',
      model: match[1],
      foreignKey: name.toLowerCase() + '_id'
    });
  }
  
  // Check for belongsTo relations
  const belongsToMatch = task.matchAll(/(?:belongs to|принадлежит)\s+(\w+)/gi);
  for (const match of belongsToMatch) {
    relations.push({
      type: 'belongsTo',
      model: match[1],
      foreignKey: match[1].toLowerCase() + '_id'
    });
  }
  
  return {
    modelSpec: {
      name,
      table,
      fillable,
      hidden,
      casts,
      relations
    }
  };
}
```

### 2. generate-model-create
Create model file with properties.

**Input:** modelSpec, rootDir?  
**Output:** modelFile

```typescript
export default async function createModel(input: { modelSpec: { name: string; table?: string; fillable: string[]; hidden: string[]; casts: Record<string, string>; relations: Array<{ type: string; model: string; foreignKey: string }> }; rootDir?: string }): Promise<{ modelFile: { path: string; code: string } }> {
  const { name, table, fillable, hidden, casts, relations } = input.modelSpec;
  const rootDir = input.rootDir || process.cwd();
  
  const path = `${rootDir}/app/Models/${name}.php`;
  
  // Generate relations code
  const relationsCode = relations.map(rel => {
    switch (rel.type) {
      case 'hasMany':
        return `
    public function ${rel.model.toLowerCase()}()
    {
        return $this->hasMany(${rel.model}::class);
    }`;
      case 'belongsTo':
        return `
    public function ${rel.model.toLowerCase()}()
    {
        return $this->belongsTo(${rel.model}::class, '${rel.foreignKey}');
    }`;
      case 'hasOne':
        return `
    public function ${rel.model.toLowerCase()}()
    {
        return $this->hasOne(${rel.model}::class);
    }`;
      case 'belongsToMany':
        return `
    public function ${rel.model.toLowerCase()}()
    {
        return $this->belongsToMany(${rel.model}::class);
    }`;
      default:
        return '';
    }
  }).join('');
  
  // Generate casts
  const castsCode = Object.entries(casts)
    .map(([key, value]) => `'${key}' => '${value}'`)
    .join(',\n        ');
  
  const code = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\SoftDeletes;

class ${name} extends Model
{
    use SoftDeletes;
${table ? `    protected $table = '${table}';` : ''}
    
    protected $fillable = ['${fillable.join("', '")}'];
    
    protected $hidden = ['${hidden.join("', '")}'];
    
    protected $casts = [
        ${castsCode}
    ];${relationsCode}
}
`;

  return {
    modelFile: {
      path,
      code
    }
  };
}
```

### 3. generate-model-relationships
Add relationships (belongsTo, hasMany, etc.) to model.

**Input:** modelSpec, existingModel?, rootDir?  
**Output:** updatedModel

```typescript
export default async function addRelationships(input: { modelSpec: { name: string; relations: Array<{ type: string; model: string; foreignKey: string }> }; existingModel?: string; rootDir?: string }): Promise<{ updatedModel: { code: string; relationsAdded: string[] } }> {
  const { name, relations } = input.modelSpec;
  const rootDir = input.rootDir || process.cwd();
  
  const relationsAdded: string[] = [];
  
  for (const rel of relations) {
    relationsAdded.push(`${rel.type}(${rel.model})`);
  }
  
  // In real implementation:
  // 1. Read existing model file
  // 2. Parse PHP AST
  // 3. Add new relationship methods
  // 4. Write back
  
  return {
    updatedModel: {
      code: `// Model with ${relationsAdded.length} relationships added`,
      relationsAdded
    }
  };
}
```

### 4. generate-model-mutators
Add mutators and accessors to model.

**Input:** modelSpec, rootDir?  
**Output:** mutatorsCode

```typescript
export default async function addMutators(input: { modelSpec: { name: string; fillable: string[] }; rootDir?: string }): Promise<{ mutatorsCode: string[] }> {
  const { fillable } = input.modelSpec;
  const mutatorsCode: string[] = [];
  
  // Add common mutators/accessors
  for (const field of fillable) {
    if (field === 'name') {
      mutatorsCode.push(`
    // Accessor for name
    public function getNameAttribute($value)
    {
        return ucfirst($value);
    }
    
    // Mutator for name
    public function setNameAttribute($value)
    {
        $this->attributes['name'] = strtolower($value);
    }`);
    }
    
    if (field === 'slug') {
      mutatorsCode.push(`
    // Mutator for slug - auto-generate from name
    public function setSlugAttribute($value)
    {
        if (empty($value) && isset($this->attributes['name'])) {
            $this->attributes['slug'] = str_slug($this->attributes['name']);
        } else {
            $this->attributes['slug'] = str_slug($value);
        }
    }`);
    }
  }
  
  return { mutatorsCode };
}
```

### 5. generate-model-validate
Validate generated model.

**Input:** modelFile  
**Output:** valid, errors

```typescript
export default async function validateModel(input: { modelFile: { code: string } }): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const code = input.modelFile.code;
  
  // Check for required elements
  if (!code.includes('<?php')) {
    errors.push('Missing PHP opening tag');
  }
  
  if (!code.includes('namespace App\\Models')) {
    errors.push('Missing namespace');
  }
  
  if (!code.includes('extends Model')) {
    errors.push('Model must extend Illuminate\\Database\\Eloquent\\Model');
  }
  
  if (!code.includes('protected $fillable')) {
    warnings.push('Consider adding $fillable to protect mass assignment');
  }
  
  // Check for timestamps
  if (!code.includes('$table->timestamps()')) {
    warnings.push('Migration should include timestamps() for created_at/updated_at');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### 6. generate-model-factory
Generate model factory.

**Input:** modelSpec, rootDir?  
**Output:** factory

```typescript
export default async function generateFactory(input: { modelSpec: { name: string; fillable: string[] }; rootDir?: string }): Promise<{ factory: { className: string; code: string } }> {
  const { name, fillable } = input.modelSpec;
  
  const className = name + 'Factory';
  
  const definition: string[] = [];
  
  for (const field of fillable.slice(0, 5)) {
    switch (field) {
      case 'name':
        definition.push("'name' => \$this->faker->name()");
        break;
      case 'slug':
        definition.push("'slug' => \$this->faker->slug()");
        break;
      case 'description':
        definition.push("'description' => \$this->faker->paragraph()");
        break;
      case 'email':
        definition.push("'email' => \$this->faker->unique()->safeEmail()");
        break;
      case 'status':
        definition.push("'status' => \$this->faker->randomElement(['active', 'inactive'])");
        break;
      default:
        definition.push(`'${field}' => \$this->faker->word()`);
    }
  }
  
  const code = `<?php

namespace Database\\Factories;

use App\\Models\\${name};
use Illuminate\\Database\\Eloquent\\Factories\\Factory;

class ${className} extends Factory
{
    protected $model = ${name}::class;
    
    public function definition()
    {
        return [
            ${definition.join(',\n            ')}
        ];
    }
}
`;

  return {
    factory: {
      className,
      code
    }
  };
}
```
