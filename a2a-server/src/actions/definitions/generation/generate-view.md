# generate-view

Генерация представления: Blade/Vue компонент. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority

75

## Triggers

- generate view
- create view
- blade component
- vue component

## Sub-actions

### 1. generate-view-spec

Analyze task to determine view requirements.

**Input:** task, stack?, rootDir?  
**Output:** viewSpec

```typescript
export default async function analyzeView(input: { task: string; stack?: string; rootDir?: string }): Promise<{ viewSpec: { name: string; type: 'blade' | 'vue' | 'react'; template: string; variables: string[]; sections: string[]; components: string[] } }> {
  const task = input.task.toLowerCase();
  
  // Determine stack type
  let type: 'blade' | 'vue' | 'react' = 'blade';
  if (task.includes('vue')) type = 'vue';
  else if (task.includes('react')) type = 'react';
  else if (input.stack) type = input.stack as 'blade' | 'vue' | 'react';
  
  // Extract view name
  const nameMatch = task.match(/(?:view|page|component)\s+(\w+)/i);
  const name = nameMatch ? nameMatch[1] : 'index';
  
  // Determine template type
  let template = 'list';
  if (task.includes('form')) template = 'form';
  else if (task.includes('detail') || task.includes('show')) template = 'detail';
  else if (task.includes('create')) template = 'create';
  else if (task.includes('edit')) template = 'edit';
  
  // Extract variables
  const variables: string[] = [];
  const varMatches = task.matchAll(/(\w+)\s+(?:variable|переменная)/gi);
  for (const match of varMatches) {
    variables.push(match[1]);
  }
  
  // Default variables based on template
  if (template === 'list') {
    variables.push('items', 'columns');
  } else if (template === 'form') {
    variables.push('item', 'errors');
  } else if (template === 'detail') {
    variables.push('item');
  }
  
  // Determine sections
  const sections: string[] = [];
  if (type === 'blade') {
    sections.push('content', 'title', 'styles', 'scripts');
  }
  
  // Determine components
  const components: string[] = [];
  if (task.includes('table')) components.push('data-table');
  if (task.includes('form')) components.push('form-input', 'form-submit');
  if (task.includes('modal')) components.push('modal');
  if (task.includes('button')) components.push('button');
  
  return {
    viewSpec: {
      name,
      type,
      template,
      variables,
      sections,
      components
    }
  };
}
```

### 2. generate-view-blade

Generate Blade template.

**Input:** viewSpec, rootDir?  
**Output:** bladeFile

```typescript
export default async function generateBlade(input: { viewSpec: { name: string; template: string; variables: string[]; sections: string[]; components: string[] }; rootDir?: string }): Promise<{ bladeFile: { path: string; code: string } }> {
  const { name, template, variables, components } = input.viewSpec;
  const rootDir = input.rootDir || process.cwd();
  
  const path = `${rootDir}/resources/views/${name}.blade.php`;
  
  let code = '';
  
  if (template === 'list') {
    code = `@extends('layouts.app')

@section('content')
<div class="container">
    <h1>{{ ucfirst('${name}') }}</h1>
    
    <table class="table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @forelse($${name} as $item)
            <tr>
                <td>{{ $item->id }}</td>
                <td>{{ $item->name }}</td>
                <td>
                    <a href="{{ route('${name}.show', $item->id) }}" class="btn btn-sm btn-info">View</a>
                    <a href="{{ route('${name}.edit', $item->id) }}" class="btn btn-sm btn-primary">Edit</a>
                    <form action="{{ route('${name}.destroy', $item->id) }}" method="POST" style="display: inline;">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Are you sure?')">Delete</button>
                    </form>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="3">No items found.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
    
    {{ $${name}->links() }}
</div>
@endsection
`;
  } else if (template === 'form') {
    code = `@extends('layouts.app')

@section('content')
<div class="container">
    <h1>{{ isset($item) ? 'Edit' : 'Create' }} ${name}</h1>
    
    @if($errors->any())
    <div class="alert alert-danger">
        <ul>
            @foreach($errors->all() as $error)
            <li>{{ $error }}</li>
            @endforeach
        </ul>
    </div>
    @endif
    
    <form method="POST" action="{{ isset($item) ? route('${name}.update', $item->id) : route('${name}.store') }}">
        @csrf
        @if(isset($item))
        @method('PUT')
        @endif
        
        <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input type="text" class="form-control" id="name" name="name" value="{{ old('name', $item->name ?? '') }}" required>
        </div>
        
        <button type="submit" class="btn btn-primary">Save</button>
        <a href="{{ route('${name}.index') }}" class="btn btn-secondary">Cancel</a>
    </form>
</div>
@endsection
`;
  } else if (template === 'detail') {
    code = `@extends('layouts.app')

