/**
 * DesignReasoner — ADR-0061: Hierarchical Design Reasoner (Two-Phase UI Generation)
 *
 * Phase 1 of the two-phase UI generation pipeline.
 *
 * Calls the AI Hub with a *design-focused* system prompt to produce a
 * `DesignManifest` — a structured JSON document covering HSL color palettes,
 * typography, spacing, shadows, radii, animation curves, glassmorphism tokens,
 * and a rationale paragraph.
 *
 * Callers (Coder agents, prompt assemblers) use the manifest as immutable
 * context when generating Vue/React component code (Phase 2).
 *
 * Writer: 'design-reasoner' for DESIGN_MANIFEST artifacts.
 *
 * Environment variables:
 *   DESIGN_AI_HUB_URL — AI Hub base URL (default: AI_HUB_URL ?? 'http://localhost:11434')
 *   DESIGN_MODEL      — Model to use for design reasoning (default: model from AI_HUB_URL)
 */

import { randomUUID } from 'node:crypto';
import { ArtifactStore, createArtifactWriteInput } from '../core/artifact-store.js';
import { logger, resolveAiHubBaseUrlWithModuleEnv, tryParseJsonFromLlmText } from '@a2a/server-utils';
import { fetchAiHubGenerateText } from '../../utils/ai-hub-generate.js';

// ── Public types ──────────────────────────────────────────────────────────────

/** HSL color token set */
export interface ColorPalette {
  /** Primary brand colour, e.g. "hsl(220 90% 56%)" */
  primary: string;
  /** Secondary supporting colour */
  secondary: string;
  /** Accent / highlight colour */
  accent: string;
  /** Neutral mid-tone (borders, muted text) */
  neutral: string;
  /** Surface / card background */
  surface: string;
  /** Main body text colour */
  text: string;
}

/** Typography token set */
export interface Typography {
  /** Primary typeface stack, e.g. "'Inter', sans-serif" */
  fontFamily: string;
  /** Heading typeface stack (may be the same as fontFamily) */
  headingFamily: string;
  /** Base font size in rem */
  baseSizeRem: number;
  /** Scale ratio (e.g. 1.25 = Major Third) */
  scaleRatio: number;
  /** Normal body font weight */
  weightRegular: number;
  /** Heading / emphasis font weight */
  weightBold: number;
  /** Line-height for body text */
  lineHeight: number;
}

/** Spacing scale */
export interface SpacingScale {
  /** Base unit in pixels */
  basePx: number;
  /** Scale multipliers, e.g. [0.25, 0.5, 1, 2, 3, 4, 6, 8] */
  scale: number[];
}

