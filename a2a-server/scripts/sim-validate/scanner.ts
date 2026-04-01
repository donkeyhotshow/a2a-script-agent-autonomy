#!/usr/bin/env tsx

/**
 * Scanner — simulation discovery for sim-validate CLI
 */

import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');

/** Repo-root `simulations/` (three levels up from this file: sim-validate → scripts → a2a-server → repo). */
export const SIMULATIONS_DIR = join(__dirname, '..', '..', '..', 'simulations');

// ============================================
// Types
// ============================================

export interface CliArgs {
    sim: string | null;
    all: boolean;
    json: boolean;
    verbose: boolean;
    help: boolean;
    /** If true, validate raw JSON only (no fixture normalization). */
    strict: boolean;
    /** SCHEMA.md no-LLM step transform contract (optional warnings). */
    stepContract: boolean;
    /** If true, include substep folders (e.g., "3-sub-1") in validation. */
    includeSubsteps: boolean;
}

// ============================================
// Scanner: list simulations
// ============================================

export function getAllSimulations(includeSubsteps = false): {path: string; name: string}[] {
    const simulations: {path: string; name: string}[] = [];

    if (!existsSync(SIMULATIONS_DIR)) {
        return simulations;
    }

    const entries = readdirSync(SIMULATIONS_DIR, {withFileTypes: true});

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subDir = join(SIMULATIONS_DIR, entry.name);
            const subEntries = readdirSync(subDir, {withFileTypes: true});

            const stepDirRe = /^\d+$/;
            const substepDirRe = /^\d+-sub-\d+$/;

            for (const subEntry of subEntries) {
                if (!subEntry.isDirectory()) continue;
                if (substepDirRe.test(subEntry.name)) continue; // Skip "3-sub-1" by default

                const simBaseDir = join(subDir, subEntry.name);
                const simBaseEntries = readdirSync(simBaseDir, {withFileTypes: true});

                // Check if this simulation has step folders (numeric directories like "1", "2", "3")
                let hasStepFolders = false;
                for (const stepEntry of simBaseEntries) {
                    if (!stepEntry.isDirectory()) continue;
                    if (stepDirRe.test(stepEntry.name)) {
                        hasStepFolders = true;
                        // This is a step folder (e.g., "1", "4", "7")
                        simulations.push({
                            path: join(simBaseDir, stepEntry.name),
                            name: `${entry.name}/${subEntry.name}/${stepEntry.name}`
                        });
                    }
                    // Also include substep folders if flag is set
                    if (includeSubsteps && substepDirRe.test(stepEntry.name)) {
                        simulations.push({
                            path: join(simBaseDir, stepEntry.name),
                            name: `${entry.name}/${subEntry.name}/${stepEntry.name}`
                        });
                    }
                }

                // If no step folders, add as legacy nested simulation or flat structure
                if (!hasStepFolders) {
                    // Check if flat structure (request.json/response.json at base)
                    if (
                        existsSync(join(simBaseDir, 'request.json')) &&
                        existsSync(join(simBaseDir, 'response.json'))
                    ) {
                        simulations.push({
                            path: simBaseDir,
                            name: `${entry.name}/${subEntry.name}`
                        });
                    }
                    // Else: legacy nested structure - add sub-subdirectories
                    else {
                        for (const nestedEntry of simBaseEntries) {
                            if (!nestedEntry.isDirectory()) continue;
                            if (substepDirRe.test(nestedEntry.name)) continue;
                            simulations.push({
                                path: join(simBaseDir, nestedEntry.name),
                                name: `${entry.name}/${subEntry.name}/${nestedEntry.name}`
                            });
                        }
                    }
                }
            }
        }
    }

    return simulations;
}

// ============================================
// CLI
// ============================================

export function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let sim: string | null = null;
    let all = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--sim' && i + 1 < args.length) {
            sim = args[i + 1];
            i++;
        } else if (arg === '--all') {
            all = true;
        }
    }

    return {
        sim,
        all,
        json: args.includes('--json') || args.includes('-j'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        help: args.includes('--help') || args.includes('-h'),
        strict: args.includes('--strict'),
        stepContract: args.includes('--step-contract'),
        includeSubsteps: args.includes('--include-substeps'),
    };
}

export function printHelp() {
    console.log(`
🛠️  Simulation & Schema Validator CLI

Использование: npm run sim:validate [options]

Опции:
  --sim <name>       Имя симуляции для валидации (например: agent-coder/3, fix-vue-imports)
  --all              Валидировать все симуляции
  --json, -j         Вывод в формате JSON
  --verbose, -v      Подробный вывод
  --strict           Без нормализации (сырой JSON против схемы)
  --step-contract    Доп. предупреждения: no-LLM шаги и server-transforms-*.json (см. simulations/SCHEMA.md)
  --include-substeps Включить подпапки substeps (например, "3-sub-1") в валидацию
  --help, -h         Показать эту справку

По умолчанию request/response нормализуются: снимаются promiseId/даты, обёртка success/data,
добавляются недостающие context.execution / execution.step — чтобы дампы с сервера проходили проверку.
  Для server-transforms-*.json по умолчанию только JSON + fixtures; --strict включает AJV по server-transform.schema.json.

Примеры:
  npm run sim:validate -- --sim agent-coder/3
  npm run sim:validate -- --all --verbose
  npm run sim:validate -- --sim fix-vue-imports --json

Валидируемые файлы:
  - request.json              → server-invoke-request.schema.json
  - response.json             → server-invoke-response-execute.schema.json
  - client.json, received.json → только JSON (контракт Web ↔ Client API)
  - server-transforms-*.json  → server-transform.schema.json
  - Transform pipelines: any step with "fromFile" must have that file next to the step (e.g. response.md)
`);
}
