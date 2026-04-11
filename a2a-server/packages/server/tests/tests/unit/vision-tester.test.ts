/**
 * VisionTester unit tests — ADR-0060: Sight-Driven Verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// ── Mock mcp-call ─────────────────────────────────────────────────────────────
vi.mock('../../src/actions/handlers/mcp-call', () => ({
  executeMcpCall: vi.fn(),
}));

import { executeMcpCall } from '../../src/actions/handlers/mcp-call';
import { ArtifactStore } from '../../src/services/core/artifact-store';
import { VisionTester } from '../../src/services/evaluation/vision-tester';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(): ArtifactStore {
  return new ArtifactStore();
}

/** Build a VisionTester wired to a fresh store */
function makeTester(store: ArtifactStore): VisionTester {
  return new VisionTester(store, 'http://ai-hub.test', 'llava-test');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VisionTester', () => {
  let store: ArtifactStore;
  let tester: VisionTester;

  beforeEach(() => {
    store  = makeStore();
    tester = makeTester(store);
    vi.clearAllMocks();
    delete process.env['PLAYWRIGHT_MCP_SERVER'];
  });

  afterEach(() => {
    delete process.env['PLAYWRIGHT_MCP_SERVER'];
  });

  // ── Fallback (no Playwright env) ───────────────────────────────────────────

  describe('rule-based fallback (no PLAYWRIGHT_MCP_SERVER)', () => {
    it('returns a result with judge_mode = rule-based', async () => {
      const result = await tester.verify({
        url: 'http://localhost:3000/login',
        uiRequirement: 'A login form with email and password fields',
        sessionId: 'sess_001',
        turn: 1,
      });

      expect(result.judge_mode).toBe('rule-based');
      expect(result.session_id).toBe('sess_001');
      expect(result.turn).toBe(1);
      expect(result.url).toBe('http://localhost:3000/login');
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.blocking_issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(typeof result.critique).toBe('string');
    });

    it('suggests configuring PLAYWRIGHT_MCP_SERVER', async () => {
      const result = await tester.verify({
        url: 'http://localhost:3000/dashboard',
        uiRequirement: 'Dashboard with chart and sidebar',
        sessionId: 'sess_002',
        turn: 0,
      });

      expect(result.suggestions.some((s) => s.includes('PLAYWRIGHT_MCP_SERVER'))).toBe(true);
    });

    it('defaults sessionId to "unknown" and turn to 0 when omitted', async () => {
      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Homepage',
      });

      expect(result.session_id).toBe('unknown');
      expect(result.turn).toBe(0);
    });
  });

  // ── Playwright MCP env misconfiguration ───────────────────────────────────

  describe('PLAYWRIGHT_MCP_SERVER misconfiguration', () => {
    it('falls back to rule-based when env is invalid JSON', async () => {
      process.env['PLAYWRIGHT_MCP_SERVER'] = 'not-json';

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any UI',
        sessionId: 'sess_003',
      });

      expect(result.judge_mode).toBe('rule-based');
      expect(executeMcpCall).not.toHaveBeenCalled();
    });
  });

  // ── Playwright MCP call failure ────────────────────────────────────────────

  describe('Playwright MCP call failure', () => {
    beforeEach(() => {
      process.env['PLAYWRIGHT_MCP_SERVER'] = '["npx", "playwright-mcp"]';
    });

    it('falls back to rule-based when MCP call returns success=false', async () => {
      vi.mocked(executeMcpCall).mockResolvedValue({
        success: false,
        server: 'playwright',
        tool: 'screenshot',
        error: 'Connection refused',
      });

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any UI',
        sessionId: 'sess_004',
      });

      expect(result.judge_mode).toBe('rule-based');
    });

    it('falls back to rule-based when MCP returns no image content', async () => {
      vi.mocked(executeMcpCall).mockResolvedValue({
        success: true,
        server: 'playwright',
        tool: 'screenshot',
        content: [{ type: 'text', text: 'no image here' }],
      });

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any UI',
        sessionId: 'sess_005',
      });

      expect(result.judge_mode).toBe('rule-based');
    });
  });

  // ── LLM evaluation path ────────────────────────────────────────────────────

  describe('LLM evaluation', () => {
    const FAKE_B64 = Buffer.from('fake-png').toString('base64');

    beforeEach(() => {
      process.env['PLAYWRIGHT_MCP_SERVER'] = '["npx", "playwright-mcp"]';

      vi.mocked(executeMcpCall).mockResolvedValue({
        success: true,
        server: 'playwright',
        tool: 'screenshot',
        content: [{ type: 'image', mimeType: 'image/png', data: FAKE_B64 }],
      });
    });

    it('returns approved=true when LLM scores well with no blocking issues', async () => {
      const llmJson = JSON.stringify({
        layout_correct: true,
        elements_accessible: true,
        contrast_adequate: true,
        requirement_satisfied: 0.95,
        blocking_issues: [],
        critique: 'Looks great.',
        suggestions: [],
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ response: llmJson }),
        }),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000/signup',
        uiRequirement: 'Signup form with name, email, password',
        sessionId: 'sess_006',
        turn: 2,
      });

      expect(result.judge_mode).toBe('llm');
      expect(result.approved).toBe(true);
      expect(result.overall_score).toBeGreaterThan(0.7);
      expect(result.blocking_issues).toHaveLength(0);
      expect(result.critique).toBe('Looks great.');
    });

    it('returns approved=false when LLM reports blocking issues', async () => {
      const llmJson = JSON.stringify({
        layout_correct: false,
        elements_accessible: true,
        contrast_adequate: false,
        requirement_satisfied: 0.3,
        blocking_issues: ['Submit button clips outside viewport'],
        critique: 'Several layout problems detected.',
        suggestions: ['Fix overflow on .container'],
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ response: llmJson }),
        }),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000/checkout',
        uiRequirement: 'Checkout form',
        sessionId: 'sess_007',
        turn: 3,
      });

      expect(result.judge_mode).toBe('llm');
      expect(result.approved).toBe(false);
      expect(result.blocking_issues).toContain('Submit button clips outside viewport');
    });

    it('strips markdown fences from LLM response before parsing', async () => {
      const raw = '```json\n{"layout_correct":true,"elements_accessible":true,"contrast_adequate":true,"requirement_satisfied":0.9,"blocking_issues":[],"critique":"Fine.","suggestions":[]}\n```';

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ response: raw }),
        }),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Basic page',
        sessionId: 'sess_008',
      });

      expect(result.judge_mode).toBe('llm');
      expect(result.critique).toBe('Fine.');
    });

    it('falls back to rule-based when LLM returns invalid JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ response: 'not json at all' }),
        }),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any page',
        sessionId: 'sess_009',
      });

      expect(result.judge_mode).toBe('rule-based');
    });

    it('falls back to rule-based when fetch rejects', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any page',
        sessionId: 'sess_010',
      });

      expect(result.judge_mode).toBe('rule-based');
    });

    it('falls back to rule-based when AI Hub returns non-OK status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        }),
      );

      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'Any page',
        sessionId: 'sess_011',
      });

      expect(result.judge_mode).toBe('rule-based');
    });
  });

  // ── Score computation ──────────────────────────────────────────────────────

  describe('score computation', () => {
    it('overall_score is always in [0, 1]', async () => {
      const result = await tester.verify({
        url: 'http://localhost:3000',
        uiRequirement: 'page',
      });
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
    });
  });

  // ── ArtifactType registration ──────────────────────────────────────────────

  describe('artifact type registration', () => {
    it('registers VISION_QA_RESULT as its writer on construction', () => {
      const freshStore = makeStore();
      const _ = new VisionTester(freshStore, 'http://ai-hub.test', 'llava');
      expect(freshStore.registeredWriters().get('VISION_QA_RESULT')).toBe('vision-tester');
    });

    it('does not throw when the same component re-registers the same type (idempotent)', () => {
      const freshStore = makeStore();
      new VisionTester(freshStore, 'http://ai-hub.test', 'llava');
      // Re-registering the same writer is idempotent — should not throw
      expect(() => new VisionTester(freshStore, 'http://ai-hub.test', 'llava')).not.toThrow();
    });
  });
});
