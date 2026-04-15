#!/usr/bin/env tsx
/**
 * Contract debt report for CI: structural validity vs warning counts (incl. optional --step-contract delta).
 * Does not fail the process — use exit 0 so workflows can run this for visibility only.
 */
import {execSync} from 'node:child_process';

interface LintErr {
    severity?: string;
}

interface LintSim {
    name?: string;
    errors?: LintErr[];
    files?: {errors?: LintErr[]}[];
}

interface LintOut {
    valid?: boolean;
    simulations?: LintSim[];
}

interface ValSim {
    name?: string;
    warnings?: string[];
    warningCount?: number;
    files?: {warnings?: string[]}[];
}

interface ValOut {
    valid?: boolean;
    structuralValid?: boolean;
    contractComplete?: boolean;
    warningCount?: number;
    simulations?: ValSim[];
}

function parseJsonFromStdout(raw: string): unknown {
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) {
        throw new Error('Command did not print JSON');
    }
    return JSON.parse(raw.slice(jsonStart));
}

function countLintWarnings(o: LintOut): number {
    let n = 0;
    for (const sim of o.simulations ?? []) {
        for (const e of sim.errors ?? []) {
            if (e?.severity === 'warning') n++;
        }
        for (const f of sim.files ?? []) {
            for (const e of f?.errors ?? []) {
                if (e?.severity === 'warning') n++;
            }
        }
    }
    return n;
}

function countValidateWarnings(o: ValOut): number {
    if (typeof o.warningCount === 'number') {
        return o.warningCount;
    }
    let n = 0;
    for (const sim of o.simulations ?? []) {
        n += (sim.warnings ?? []).length;
        for (const f of sim.files ?? []) {
            n += (f.warnings ?? []).length;
        }
    }
    return n;
}

function main() {
    const lint = parseJsonFromStdout(
        execSync('npm run -s sim:lint -- --all --json', {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
    ) as LintOut;
    const val = parseJsonFromStdout(
        execSync('npm run -s sim:validate -- --all --json', {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
    ) as ValOut;
    const lintSc = parseJsonFromStdout(
        execSync('npm run -s sim:lint -- --all --json --step-contract', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        })
    ) as LintOut;
    const valSc = parseJsonFromStdout(
        execSync('npm run -s sim:validate -- --all --json --step-contract', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        })
    ) as ValOut;

    const lw = countLintWarnings(lint);
    const vw = countValidateWarnings(val);
    const lwSc = countLintWarnings(lintSc);
    const vwSc = countValidateWarnings(valSc);

    const bySimulation = (valSc.simulations ?? []).map(s => {
        const wc =
            typeof s.warningCount === 'number'
                ? s.warningCount
                : (s.warnings ?? []).length +
                  (s.files ?? []).reduce((a, f) => a + (f.warnings ?? []).length, 0);
        return {
            name: s.name,
            warningCount: wc,
            warnings: [...(s.warnings ?? [])],
        };
    });

    const out = {
        rule: 'structural = lint.valid && validate.valid; contract debt = warnings (use --step-contract for UA-S-02 extras)',
        structural: {
            lintValid: Boolean(lint.valid),
            validateValid: Boolean(val.valid),
            lintWarnings: lw,
            validateWarnings: vw,
        },
        stepContract: {
            lintWarnings: lwSc,
            validateWarnings: vwSc,
            extraLintWarnings: lwSc - lw,
            extraValidateWarnings: vwSc - vw,
        },
        bySimulation: bySimulation.filter(s => s.warningCount > 0),
    };

    console.log(JSON.stringify(out, null, 2));
}

main();
