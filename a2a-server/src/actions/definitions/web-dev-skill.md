# web-dev-skill

Agent Skill for Web Development: Scaffolding projects, managing frontend dependencies, and generating premium UI components.

**Priority:** 5

**Context:** Contains standard handlers for scaffolding and editing frontend layers.

## Sub-actions (2 steps)

### 1. web-dev-scaffold

Determine if a web project needs scaffolding and set up basic Vite/Vue/React structures.

**Input:** { targetDirectory: string, framework: string }
**Output:** { setupComplete: boolean, summary: string }

```typescript
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export default async function run(input: { targetDirectory?: string, framework?: string }): Promise<{ setupComplete: boolean, summary: string }> {
  const dir = resolve(input.targetDirectory || '.');
  const fw = input.framework || 'vue';
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    // Generate a basic scaffold package.json
    const pkg = {
      name: `scaffolded-${fw}-app`,
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build'
      },
      dependencies: {},
      devDependencies: {
        vite: '^5.0.0'
      }
    };
    
    if (fw === 'vue') {
      pkg.dependencies['vue'] = '^3.4.0';
      pkg.devDependencies['@vitejs/plugin-vue'] = '^5.0.0';
    } else if (fw === 'react') {
      pkg.dependencies['react'] = '^18.2.0';
      pkg.dependencies['react-dom'] = '^18.2.0';
    }
    
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    
    return { 
      setupComplete: true, 
      summary: `Scaffolded basic ${fw} project at ${dir}` 
    };
  }
  
  return { 
    setupComplete: true, 
    summary: `Project already exists at ${dir}` 
  };
}
```

### 2. web-dev-ui-generate

Generates premium CSS styles (glassmorphism, variables) and standard UI component files.

**Input:** { componentName: string, targetPath: string, styleMode: string }
**Output:** { filesCreated: string[] }

```typescript
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export default async function run(input: { componentName: string, targetPath: string, styleMode: string }): Promise<{ filesCreated: string[] }> {
  const fullPath = resolve(input.targetPath);
  const dir = dirname(fullPath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Very simple UI gen simulation
  const cssVars = `
:root {
  --primary-color: #3b82f6;
  --bg-color: #0f172a;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
}
.premium-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}
`;

  if (fullPath.endsWith('.css')) {
    writeFileSync(fullPath, cssVars);
  } else if (fullPath.endsWith('.vue')) {
    const vueCode = `<template>
  <div class="premium-glass p-4 rounded-xl shadow-lg">
    <h2 class="text-xl font-bold">{{ title }}</h2>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const title = ref('${input.componentName}');
</script>

<style scoped>
@import './main.css'; /* Assume standard */
</style>`;
    writeFileSync(fullPath, vueCode);
  }

  return { filesCreated: [fullPath] };
}
```
