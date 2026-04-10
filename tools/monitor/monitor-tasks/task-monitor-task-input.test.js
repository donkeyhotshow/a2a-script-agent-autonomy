import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskMonitorUtils } from './task-monitor-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

describe('buildMonitorTaskInput', () => {
  beforeEach(() => {
    delete process.env.TASK_MONITOR_TASK_FROM_FILE;
    delete process.env.TASK_MONITOR_TASK_SPEC_URL_TEMPLATE;
    delete process.env.TASK_MONITOR_FILE_LINK_WORKFLOW;
    delete process.env.TASK_MONITOR_CREATE_SESSION_TASK;
  });
  afterEach(() => {
    delete process.env.TASK_MONITOR_TASK_FROM_FILE;
    delete process.env.TASK_MONITOR_TASK_SPEC_URL_TEMPLATE;
    delete process.env.TASK_MONITOR_FILE_LINK_WORKFLOW;
    delete process.env.TASK_MONITOR_CREATE_SESSION_TASK;
  });

  it('includes repo path and file URL when TASK_MONITOR_TASK_FROM_FILE is default', () => {
    const u = new TaskMonitorUtils();
    const mdPath = path.join(REPO_ROOT, 'prompts-to-agent-mode', 'README.md');
    const taskFile = { name: 'README.md', path: mdPath, content: '## Agent prompt\nDo thing.' };
    const prev = process.cwd();
    process.chdir(REPO_ROOT);
    try {
      const s = u.buildMonitorTaskInput(taskFile);
      expect(s).toContain('Repo path:');
      expect(s).toContain('prompts-to-agent-mode/README.md');
      expect(s).toContain('File URL:');
      expect(s).toContain('file:');
      expect(s).toContain('Summary:');
    } finally {
      process.chdir(prev);
    }
  });

  it('uses inline extract only when TASK_MONITOR_TASK_FROM_FILE=0', () => {
    process.env.TASK_MONITOR_TASK_FROM_FILE = '0';
    const u = new TaskMonitorUtils();
    const taskFile = {
      name: 'x.md',
      path: path.join(REPO_ROOT, 'x.md'),
      content: '## Agent prompt\nOnly this line matters for legacy.',
    };
    const s = u.buildMonitorTaskInput(taskFile);
    expect(s).toBe('Only this line matters for legacy.');
  });

  it('router search text is short; agent spec contains Repo path', () => {
    const u = new TaskMonitorUtils();
    const mdPath = path.join(REPO_ROOT, 'prompts-to-agent-mode', 'README.md');
    const taskFile = { name: 'README.md', path: mdPath, content: '## Agent prompt\nDo the thing.' };
    const prev = process.cwd();
    process.chdir(REPO_ROOT);
    try {
      process.env.TASK_MONITOR_TASK_FROM_FILE = '1';
      delete process.env.TASK_MONITOR_TWO_PHASE;
      expect(u.isMonitorTwoPhaseRouterThenSpec(taskFile)).toBe(true);
      const r = u.buildMonitorRouterSearchTaskInput(taskFile);
      const a = u.buildMonitorAgentSpecTaskInput(taskFile);
      expect(r.length).toBeLessThan(a.length);
      expect(r).toContain('README.md');
      expect(a).toContain('Repo path:');
    } finally {
      process.chdir(prev);
    }
  });

  it('buildMonitorCreateSessionTaskInput: two-phase default uses bootstrap (not router line)', () => {
    const u = new TaskMonitorUtils();
    const mdPath = path.join(REPO_ROOT, 'prompts-to-agent-mode', 'README.md');
    const taskFile = { name: 'README.md', path: mdPath, content: '## Agent prompt\nDo the thing.' };
    const router = u.buildMonitorRouterSearchTaskInput(taskFile);
    const createTask = u.buildMonitorCreateSessionTaskInput(taskFile, router, true);
    expect(createTask).toContain('Task Monitor session');
    expect(createTask).not.toEqual(router);
  });

  it('buildMonitorCreateSessionTaskInput: single-phase matches router task', () => {
    const u = new TaskMonitorUtils();
    const taskFile = {
      name: 'x.md',
      path: path.join(REPO_ROOT, 'x.md'),
      content: '## Agent prompt\nLine.',
    };
    process.env.TASK_MONITOR_TASK_FROM_FILE = '0';
    const router = u.buildMonitorRouterSearchTaskInput(taskFile);
    const createTask = u.buildMonitorCreateSessionTaskInput(taskFile, router, false);
    expect(createTask).toBe(router);
  });

  it('buildMonitorCreateSessionTaskInput: TASK_MONITOR_FILE_LINK_WORKFLOW=0 uses router line', () => {
    process.env.TASK_MONITOR_FILE_LINK_WORKFLOW = '0';
    const u = new TaskMonitorUtils();
    const taskFile = {
      name: 'x.md',
      path: path.join(REPO_ROOT, 'x.md'),
      content: '## Agent prompt\nHello.',
    };
    const router = u.buildMonitorRouterSearchTaskInput(taskFile);
    const createTask = u.buildMonitorCreateSessionTaskInput(taskFile, router, true);
    expect(createTask).toBe(router);
  });

  it('buildMonitorCreateSessionTask: custom template with {rel}', () => {
    process.env.TASK_MONITOR_CREATE_SESSION_TASK = 'Open {rel}';
    const u = new TaskMonitorUtils();
    const prev = process.cwd();
    process.chdir(REPO_ROOT);
    try {
      const mdPath = path.join(REPO_ROOT, 'prompts-to-agent-mode', 'README.md');
      const taskFile = { name: 'README.md', path: mdPath, content: '## Agent prompt\nX.' };
      const router = u.buildMonitorRouterSearchTaskInput(taskFile);
      const createTask = u.buildMonitorCreateSessionTaskInput(taskFile, router, true);
      expect(createTask).toBe('Open prompts-to-agent-mode/README.md');
    } finally {
      process.chdir(prev);
    }
  });
});