/** Named shadow tokens */
export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/** Border-radius tokens */
export interface RadiiTokens {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

/** Motion / animation tokens */
export interface AnimationTokens {
  /** Duration for micro-interactions (ms) */
  durationFast: number;
  /** Duration for transitions (ms) */
  durationNormal: number;
  /** Duration for page-level transitions (ms) */
  durationSlow: number;
  /** CSS easing curve for entrances */
  easeIn: string;
  /** CSS easing curve for exits */
  easeOut: string;
  /** CSS easing curve for emphasis */
  easeInOut: string;
}

/** Glassmorphism tokens */
export interface GlassmorphismTokens {
  /** backdrop-filter: blur value in pixels */
  blurPx: number;
  /** Background opacity (0.0–1.0) for frosted-glass panels */
  backgroundOpacity: number;
  /** Border opacity for glass panels */
  borderOpacity: number;
}

/** The complete design manifest produced by Phase 1 */
export interface DesignManifest {
  /** Unique artifact ID of the stored DESIGN_MANIFEST */
  artifactId: string;
  colorPalette: ColorPalette;
  typography: Typography;
  spacing: SpacingScale;
  shadows: ShadowTokens;
  radii: RadiiTokens;
  animations: AnimationTokens;
  glassmorphism: GlassmorphismTokens;
  /** Paragraph explaining the aesthetic intent */
  rationale: string;
  /** Whether this was produced by the LLM or the deterministic fallback */
  source: 'llm' | 'default';
}

export interface DesignReasonerInput {
  /** Original UI requirement text (used as the design brief) */
  uiRequirement: string;
  sessionId?: string;
  turn?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPONENT_ID = 'design-reasoner';

const DEFAULT_MODEL = process.env['DESIGN_MODEL'] ?? 'llama3';

/**
 * Deterministic fallback manifest — neutral greys + Inter + 4-pt base scale.
 * Used when the AI Hub is unavailable or returns unparseable output.
 */
export const DEFAULT_MANIFEST: Omit<DesignManifest, 'artifactId' | 'source'> = {
  colorPalette: {
    primary:   'hsl(220 90% 56%)',
    secondary: 'hsl(260 60% 50%)',
    accent:    'hsl(30 100% 60%)',
    neutral:   'hsl(220 10% 50%)',
    surface:   'hsl(220 15% 97%)',
    text:      'hsl(220 20% 12%)',
  },
  typography: {
    fontFamily:    "'Inter', 'Segoe UI', sans-serif",
    headingFamily: "'Inter', 'Segoe UI', sans-serif",
    baseSizeRem:   1,
    scaleRatio:    1.25,
    weightRegular: 400,
    weightBold:    700,
    lineHeight:    1.5,
  },
  spacing: {
    basePx: 4,
    scale:  [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
  },
  shadows: {
    sm: '0 1px 2px hsl(220 20% 12% / 0.06)',
    md: '0 4px 12px hsl(220 20% 12% / 0.10)',
    lg: '0 8px 24px hsl(220 20% 12% / 0.14)',
    xl: '0 16px 48px hsl(220 20% 12% / 0.20)',
  },
  radii: {
    sm:   '4px',
    md:   '8px',
    lg:   '16px',
    full: '9999px',
  },
  animations: {
    durationFast:   150,
    durationNormal: 250,
    durationSlow:   400,
    easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
    easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  glassmorphism: {
    blurPx:            12,
    backgroundOpacity: 0.6,
    borderOpacity:     0.15,
  },
  rationale:
    'Default manifest: neutral, accessible design system. Override via DESIGN_MODEL + AI Hub for project-specific aesthetics.',
};

// ── DesignReasoner ─────────────────────────────────────────────────────────────

export class DesignReasoner {
  private readonly aiHubBase: string;
  private readonly model: string;

  constructor(
    private readonly artifactStore: ArtifactStore,
    aiHubBase?: string,
    model = DEFAULT_MODEL,
  ) {
    this.aiHubBase = resolveAiHubBaseUrlWithModuleEnv(aiHubBase, 'DESIGN_AI_HUB_URL');
    this.model = model;
    artifactStore.registerWriter('DESIGN_MANIFEST', COMPONENT_ID);
  }

  // ── reason() ──────────────────────────────────────────────────────────────

  /**
   * Phase 1: produce a DesignManifest for the given UI requirement.
   * Stores a DESIGN_MANIFEST artifact and returns the full manifest.
   */
  async reason(input: DesignReasonerInput): Promise<DesignManifest> {
    const sessionId = input.sessionId ?? 'unknown';
    const turn      = input.turn ?? 0;

    logger.info(`[design-reasoner] Generating design manifest (session=${sessionId})`);

    const llmResult = await this._callDesignLlm(input.uiRequirement);
    if (!llmResult) {
      logger.warn('[design-reasoner] LLM unavailable or returned bad JSON — using default manifest');
    }
    const partial: Omit<DesignManifest, 'artifactId'> = llmResult ?? {
      ...DEFAULT_MANIFEST,
      source: 'default' as const,
    };

    const artifactId = await this._storeArtifact(partial, sessionId, turn);
    return { ...partial, artifactId };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _buildPrompt(uiRequirement: string): string {
    return `You are a world-class UI/UX Lead Designer. Your sole task is to produce a comprehensive design manifest for the following UI requirement.

UI REQUIREMENT:
"""
${uiRequirement}
"""

Respond with a single JSON object — no markdown fences, no prose — matching EXACTLY this schema:
{
  "colorPalette": {
    "primary":   "<hsl(...)>",
    "secondary": "<hsl(...)>",
    "accent":    "<hsl(...)>",
    "neutral":   "<hsl(...)>",
    "surface":   "<hsl(...)>",
    "text":      "<hsl(...)>"
  },
  "typography": {
    "fontFamily":    "<CSS font-family stack>",
    "headingFamily": "<CSS font-family stack>",
    "baseSizeRem":   <number>,
    "scaleRatio":    <number>,
    "weightRegular": <number>,
    "weightBold":    <number>,
    "lineHeight":    <number>
  },
  "spacing": {
    "basePx": <number>,
    "scale":  [<numbers>]
  },
  "shadows": {
    "sm": "<CSS shadow>",
    "md": "<CSS shadow>",
    "lg": "<CSS shadow>",
    "xl": "<CSS shadow>"
  },
  "radii": {
    "sm":   "<CSS value>",
    "md":   "<CSS value>",
    "lg":   "<CSS value>",
    "full": "<CSS value>"
  },
  "animations": {
    "durationFast":   <ms>,
    "durationNormal": <ms>,
    "durationSlow":   <ms>,
    "easeIn":    "<cubic-bezier(...)>",
    "easeOut":   "<cubic-bezier(...)>",
    "easeInOut": "<cubic-bezier(...)>"
  },
  "glassmorphism": {
    "blurPx":            <number>,
    "backgroundOpacity": <0.0-1.0>,
    "borderOpacity":     <0.0-1.0>
  },
  "rationale": "<one paragraph explaining the aesthetic direction>"
}

Design rules:
- Use harmonious HSL palettes; ensure WCAG AA contrast for text on surface.
- Prefer modern, premium aesthetics (Inter/Plus Jakarta, fluid scales).
- Glassmorphism should be subtle, not gaudy.`;
  }

  private async _callDesignLlm(
    uiRequirement: string,
  ): Promise<(Omit<DesignManifest, 'artifactId'>) | null> {
    try {
      const raw = await fetchAiHubGenerateText(
        this.aiHubBase,
        {
          model: this.model,
          prompt: this._buildPrompt(uiRequirement),
          stream: false,
        },
        90_000,
      );
      return this._parse(raw);
    } catch (err) {
      logger.warn(`[design-reasoner] Design LLM call failed: ${String(err)}`);
      return null;
    }
  }

  private _parse(raw: string): (Omit<DesignManifest, 'artifactId'>) | null {
    try {
      const p = tryParseJsonFromLlmText<Partial<Record<string, unknown>>>(raw);
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        return null;
      }

      const colorPalette = this._coerceColorPalette(p['colorPalette']);
      const typography   = this._coerceTypography(p['typography']);
      const spacing      = this._coerceSpacing(p['spacing']);
      const shadows      = this._coerceShadows(p['shadows']);
      const radii        = this._coerceRadii(p['radii']);
      const animations   = this._coerceAnimations(p['animations']);
      const glassmorphism = this._coerceGlassmorphism(p['glassmorphism']);

      return {
        colorPalette,
        typography,
        spacing,
        shadows,
        radii,
        animations,
        glassmorphism,
        rationale: typeof p['rationale'] === 'string'
          ? p['rationale']
          : DEFAULT_MANIFEST.rationale,
        source: 'llm',
      };
    } catch (err: unknown) {
      logger.warn('[design-reasoner] Failed to parse design manifest JSON', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // ── Field coercions (fall back to DEFAULT_MANIFEST values per field) ────────

  private _coerceColorPalette(raw: unknown): ColorPalette {
    const d = DEFAULT_MANIFEST.colorPalette;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      primary:   typeof r['primary']   === 'string' ? r['primary']   : d.primary,
      secondary: typeof r['secondary'] === 'string' ? r['secondary'] : d.secondary,
      accent:    typeof r['accent']    === 'string' ? r['accent']    : d.accent,
      neutral:   typeof r['neutral']   === 'string' ? r['neutral']   : d.neutral,
      surface:   typeof r['surface']   === 'string' ? r['surface']   : d.surface,
      text:      typeof r['text']      === 'string' ? r['text']      : d.text,
    };
  }

  private _coerceTypography(raw: unknown): Typography {
    const d = DEFAULT_MANIFEST.typography;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      fontFamily:    typeof r['fontFamily']    === 'string' ? r['fontFamily']    : d.fontFamily,
      headingFamily: typeof r['headingFamily'] === 'string' ? r['headingFamily'] : d.headingFamily,
      baseSizeRem:   typeof r['baseSizeRem']   === 'number' ? r['baseSizeRem']   : d.baseSizeRem,
      scaleRatio:    typeof r['scaleRatio']    === 'number' ? r['scaleRatio']    : d.scaleRatio,
      weightRegular: typeof r['weightRegular'] === 'number' ? r['weightRegular'] : d.weightRegular,
      weightBold:    typeof r['weightBold']    === 'number' ? r['weightBold']    : d.weightBold,
      lineHeight:    typeof r['lineHeight']    === 'number' ? r['lineHeight']    : d.lineHeight,
    };
  }

  private _coerceSpacing(raw: unknown): SpacingScale {
    const d = DEFAULT_MANIFEST.spacing;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      basePx: typeof r['basePx'] === 'number' ? r['basePx'] : d.basePx,
      scale:  Array.isArray(r['scale']) && r['scale'].every((v) => typeof v === 'number')
        ? (r['scale'] as number[])
        : d.scale,
    };
  }

  private _coerceShadows(raw: unknown): ShadowTokens {
    const d = DEFAULT_MANIFEST.shadows;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      sm: typeof r['sm'] === 'string' ? r['sm'] : d.sm,
      md: typeof r['md'] === 'string' ? r['md'] : d.md,
      lg: typeof r['lg'] === 'string' ? r['lg'] : d.lg,
      xl: typeof r['xl'] === 'string' ? r['xl'] : d.xl,
    };
  }

  private _coerceRadii(raw: unknown): RadiiTokens {
    const d = DEFAULT_MANIFEST.radii;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      sm:   typeof r['sm']   === 'string' ? r['sm']   : d.sm,
      md:   typeof r['md']   === 'string' ? r['md']   : d.md,
      lg:   typeof r['lg']   === 'string' ? r['lg']   : d.lg,
      full: typeof r['full'] === 'string' ? r['full'] : d.full,
    };
  }

  private _coerceAnimations(raw: unknown): AnimationTokens {
    const d = DEFAULT_MANIFEST.animations;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      durationFast:   typeof r['durationFast']   === 'number' ? r['durationFast']   : d.durationFast,
      durationNormal: typeof r['durationNormal'] === 'number' ? r['durationNormal'] : d.durationNormal,
      durationSlow:   typeof r['durationSlow']   === 'number' ? r['durationSlow']   : d.durationSlow,
      easeIn:    typeof r['easeIn']    === 'string' ? r['easeIn']    : d.easeIn,
      easeOut:   typeof r['easeOut']   === 'string' ? r['easeOut']   : d.easeOut,
      easeInOut: typeof r['easeInOut'] === 'string' ? r['easeInOut'] : d.easeInOut,
    };
  }

