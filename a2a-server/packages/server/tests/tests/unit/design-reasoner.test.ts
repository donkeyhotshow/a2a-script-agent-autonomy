/**
 * DesignReasoner unit tests — ADR-0061: Hierarchical Design Reasoner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock logger ───────────────────────────────────────────────────────────────
vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { ArtifactStore } from '../../src/services/core/artifact-store';
import { DesignReasoner, DEFAULT_MANIFEST } from '../../src/services/evaluation/design-reasoner';
import type { DesignManifest } from '../../src/services/evaluation/design-reasoner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(): ArtifactStore {
  return new ArtifactStore();
}

function makeReasoner(store: ArtifactStore): DesignReasoner {
  return new DesignReasoner(store, 'http://ai-hub.test', 'design-model');
}

/** Full valid manifest JSON the LLM would return */
function validManifestJson(): string {
  return JSON.stringify({
    colorPalette: {
      primary:   'hsl(210 90% 50%)',
      secondary: 'hsl(270 60% 45%)',
      accent:    'hsl(40 100% 55%)',
      neutral:   'hsl(210 10% 45%)',
      surface:   'hsl(210 15% 98%)',
      text:      'hsl(210 20% 10%)',
    },
    typography: {
      fontFamily:    "'Plus Jakarta Sans', sans-serif",
      headingFamily: "'Fraunces', serif",
      baseSizeRem:   1,
      scaleRatio:    1.333,
      weightRegular: 400,
      weightBold:    700,
      lineHeight:    1.6,
    },
    spacing: { basePx: 4, scale: [0.5, 1, 2, 3, 4, 6, 8, 12] },
    shadows: {
      sm: '0 1px 3px hsl(210 20% 10% / 0.08)',
      md: '0 4px 14px hsl(210 20% 10% / 0.12)',
      lg: '0 8px 28px hsl(210 20% 10% / 0.16)',
      xl: '0 16px 56px hsl(210 20% 10% / 0.22)',
    },
    radii: { sm: '4px', md: '8px', lg: '16px', full: '9999px' },
    animations: {
      durationFast:   120,
      durationNormal: 220,
      durationSlow:   380,
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    glassmorphism: { blurPx: 16, backgroundOpacity: 0.55, borderOpacity: 0.12 },
    rationale: 'Ocean-inspired premium palette with fluid typography.',
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DesignReasoner', () => {
  let store: ArtifactStore;
  let reasoner: DesignReasoner;

  beforeEach(() => {
    store    = makeStore();
    reasoner = makeReasoner(store);
    vi.clearAllMocks();
  });

  // ── Default manifest ───────────────────────────────────────────────────────

  describe('DEFAULT_MANIFEST', () => {
    it('has all required top-level fields', () => {
      expect(DEFAULT_MANIFEST.colorPalette).toBeDefined();
      expect(DEFAULT_MANIFEST.typography).toBeDefined();
      expect(DEFAULT_MANIFEST.spacing).toBeDefined();
      expect(DEFAULT_MANIFEST.shadows).toBeDefined();
      expect(DEFAULT_MANIFEST.radii).toBeDefined();
      expect(DEFAULT_MANIFEST.animations).toBeDefined();
      expect(DEFAULT_MANIFEST.glassmorphism).toBeDefined();
      expect(typeof DEFAULT_MANIFEST.rationale).toBe('string');
    });

    it('colorPalette has all required keys', () => {
      const keys = ['primary', 'secondary', 'accent', 'neutral', 'surface', 'text'];
      for (const key of keys) {
        expect(DEFAULT_MANIFEST.colorPalette).toHaveProperty(key);
      }
    });

    it('spacing.scale is a non-empty array of numbers', () => {
      expect(Array.isArray(DEFAULT_MANIFEST.spacing.scale)).toBe(true);
      expect(DEFAULT_MANIFEST.spacing.scale.length).toBeGreaterThan(0);
      expect(DEFAULT_MANIFEST.spacing.scale.every((v) => typeof v === 'number')).toBe(true);
    });

    it('glassmorphism.backgroundOpacity is in [0, 1]', () => {
      expect(DEFAULT_MANIFEST.glassmorphism.backgroundOpacity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_MANIFEST.glassmorphism.backgroundOpacity).toBeLessThanOrEqual(1);
    });
  });

  // ── Artifact type registration ─────────────────────────────────────────────

  describe('artifact type registration', () => {
    it('registers DESIGN_MANIFEST as its writer on construction', () => {
      const freshStore = makeStore();
      new DesignReasoner(freshStore, 'http://ai-hub.test', 'design-model');
      expect(freshStore.registeredWriters().get('DESIGN_MANIFEST')).toBe('design-reasoner');
    });

    it('is idempotent when the same writer re-registers', () => {
      const freshStore = makeStore();
      new DesignReasoner(freshStore, 'http://ai-hub.test', 'design-model');
      expect(() =>
        new DesignReasoner(freshStore, 'http://ai-hub.test', 'design-model'),
      ).not.toThrow();
    });
  });

  // ── Fallback (LLM unavailable) ─────────────────────────────────────────────

  describe('fallback when LLM is unavailable', () => {
    it('returns default manifest when fetch rejects', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await reasoner.reason({ uiRequirement: 'A landing page', sessionId: 'sess_001' });

      expect(result.source).toBe('default');
      expect(result.colorPalette).toEqual(DEFAULT_MANIFEST.colorPalette);
    });

    it('returns default manifest when AI Hub returns non-OK status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }));

      const result = await reasoner.reason({ uiRequirement: 'Dashboard', sessionId: 'sess_002' });

      expect(result.source).toBe('default');
    });

    it('returns default manifest when LLM response is not valid JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Here is a nice color: blue.' }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'Any UI', sessionId: 'sess_003' });

      expect(result.source).toBe('default');
    });

    it('fills missing manifest fields with defaults when LLM JSON is partial', async () => {
      const partial = JSON.stringify({ rationale: 'Minimalist only.' });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: partial }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'Minimal page', sessionId: 'sess_004' });

      // rationale comes from LLM; the rest fall back to defaults
      expect(result.rationale).toBe('Minimalist only.');
      expect(result.source).toBe('llm');
      expect(result.colorPalette).toEqual(DEFAULT_MANIFEST.colorPalette);
      expect(result.typography).toEqual(DEFAULT_MANIFEST.typography);
    });
  });

  // ── LLM happy path ─────────────────────────────────────────────────────────

  describe('LLM happy path', () => {
    it('parses a full valid manifest from the LLM response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: validManifestJson() }),
      }));

      const result = await reasoner.reason({
        uiRequirement: 'E-commerce product page',
        sessionId: 'sess_005',
        turn: 1,
      });

      expect(result.source).toBe('llm');
      expect(result.colorPalette.primary).toBe('hsl(210 90% 50%)');
      expect(result.typography.fontFamily).toBe("'Plus Jakarta Sans', sans-serif");
      expect(result.spacing.basePx).toBe(4);
      expect(result.animations.durationFast).toBe(120);
      expect(result.glassmorphism.blurPx).toBe(16);
      expect(result.rationale).toBe('Ocean-inspired premium palette with fluid typography.');
    });

    it('strips markdown fences before parsing', async () => {
      const fenced = '```json\n' + validManifestJson() + '\n```';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: fenced }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'Card component', sessionId: 'sess_006' });

      expect(result.source).toBe('llm');
      expect(result.colorPalette.primary).toBe('hsl(210 90% 50%)');
    });

    it('returns an artifactId string', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: validManifestJson() }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'Login form', sessionId: 'sess_007' });

      expect(typeof result.artifactId).toBe('string');
      expect(result.artifactId.length).toBeGreaterThan(0);
    });

    it('defaults sessionId to "unknown" and turn to 0 when omitted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: validManifestJson() }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'Anything' });

      // Just verifying it does not throw
      expect(result).toBeDefined();
    });
  });

  // ── Partial field coercions ────────────────────────────────────────────────

  describe('partial field coercions', () => {
    it('falls back colorPalette defaults for missing string fields', async () => {
      const partial = JSON.stringify({
        colorPalette: { primary: 'hsl(0 0% 0%)' }, // only primary provided
        rationale: 'Test.',
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: partial }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'X', sessionId: 'sess_008' });

      expect(result.colorPalette.primary).toBe('hsl(0 0% 0%)');
      expect(result.colorPalette.secondary).toBe(DEFAULT_MANIFEST.colorPalette.secondary);
    });

    it('falls back spacing.scale when scale is not all-numbers', async () => {
      const partial = JSON.stringify({
        spacing: { basePx: 8, scale: ['a', 'b', 'c'] },
        rationale: 'Test.',
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: partial }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'X', sessionId: 'sess_009' });

      expect(result.spacing.scale).toEqual(DEFAULT_MANIFEST.spacing.scale);
    });

    it('falls back glassmorphism defaults when field is absent', async () => {
      const partial = JSON.stringify({ rationale: 'No glass.' });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: partial }),
      }));

      const result = await reasoner.reason({ uiRequirement: 'X', sessionId: 'sess_010' });

      expect(result.glassmorphism).toEqual(DEFAULT_MANIFEST.glassmorphism);
    });
  });
});
