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
}

// ============================================
// Scanner: list simulations
// ============================================

export function getAllSimulations(): {path: string; name: string}[] {
    const simulations: {path: string; name: string}[] = [];

    if (!existsSync(SIMULATIONS_DIR)) {
        return simulations;
    }

    const entries = readdirSync(SIMULATIONS_DIR, {withFileTypes: true});

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subDir = join(SIMULATIONS_DIR, entry.name);
            const subEntries = readdirSync(subDir, {withFileTypes: true});

            const substepDirRe = /^\d+-sub-\d+$/;
            for (const subEntry of subEntries) {
                if (!subEntry.isDirectory()) continue;
                if (substepDirRe.test(subEntry.name)) continue;
                simulations.push({
                    path: join(subDir, subEntry.name),
                    name: `${entry.name}/${subEntry.name}`
                });
            }

            const mainSimPath = join(SIMULATIONS_DIR, entry.name);
            if (
                existsSync(join(mainSimPath, 'request.json')) &&
                existsSync(join(mainSimPath, 'response.json'))
            ) {
                simulations.push({
                    path: mainSimPath,
                    name: entry.name
                });
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