@section('content')
<div class="container">
    <h1>{{ $item->name }}</h1>
    
    <div class="card">
        <div class="card-body">
            <h5 class="card-title">Details</h5>
            <p><strong>ID:</strong> {{ $item->id }}</p>
            <p><strong>Name:</strong> {{ $item->name }}</p>
            <p><strong>Created:</strong> {{ $item->created_at }}</p>
        </div>
    </div>
    
    <a href="{{ route('${name}.index') }}" class="btn btn-secondary">Back</a>
    <a href="{{ route('${name}.edit', $item->id) }}" class="btn btn-primary">Edit</a>
</div>
@endsection
`;
  } else {
    code = `@extends('layouts.app')

@section('content')
<div class="container">
    <h1>${name}</h1>
    <!-- TODO: Add content -->
</div>
@endsection
`;
  }
  
  return {
    bladeFile: {
      path,
      code
    }
  };
}
```

### 3. generate-view-vue

Generate Vue component.

**Input:** viewSpec, rootDir?  
**Output:** vueFile

```typescript
export default async function generateVue(input: { viewSpec: { name: string; template: string; variables: string[] }; rootDir?: string }): Promise<{ vueFile: { path: string; code: string } }> {
  const { name, template, variables } = input.viewSpec;
  const rootDir = input.rootDir || process.cwd();
  
  const path = `${rootDir}/resources/js/components/${name}.vue`;
  
  let code = '';
  
  if (template === 'list') {
    code = `<template>
  <div class="${name}-list">
    <h1>{{ title }}</h1>
    
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>
            <button @click="$emit('view', item)" class="btn btn-sm btn-info">View</button>
            <button @click="$emit('edit', item)" class="btn btn-sm btn-primary">Edit</button>
            <button @click="$emit('delete', item)" class="btn btn-sm btn-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '${name}' },
  items: { type: Array, default: () => [] }
});

defineEmits(['view', 'edit', 'delete']);
</script>
`;
  } else if (template === 'form') {
    code = `<template>
  <div class="${name}-form">
    <h1>{{ isEdit ? 'Edit' : 'Create' }} ${name}</h1>
    
    <form @submit.prevent="submit">
      <div class="mb-3">
        <label for="name" class="form-label">Name</label>
        <input 
          type="text" 
          class="form-control" 
          id="name" 
          v-model="form.name"
          required
        >
      </div>
      
      <button type="submit" class="btn btn-primary">Save</button>
      <button type="button" @click="$emit('cancel')" class="btn btn-secondary">Cancel</button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  item: { type: Object, default: null }
});

const emit = defineEmits(['submit', 'cancel']);

const form = ref({
  name: ''
});

const isEdit = computed(() => !!props.item);

if (props.item) {
  form.value.name = props.item.name;
}

const submit = () => {
  emit('submit', { ...form.value, id: props.item?.id });
};
</script>
`;
  } else {
    code = `<template>
  <div class="${name}">
    <h1>${name}</h1>
  </div>
</template>

<script setup>
// TODO: Add component logic
</script>
`;
  }
  
  return {
    vueFile: {
      path,
      code
    }
  };
}
```

### 4. generate-view-validate

Validate generated view code.

**Input:** viewFile, type  
**Output:** valid, errors

```typescript
export default async function validateView(input: { viewFile: { code: string }; type: 'blade' | 'vue' | 'react' }): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const code = input.viewFile.code;
  
  if (input.type === 'blade') {
    if (!code.includes('@extends') && !code.includes('@section')) {
      // Standalone blade is OK
    }
    
    // Check for common issues
    if (code.includes('{{') && !code.includes('}}')) {
      errors.push('Unclosed Blade interpolation');
    }
    
    if (code.includes('@for') && !code.includes('@endfor')) {
      errors.push('Unclosed @for directive');
    }
    
    if (code.includes('@if') && !code.includes('@endif')) {
      errors.push('Unclosed @if directive');
    }
  } else if (input.type === 'vue') {
    if (!code.includes('<template>')) {
      errors.push('Vue component must have <template> section');
    }
    
    if (!code.includes('<script')) {
      // Optional for Vue 3
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 5. generate-view-routes

Generate routes for view.

**Input:** viewSpec, rootDir?  
**Output:** routes

```typescript
export default async function generateViewRoutes(input: { viewSpec: { name: string; type: string }; rootDir?: string }): Promise<{ routes: { name: string; path: string; methods: string[] }[] }> {
  const { name } = input.viewSpec;
  
  const routes = [
    { name: `${name}.index`, path: `/${name}`, methods: ['GET'] },
    { name: `${name}.create`, path: `/${name}/create`, methods: ['GET'] },
    { name: `${name}.store`, path: `/${name}`, methods: ['POST'] },
    { name: `${name}.show`, path: `/${name}/{id}`, methods: ['GET'] },
    { name: `${name}.edit`, path: `/${name}/{id}/edit`, methods: ['GET'] },
    { name: `${name}.update`, path: `/${name}/{id}`, methods: ['PUT', 'PATCH'] },
    { name: `${name}.destroy`, path: `/${name}/{id}`, methods: ['DELETE'] },
  ];
  
  return { routes };
}
```
