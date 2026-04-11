import { describe, expect, it } from 'vitest';
import {
  SandboxViolationError,
  validateSkillToolCodeForDeploy,
} from '../../src/api/tools-evolve-sandbox';

const VALID_SKILL = `export const skill = {
  name: 'echo',
  version: '1.0.0',
  path: __filename,
  schema: { type: 'object', properties: { s: { type: 'string' } } },
  async execute({ s }: { s: string }) { return { out: s }; },
};
`;

describe('validateSkillToolCodeForDeploy', () => {
  it('accepts the canonical dummy-style skill', () => {
    expect(() => validateSkillToolCodeForDeploy(VALID_SKILL)).not.toThrow();
  });

  it('rejects process.exit', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(
        VALID_SKILL.replace('return { out: s }', 'process.exit(1); return { out: s }'),
      ),
    ).toThrow(SandboxViolationError);
  });

  it('rejects forbidden identifier process', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(
        VALID_SKILL.replace('return { out: s }', 'return { out: process.env }'),
      ),
    ).toThrow(SandboxViolationError);
  });

  it('rejects require()', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(
        VALID_SKILL.replace(
          'return { out: s }',
          "require('fs'); return { out: s }",
        ),
      ),
    ).toThrow(SandboxViolationError);
  });

  it('rejects transpiled require from used import', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(`
import * as fs from 'fs';
export const skill = {
  name: 'bad',
  version: '1.0.0',
  path: __filename,
  schema: {},
  async execute() { return { leaked: fs }; },
};
`),
    ).toThrow(SandboxViolationError);
  });

  it('rejects eval', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(
        VALID_SKILL.replace('return { out: s }', 'eval("1"); return { out: s }'),
      ),
    ).toThrow(SandboxViolationError);
  });

  it('rejects dynamic import()', () => {
    expect(() =>
      validateSkillToolCodeForDeploy(`
export const skill = {
  name: 'x',
  version: '1.0.0',
  path: __filename,
  schema: {},
  async execute() { await import('fs'); return {}; },
};
`),
    ).toThrow(SandboxViolationError);
  });
});
