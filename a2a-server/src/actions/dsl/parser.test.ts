/**
 * Tests for DSL Parser
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {DSLParser, DSLAction, DSLMixin, DSLBase, DSLAST} from './parser.js';

describe('DSLParser', () => {
    let tempDir: string;
    let parser: DSLParser;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsl-test-'));
        parser = new DSLParser(tempDir);

        // Create directory structure
        await fs.mkdir(path.join(tempDir, 'definitions', 'yaml', 'actions'), {recursive: true});
        await fs.mkdir(path.join(tempDir, 'definitions', 'yaml', 'mixins'), {recursive: true});
        await fs.mkdir(path.join(tempDir, 'definitions', 'yaml', 'base'), {recursive: true});
    });

    afterEach(async () => {
        await fs.rm(tempDir, {recursive: true, force: true});
    });

    describe('parseAction', () => {
        it('should parse a simple action', async () => {
            const actionYaml = `
id: test-action
version: "1.0"
steps:
  - id: step1
    script: |
      export default async function run() { return {}; }
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'test.yaml');
            await fs.writeFile(actionPath, actionYaml);

            const result = await parser.parseAction(actionPath);

            expect(result.type).toBe('action');
            expect(result.data.id).toBe('test-action');
            expect(result.data.version).toBe('1.0');
            expect(result.data.steps).toHaveLength(1);
            expect(result.data.steps[0].id).toBe('step1');
        });

        it('should parse action with mixins', async () => {
            const actionYaml = `
id: action-with-mixins
version: "1.0"
mixins:
  - file-collector
  - patch-applier
steps:
  - id: collect
    $mixin: file-collector
    output: files
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'with-mixins.yaml');
            await fs.writeFile(actionPath, actionYaml);

            const result = await parser.parseAction(actionPath);

            expect(result.data.mixins).toContain('file-collector');
            expect(result.data.mixins).toContain('patch-applier');
            expect(result.data.steps[0].$mixin).toBe('file-collector');
        });

        it('should parse action with triggers', async () => {
            const actionYaml = `
id: triggered-action
version: "1.0"
triggers:
  - fix imports
  - resolve imports
steps:
  - id: step1
    script: "export default async function run() { return {}; }"
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'triggered.yaml');
            await fs.writeFile(actionPath, actionYaml);

            const result = await parser.parseAction(actionPath);

            expect(result.data.triggers).toContain('fix imports');
            expect(result.data.triggers).toContain('resolve imports');
        });

        it('should throw error for action without id', async () => {
            const actionYaml = `
steps:
  - id: step1
    script: "export default async function run() { return {}; }"
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'no-id.yaml');
            await fs.writeFile(actionPath, actionYaml);

            await expect(parser.parseAction(actionPath)).rejects.toThrow('Action must have an id');
        });

        it('should throw error for action without steps', async () => {
            const actionYaml = `
id: no-steps
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'no-steps.yaml');
            await fs.writeFile(actionPath, actionYaml);

            await expect(parser.parseAction(actionPath)).rejects.toThrow('Action must have steps');
        });
    });

    describe('parseMixin', () => {
        it('should parse a simple mixin', async () => {
            const mixinYaml = `
mixin: test-mixin
description: "A test mixin"
version: "1.0"
input:
  rootDir:
    type: string
output:
  files:
    type: array
script: |
  export default async function run(input) { return { files: [] }; }
`;
            const mixinPath = path.join(tempDir, 'definitions', 'yaml', 'mixins', 'test.yaml');
            await fs.writeFile(mixinPath, mixinYaml);

            const result = await parser.parseMixin(mixinPath);

            expect(result.type).toBe('mixin');
            expect(result.data.mixin).toBe('test-mixin');
            expect(result.data.description).toBe('A test mixin');
            expect(result.data.version).toBe('1.0');
            expect(result.data.input?.rootDir?.type).toBe('string');
            expect(result.data.output?.files?.type).toBe('array');
        });

        it('should throw error for mixin without name', async () => {
            const mixinYaml = `
description: "Missing mixin name"
`;
            const mixinPath = path.join(tempDir, 'definitions', 'yaml', 'mixins', 'no-name.yaml');
            await fs.writeFile(mixinPath, mixinYaml);

            await expect(parser.parseMixin(mixinPath)).rejects.toThrow('Mixin must have a mixin name');
        });

        it('should parse mixin with composed mixins', async () => {
            const mixinYaml = `
mixin: composite-mixin
mixins:
  - file-collector
  - code-analyzer
input:
  pattern:
    type: string
script: |
  export default async function run(input) { return {}; }
`;
            const mixinPath = path.join(tempDir, 'definitions', 'yaml', 'mixins', 'composite.yaml');
            await fs.writeFile(mixinPath, mixinYaml);

            const result = await parser.parseMixin(mixinPath);

            expect(result.data.mixins).toContain('file-collector');
            expect(result.data.mixins).toContain('code-analyzer');
        });
    });

    describe('parseBase', () => {
        it('should parse a base template', async () => {
            const baseYaml = `
base: test-base
version: "1.0"
description: "A test base template"
abstract: true
steps:
  - id: init
    script: |
      export default async function run() { return {}; }
`;
            const basePath = path.join(tempDir, 'definitions', 'yaml', 'base', 'test.yaml');
            await fs.writeFile(basePath, baseYaml);

            const result = await parser.parseBase(basePath);

            expect(result.type).toBe('base');
            expect((result.data as DSLBase).base).toBe('test-base');
            expect((result.data as DSLBase).abstract).toBe(true);
            expect((result.data as DSLBase).steps).toHaveLength(1);
        });

        it('should throw error for base without name', async () => {
            const baseYaml = `
steps:
  - id: step1
    script: "export default async function run() { return {}; }"
`;
            const basePath = path.join(tempDir, 'definitions', 'yaml', 'base', 'no-name.yaml');
            await fs.writeFile(basePath, baseYaml);

            await expect(parser.parseBase(basePath)).rejects.toThrow('Base template must have a base name');
        });

        it('should parse base with mixins', async () => {
            const baseYaml = `
base: base-with-mixins
version: "1.0"
abstract: true
mixins:
  - file-collector
steps:
  - id: collect
    $mixin: file-collector
`;
            const basePath = path.join(tempDir, 'definitions', 'yaml', 'base', 'with-mixins.yaml');
            await fs.writeFile(basePath, baseYaml);

            const result = await parser.parseBase(basePath);

            expect((result.data as DSLBase).mixins).toContain('file-collector');
        });
    });

    describe('list files', () => {
        it('should list action files', async () => {
            // Create multiple action files
            await fs.writeFile(
                path.join(tempDir, 'definitions', 'yaml', 'actions', 'action1.yaml'),
                'id: action1\nsteps:\n  - id: step1\n    script: "return {}"'
            );
            await fs.writeFile(
                path.join(tempDir, 'definitions', 'yaml', 'actions', 'action2.yaml'),
                'id: action2\nsteps:\n  - id: step1\n    script: "return {}"'
            );
            await fs.writeFile(
                path.join(tempDir, 'definitions', 'yaml', 'actions', 'sub', 'action3.yaml'),
                'id: action3\nsteps:\n  - id: step1\n    script: "return {}"'
            );

            const files = await parser.listActionFiles();

            expect(files.length).toBeGreaterThanOrEqual(2);
            expect(files.some(f => f.includes('action1.yaml'))).toBe(true);
            expect(files.some(f => f.includes('action2.yaml'))).toBe(true);
        });

        it('should list mixin files', async () => {
            await fs.writeFile(
                path.join(tempDir, 'definitions', 'yaml', 'mixins', 'mixin1.yaml'),
                'mixin: mixin1\nscript: "return {}"'
            );

            const files = await parser.listMixinFiles();

            expect(files.length).toBeGreaterThanOrEqual(1);
            expect(files.some(f => f.includes('mixin1.yaml'))).toBe(true);
        });

        it('should list base template files', async () => {
            await fs.writeFile(
                path.join(tempDir, 'definitions', 'yaml', 'base', 'base1.yaml'),
                'base: base1\nsteps:\n  - id: step1\n    script: "return {}"'
            );

            const files = await parser.listBaseFiles();

            expect(files.length).toBeGreaterThanOrEqual(1);
            expect(files.some(f => f.includes('base1.yaml'))).toBe(true);
        });
    });

    describe('directory getters', () => {
        it('should return correct actions directory', () => {
            expect(parser.getActionsDir()).toBe(path.join(tempDir, 'definitions', 'yaml', 'actions'));
        });

        it('should return correct mixins directory', () => {
            expect(parser.getMixinsDir()).toBe(path.join(tempDir, 'definitions', 'yaml', 'mixins'));
        });

        it('should return correct base directory', () => {
            expect(parser.getBasesDir()).toBe(path.join(tempDir, 'definitions', 'yaml', 'base'));
        });
    });

    describe('complex action parsing', () => {
        it('should parse fix-vue-imports.yaml correctly', async () => {
            const yaml = `
id: fix-vue-imports
version: 1.0
title: "Fix Vue Imports"
description: "Fix broken imports in Vue files"

mixins:
  - file-collector
  - code-analyzer
  - patch-applier

context:
  framework: vue

triggers:
  - fix vue imports
  - broken imports

steps:
  - id: collect
    description: "Collect Vue files"
    $mixin: file-collector
    input:
      rootDir: "\${context.rootDir}"
      extensions:
        - .vue
        - .ts
    output: files

  - id: analyze
    description: "Analyze imports"
    $mixin: code-analyzer
    input:
      files: "{{ collect.files }}"
      pattern: "from\s+'([^']+)'"
    output: imports
`;
            const actionPath = path.join(tempDir, 'definitions', 'yaml', 'actions', 'fix-vue-imports.yaml');
            await fs.writeFile(actionPath, yaml);

            const result = await parser.parseAction(actionPath);

            expect(result.data.id).toBe('fix-vue-imports');
            expect(result.data.title).toBe('Fix Vue Imports');
            expect(result.data.mixins).toHaveLength(3);
            expect(result.data.triggers).toContain('fix vue imports');
            expect(result.data.steps).toHaveLength(2);
            expect(result.data.steps[0].output).toBe('files');
        });
    });
});
