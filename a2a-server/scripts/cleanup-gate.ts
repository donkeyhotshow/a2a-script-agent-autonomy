#!/usr/bin/env tsx
/**
 * RF-S-04: cleanup acceptance — unit tests + sim:lint valid + sim:validate valid.
 * Unlike sim:quality, warnings do not fail the gate (debt can remain while structure is valid).
 */
import {execSync} from 'node:child_process';

function runJsonCommand(command: string): {valid?: boolean; warningCount?: number} {
    const raw = execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) {
        throw new Error(`Command did not produce JSON output: ${command}`);
    }
    return JSON.parse(raw.slice(jsonStart));
}

function main() {
    execSync('npm run test', {stdio: 'inherit'});
    const lintOutput = runJsonCommand('npm run -s sim:lint -- --all --json');
    const validateOutput = runJsonCommand('npm run -s sim:validate -- --all --json');
    const lintValid = Boolean(lintOutput.valid);
    const validateValid = Boolean(validateOutput.valid);
    const ok = lintValid && validateValid;

    console.log(
        JSON.stringify(
            {
                rule: 'tests pass && sim:lint.valid && sim:validate.valid (warnings allowed)',
                ok,
                lint: {valid: lintValid},
                validate: {
                    valid: validateValid,
                    warningCount: validateOutput.warningCount,
                    contractComplete: validateOutput.contractComplete,
                },
            },
            null,
            2
        )
    );
    process.exit(ok ? 0 : 1);
}

main();
