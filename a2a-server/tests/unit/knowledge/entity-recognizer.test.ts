import { describe, it, expect } from 'vitest';
import {
  recognizeEntities,
  recognizeEntitiesBatch,
  getEntityTypeFromPath,
  filterEntitiesByType,
  findEntityByName,
  findEntitiesByFile,
  type RecognizedEntity,
} from '../../../src/knowledge/entity-recognizer.js';

describe('entity-recognizer', () => {
  describe('getEntityTypeFromPath', () => {
    it('recognizes model from path', () => {
      expect(getEntityTypeFromPath('app/Models/User.php')).toBe('model');
      expect(getEntityTypeFromPath('features/auth/app/Models/User.php')).toBe('model');
    });

    it('recognizes controller from path', () => {
      expect(getEntityTypeFromPath('app/Http/Controllers/UserController.php')).toBe('controller');
    });

    it('recognizes service from path', () => {
      expect(getEntityTypeFromPath('app/Services/UserService.php')).toBe('service');
    });

    it('recognizes vue component from path', () => {
      expect(getEntityTypeFromPath('resources/js/components/Button.vue')).toBe('vue-component');
    });

    it('recognizes vue page from path', () => {
      expect(getEntityTypeFromPath('resources/js/Pages/Dashboard.vue')).toBe('vue-page');
    });

    it('recognizes composable from path', () => {
      expect(getEntityTypeFromPath('resources/js/composables/useAuth.ts')).toBe('composable');
    });

    it('recognizes store from path', () => {
      expect(getEntityTypeFromPath('resources/js/stores/user.ts')).toBe('store');
    });

    it('returns null for unknown paths', () => {
      expect(getEntityTypeFromPath('README.md')).toBeNull();
      expect(getEntityTypeFromPath('config/app.php')).toBeNull();
    });
  });

  describe('recognizeEntities', () => {
    it('recognizes Eloquent model', () => {
      const content = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;

class User extends Model
{
    protected $fillable = ['name', 'email'];
    
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
    
    public function role()
    {
        return $this->belongsTo(Role::class);
    }
}`;
      
      const entities = recognizeEntities(content, 'app/Models/User.php');
      
      expect(entities.length).toBeGreaterThan(0);
      
      const model = entities.find((e) => e.type === 'model');
      expect(model).toBeDefined();
      expect(model?.name).toBe('User');
      expect(model?.metadata.namespace).toBe('App\\Models');
      expect(model?.metadata.methods).toBeDefined();
    });

    it('recognizes controller', () => {
      const content = `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Routing\\Controller;

class UserController extends Controller
{
    public function index()
    {
        return view('users.index');
    }
    
    public function show($id)
    {
        return view('users.show', compact('id'));
    }
}`;
      
      const entities = recognizeEntities(content, 'app/Http/Controllers/UserController.php');
      
      const controller = entities.find((e) => e.type === 'controller');
      expect(controller).toBeDefined();
      expect(controller?.name).toBe('User');
      expect(controller?.metadata.methods).toContain('index');
      expect(controller?.metadata.methods).toContain('show');
    });

    it('recognizes Vue component', () => {
      const content = `<script setup lang="ts">
import { ref } from 'vue';
import Button from './Button.vue';

interface Props {
  title: string;
  count?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [id: number];
}>();

const localCount = ref(props.count ?? 0);
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
    <Button @click="emit('click', 1)" />
  </div>
</template>`;
      
      const entities = recognizeEntities(content, 'resources/js/components/Card.vue');
      
      const component = entities.find((e) => e.type === 'vue-component' || e.type === 'vue-page');
      expect(component).toBeDefined();
      expect(component?.name).toBe('Card');
    });

    it('recognizes Pinia store', () => {
      const content = `import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    loading: false,
  }),
  
  actions: {
    async fetchUsers() {
      this.loading = true;
      // ...
    },
    
    addUser(user) {
      this.users.push(user);
    },
  },
});`;
      
      const entities = recognizeEntities(content, 'resources/js/stores/user.ts');
      
      const store = entities.find((e) => e.type === 'store');
      expect(store).toBeDefined();
      expect(store?.name).toBe('user');
    });

    it('recognizes composable', () => {
      const content = `import { ref, onMounted } from 'vue';

export function useUser(userId: number) {
  const user = ref(null);
  const loading = ref(false);
  
  onMounted(async () => {
    loading.value = true;
    // fetch user
  });
  
  return { user, loading };
}`;
      
      const entities = recognizeEntities(content, 'resources/js/composables/useUser.ts');
      
      const composable = entities.find((e) => e.type === 'composable');
      expect(composable).toBeDefined();
      expect(composable?.name).toBe('useUser');
    });

    it('recognizes FormRequest', () => {
      const content = `<?php

namespace App\\Http\\Requests;

use Illuminate\\Foundation\\Http\\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'min:8'],
        ];
    }
}`;
      
      const entities = recognizeEntities(content, 'app/Http/Requests/StoreUserRequest.php');
      
      const request = entities.find((e) => e.type === 'request');
      expect(request).toBeDefined();
      expect(request?.name).toBe('StoreUser');
      expect(request?.metadata.methods).toContain('rules');
    });
  });

  describe('filterEntitiesByType', () => {
    it('filters entities by type', () => {
      const entities: RecognizedEntity[] = [
        { id: '1', type: 'model', filePath: 'a.php', name: 'User', metadata: { name: 'User' }, startLine: 1, endLine: 10, confidence: 0.9 },
        { id: '2', type: 'controller', filePath: 'b.php', name: 'UserController', metadata: { name: 'UserController' }, startLine: 1, endLine: 20, confidence: 0.9 },
        { id: '3', type: 'model', filePath: 'c.php', name: 'Post', metadata: { name: 'Post' }, startLine: 1, endLine: 15, confidence: 0.9 },
      ];
      
      const models = filterEntitiesByType(entities, 'model');
      expect(models).toHaveLength(2);
      expect(models[0]?.name).toBe('User');
      expect(models[1]?.name).toBe('Post');
    });
  });

  describe('findEntityByName', () => {
    it('finds entity by name', () => {
      const entities: RecognizedEntity[] = [
        { id: '1', type: 'model', filePath: 'a.php', name: 'User', metadata: { name: 'User' }, startLine: 1, endLine: 10, confidence: 0.9 },
        { id: '2', type: 'controller', filePath: 'b.php', name: 'UserController', metadata: { name: 'UserController' }, startLine: 1, endLine: 20, confidence: 0.9 },
      ];
      
      const user = findEntityByName(entities, 'User');
      expect(user).toBeDefined();
      expect(user?.type).toBe('model');
      
      const notFound = findEntityByName(entities, 'NonExistent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('recognizeEntitiesBatch', () => {
    it('processes multiple files', () => {
      const files = [
        { path: 'app/Models/Post.php', content: 'class Post extends Model {}' },
        { path: 'app/Http/Controllers/PostController.php', content: 'class PostController extends Controller {}' },
      ];
      const entities = recognizeEntitiesBatch(files);
      expect(entities.length).toBeGreaterThanOrEqual(1);
      const types = entities.map((e) => e.type);
      expect(types).toContain('model');
      expect(types).toContain('controller');
    });
  });

  describe('findEntitiesByFile', () => {
    it('finds entities by file path', () => {
      const entities = recognizeEntitiesBatch([{ path: 'app/Models/User.php', content: 'class User extends Model {}' }]);
      const byFile = findEntitiesByFile(entities, 'app/Models/User.php');
      expect(byFile.length).toBeGreaterThan(0);
      expect(byFile[0].filePath).toBe('app/Models/User.php');
    });
  });

  describe('additional entity types', () => {
    it('recognizes Repository', () => {
      const entities = recognizeEntities('class UserRepository implements UserRepositoryInterface {}', 'app/Repositories/UserRepository.php');
      expect(entities.some((e) => e.type === 'repository')).toBe(true);
    });
    it('recognizes Migration', () => {
      const entities = recognizeEntities('Schema::create("users", function () {});', 'database/migrations/2024_01_01.php');
      expect(entities.some((e) => e.type === 'migration')).toBe(true);
    });
    it('recognizes Factory', () => {
      const entities = recognizeEntities('class UserFactory extends Factory {}', 'database/factories/UserFactory.php');
      expect(entities.some((e) => e.type === 'factory')).toBe(true);
    });
    it('recognizes TypeScript type', () => {
      const entities = recognizeEntities('export type User = { id: string };', 'resources/js/types/user.ts');
      expect(entities.some((e) => e.type === 'type')).toBe(true);
    });
    it('recognizes TypeScript interface', () => {
      const entities = recognizeEntities('export interface User { id: string }', 'resources/js/types/user.ts');
      expect(entities.some((e) => e.type === 'interface')).toBe(true);
    });
  });
});