  private _coerceGlassmorphism(raw: unknown): GlassmorphismTokens {
    const d = DEFAULT_MANIFEST.glassmorphism;
    if (!raw || typeof raw !== 'object') return { ...d };
    const r = raw as Partial<Record<string, unknown>>;
    return {
      blurPx:            typeof r['blurPx']            === 'number' ? r['blurPx']            : d.blurPx,
      backgroundOpacity: typeof r['backgroundOpacity'] === 'number' ? r['backgroundOpacity'] : d.backgroundOpacity,
      borderOpacity:     typeof r['borderOpacity']     === 'number' ? r['borderOpacity']     : d.borderOpacity,
    };
  }

  private async _storeArtifact(
    manifest: Omit<DesignManifest, 'artifactId'>,
    sessionId: string,
    turn: number,
  ): Promise<string> {
    const artifactId = randomUUID();
    try {
      await this.artifactStore.write(
        createArtifactWriteInput({
          artifact_id: artifactId,
          artifact_type: 'DESIGN_MANIFEST',
          session_id: sessionId,
          turn_id: String(turn),
          schema_version: '1',
          summary: manifest.rationale.slice(0, 200),
          data: {
            colorPalette: manifest.colorPalette,
            typography: manifest.typography,
            spacing: manifest.spacing,
            shadows: manifest.shadows,
            radii: manifest.radii,
            animations: manifest.animations,
            glassmorphism: manifest.glassmorphism,
            rationale: manifest.rationale,
            source: manifest.source,
          },
        }),
        COMPONENT_ID,
      );
    } catch (err) {
      logger.warn(`[design-reasoner] Failed to store DESIGN_MANIFEST artifact: ${String(err)}`);
    }
    return artifactId;
  }
}
