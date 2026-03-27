/**
 * UA-S-02 — Single source for no-LLM vs LLM step transform expectations (aligned with simulations/SCHEMA.md).
 * Used by sim-validate when --step-contract is passed (optional; avoids warning debt on legacy goldens by default).
 */

import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

/** Canonical doc anchor (repo-relative). */
export const STEP_TRANSFORM_SCHEMA_REF = 'simulations/SCHEMA.md (Critical — no-LLM pipeline)';

/**
 * Heuristic: `response.md` absent ⇒ no LLM call for that step; server path is
 * request.json → server-transforms-request → response.json (no response.md / post-LLM transforms).
 */
export function isNoLlmStepFolder(stepDir: string): boolean {
    return !existsSync(join(stepDir, 'response.md'));
}

/**
 * Warnings for no-LLM steps that drift from SCHEMA.md rules.
 * - Expect per-step `server-transforms-request.json` (deterministic server logic).
 * - Do not use `server-transforms-response.json` without an LLM `response.md` to consume.
 */
export function noLlmStepTransformContractWarnings(stepDir: string): string[] {
    const warnings: string[] = [];
    if (!isNoLlmStepFolder(stepDir)) {
        return warnings;
    }

    const reqTf = join(stepDir, 'server-transforms-request.json');
    const resTf = join(stepDir, 'server-transforms-response.json');

    if (!existsSync(reqTf)) {
        warnings.push(
            `[step-contract] Missing server-transforms-request.json (no-LLM step; see ${STEP_TRANSFORM_SCHEMA_REF})`
        );
    }
    if (existsSync(resTf)) {
        warnings.push(
            `[step-contract] Unexpected server-transforms-response.json without response.md — SCHEMA: omit post-LLM transforms when there is no LLM step (${STEP_TRANSFORM_SCHEMA_REF})`
        );
    }
    return warnings;
}

const SUBSTEP_DIR_RE = /^\d+-sub-\d+$/;

/**
 * UA-S-02 / GR-S-11 parity: same step folders as `sim-lint --step-contract` (numbered steps + `N-sub-M`, else flat root).
 */
export function collectNoLlmStepContractWarningsForSimulation(simPath: string): string[] {
    const warnings: string[] = [];
    if (!existsSync(simPath)) {
        return warnings;
    }

    let foundSteps = false;
    const entries = readdirSync(simPath, {withFileTypes: true});

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (/^\d+$/.test(name)) {
            foundSteps = true;
            const stepPath = join(simPath, name);
            for (const w of noLlmStepTransformContractWarnings(stepPath)) {
                warnings.push(`${name}/: ${w}`);
            }
        } else if (SUBSTEP_DIR_RE.test(name)) {
            foundSteps = true;
            const stepPath = join(simPath, name);
            for (const w of noLlmStepTransformContractWarnings(stepPath)) {
                warnings.push(`${name}/: ${w}`);
            }
        }
    }

    if (!foundSteps && existsSync(join(simPath, 'request.json'))) {
        warnings.push(...noLlmStepTransformContractWarnings(simPath));
    }

    return warnings;
}
