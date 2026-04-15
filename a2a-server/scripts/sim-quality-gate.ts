#!/usr/bin/env tsx

import {execSync} from 'node:child_process';

interface LintErrorEntry {
    severity?: string;
}

interface LintFileResult {
    errors?: LintErrorEntry[];
}

interface LintSimulationResult {
    errors?: LintErrorEntry[];
    files?: LintFileResult[];
}

interface LintOutput {
    valid?: boolean;
    simulations?: LintSimulationResult[];
}

interface ValidateFileResult {
    warnings?: string[];
}

interface ValidateSimulationResult {
    warnings?: string[];
    files?: ValidateFileResult[];
}

interface ValidateOutput {
    valid?: boolean;
    simulations?: ValidateSimulationResult[];
}

function countLintWarnings(output: LintOutput): number {
    const simulations = output.simulations ?? [];
    let totalWarnings = 0;

    for (const sim of simulations) {
        for (const entry of sim.errors ?? []) {
            if (entry?.severity === 'warning') {
                totalWarnings += 1;
            }
        }
        for (const file of sim.files ?? []) {
            for (const entry of file.errors ?? []) {
                if (entry?.severity === 'warning') {
                    totalWarnings += 1;
                }
            }
        }
    }

    return totalWarnings;
}

function countValidateWarnings(output: ValidateOutput): number {
    const simulations = output.simulations ?? [];
    let totalWarnings = 0;

    for (const sim of simulations) {
        totalWarnings += (sim.warnings ?? []).length;
        for (const file of sim.files ?? []) {
            totalWarnings += (file.warnings ?? []).length;
        }
    }

    return totalWarnings;
}

function runJsonCommand(command: string) {
    const raw = execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) {
        throw new Error(`Command did not produce JSON output: ${command}`);
    }
    return JSON.parse(raw.slice(jsonStart));
}

function main() {
    const lintOutput = runJsonCommand('npm run -s sim:lint -- --all --json') as LintOutput;
    const validateOutput = runJsonCommand('npm run -s sim:validate -- --all --json') as ValidateOutput;

    const lintWarnings = countLintWarnings(lintOutput);
    const validateWarnings = countValidateWarnings(validateOutput);
    const totalWarnings = lintWarnings + validateWarnings;
    const structuralValid = Boolean(lintOutput.valid) && Boolean(validateOutput.valid);
    const clean = structuralValid && totalWarnings === 0;

    const result = {
        rule: 'clean = lint.valid && validate.valid && warnings == 0',
        valid: structuralValid,
        clean,
        warningCounts: {
            lint: lintWarnings,
            validate: validateWarnings,
            total: totalWarnings
        }
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(clean ? 0 : 1);
}

main();
