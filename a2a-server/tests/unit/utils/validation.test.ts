import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  emailSchema,
  passwordSchema,
  gitUrlSchema,
  branchNameSchema,
  filePathSchema,
  paginationSchema,
  projectIdParamsSchema,
  sessionIdParamsSchema,
  registerInputSchema,
  loginInputSchema,
  createProjectInputSchema,
  createSessionInputSchema,
  searchQuerySchema,
  validateInput,
  isValidJson,
  sanitizeString,
  isValidFileExtension,
  isValidMimeType,
} from '../../../src/utils/validation.js';

describe('validation schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      expect(uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
    it('rejects invalid', () => {
      expect(() => uuidSchema.parse('not-uuid')).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('accepts valid email', () => {
      expect(emailSchema.parse('a@b.com')).toBe('a@b.com');
    });
    it('rejects invalid', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid password', () => {
      expect(passwordSchema.parse('Password1')).toBe('Password1');
    });
    it('rejects short', () => {
      expect(() => passwordSchema.parse('Short1')).toThrow();
    });
    it('rejects no uppercase', () => {
      expect(() => passwordSchema.parse('password1')).toThrow();
    });
    it('rejects no number', () => {
      expect(() => passwordSchema.parse('Password')).toThrow();
    });
  });

  describe('gitUrlSchema', () => {
    it('accepts https git URL', () => {
      expect(gitUrlSchema.parse('https://github.com/user/repo.git')).toBeTruthy();
    });
    it('accepts ssh git URL', () => {
      expect(gitUrlSchema.parse('ssh://github.com/user/repo.git')).toBeTruthy();
    });
    it('rejects non-git URL', () => {
      expect(() => gitUrlSchema.parse('https://example.com')).toThrow();
    });
  });

  describe('branchNameSchema', () => {
    it('accepts main', () => {
      expect(branchNameSchema.parse('main')).toBe('main');
    });
    it('accepts feature/branch', () => {
      expect(branchNameSchema.parse('feature/my-branch')).toBeTruthy();
    });
  });

  describe('filePathSchema', () => {
    it('accepts valid path', () => {
      expect(filePathSchema.parse('src/index.ts')).toBeTruthy();
    });
  });

  describe('paginationSchema', () => {
    it('defaults page and limit', () => {
      const r = paginationSchema.parse({});
      expect(r.page).toBe(1);
      expect(r.limit).toBe(20);
    });
    it('parses values', () => {
      const r = paginationSchema.parse({ page: '2', limit: '10' });
      expect(r.page).toBe(2);
      expect(r.limit).toBe(10);
    });
  });

  describe('projectIdParamsSchema, sessionIdParamsSchema', () => {
    it('projectIdParamsSchema', () => {
      const r = projectIdParamsSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(r.id).toBeTruthy();
    });
    it('sessionIdParamsSchema', () => {
      const r = sessionIdParamsSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(r.id).toBeTruthy();
    });
  });

  describe('registerInputSchema', () => {
    it('parses valid', () => {
      const r = registerInputSchema.parse({ name: 'John', email: 'a@b.com', password: 'Password1' });
      expect(r.name).toBe('John');
    });
  });

  describe('loginInputSchema', () => {
    it('parses valid', () => {
      const r = loginInputSchema.parse({ email: 'a@b.com', password: 'x' });
      expect(r.email).toBe('a@b.com');
    });
  });

  describe('createProjectInputSchema', () => {
    it('parses valid with branch default', () => {
      const r = createProjectInputSchema.parse({
        name: 'Proj',
        gitUrl: 'https://github.com/u/r.git',
      });
      expect(r.branch).toBe('main');
    });
  });

  describe('createSessionInputSchema', () => {
    it('parses valid', () => {
      const r = createSessionInputSchema.parse({ projectId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(r.projectId).toBeTruthy();
    });
  });

  describe('searchQuerySchema', () => {
    it('parses valid', () => {
      const r = searchQuerySchema.parse({ query: 'test' });
      expect(r.query).toBe('test');
    });
    it('parses with filters', () => {
      const r = searchQuerySchema.parse({
        query: 'user',
        filters: { file_types: ['ts'], directories: ['src'], exclude: ['node_modules'] },
      });
      expect(r.filters?.file_types).toEqual(['ts']);
      expect(r.filters?.exclude).toContain('node_modules');
    });
    it('parses with options', () => {
      const r = searchQuerySchema.parse({
        query: 'x',
        options: { limit: 50, min_score: 0.5, highlight_matches: true },
      });
      expect(r.options?.limit).toBe(50);
      expect(r.options?.min_score).toBe(0.5);
    });
  });

  describe('validateInput', () => {
    it('parses and returns data', () => {
      const r = validateInput(registerInputSchema, { name: 'John', email: 'a@b.com', password: 'Password1' });
      expect(r.name).toBe('John');
    });
    it('throws on invalid', () => {
      expect(() => validateInput(registerInputSchema, {})).toThrow();
    });
  });

  describe('isValidJson', () => {
    it('returns true for valid JSON', () => {
      expect(isValidJson('{}')).toBe(true);
      expect(isValidJson('{"a":1}')).toBe(true);
    });
    it('returns false for invalid', () => {
      expect(isValidJson('{')).toBe(false);
      expect(isValidJson('x')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('strips HTML and trims', () => {
      expect(sanitizeString('  <script>x</script>  ')).toBe('x');
    });
  });

  describe('isValidFileExtension', () => {
    it('returns true for allowed', () => {
      expect(isValidFileExtension('a.ts', ['ts', 'js'])).toBe(true);
    });
    it('returns false for disallowed', () => {
      expect(isValidFileExtension('a.txt', ['ts'])).toBe(false);
    });
  });

  describe('isValidMimeType', () => {
    it('returns true for allowed', () => {
      expect(isValidMimeType('application/json', ['application/json'])).toBe(true);
    });
    it('returns false for disallowed', () => {
      expect(isValidMimeType('text/plain', ['application/json'])).toBe(false);
    });
  });
});
