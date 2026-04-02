/**
 * Runners: execution logic for linting files and simulations
 */

import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    FORBIDDEN_STEP_JSON,
    REQUIRED_FILES,
    SIMULATION_INVOKE_CAPTURE,
    SimulationLintResult,
    FileLintResult,
    lintJsonFormat,
    lintExecuteStructure,
    lintReceivedJsonExecuteSanitized,
    lintFirstRequest,
    lintFirstResponse,
    lintDirectoryStructure,
    lintRequiredFiles,
    lintStepTransformContract,
    lintFormParity,
} from './registry.js';

// ============================================
// Основные функции
// ============================================

export interface LintSimulationOptions {
    fix: boolean;
    stepContract: boolean;
}

export function lintFile(filePath: string, filename: string, simPath: string, stepNumber: number | null, fix: boolean): FileLintResult {
    const result: FileLintResult = {
        file: filename,
        valid: true,
        errors: []
    };

    if (!existsSync(filePath)) {
        return result;
    }

    let content: string;
    try {
        content = readFileSync(filePath, 'utf-8');
    } catch (err: any) {
        result.valid = false;
        result.errors.push({
            path: filePath,
            message: `Cannot read file: ${err.message}`,
            severity: 'error',
            fixable: false
        });
        return result;
    }

    const formatErrors = lintJsonFormat(filePath, content);
    result.errors.push(...formatErrors);

    let data: any;
    try {
        data = JSON.parse(content);
    } catch {
        return result;
    }

    if (filename === 'response.json') {
        const executeErrors = lintExecuteStructure(data, filePath);
        result.errors.push(...executeErrors);
    }

    if (filename === 'received.json') {
        result.errors.push(...lintReceivedJsonExecuteSanitized(data, filePath));
    }

    if (stepNumber === 1) {
        if (filename === 'request.json') {
            result.errors.push(...lintFirstRequest(data, filePath));
        } else if (filename === 'response.json') {
            result.errors.push(...lintFirstResponse(data, filePath));
        }
    }

    // Fix trailing commas
    if (fix && formatErrors.some(e => e.fixable && e.message.includes('trailing'))) {
        const fixed = content.replace(/,(\s*[\]}])/g, '$1');
        try {
            writeFileSync(filePath, fixed, 'utf-8');
            console.log(`  ✅ Fixed trailing commas in ${filename}`);
        } catch (err: any) {
            result.errors.push({
                path: filePath,
                message: `Cannot fix trailing commas: ${err.message}`,
                severity: 'warning',
                fixable: false
            });
        }
    }

    if (result.errors.length > 0) {
        result.valid = result.errors.filter(e => e.severity === 'error').length === 0;
    }

    return result;
}

export function lintSimulation(simPath: string, simName: string, opts: LintSimulationOptions): SimulationLintResult {
    const {fix, stepContract} = opts;
    const result: SimulationLintResult = {
        name: simName,
        path: simPath,
        valid: true,
        files: [],
        errors: []
    };

    const dirErrors = lintDirectoryStructure(simPath, simName);
    result.errors.push(...dirErrors);

    // Check root level files first
    // Check for step directories first (more common pattern)
    let foundSteps = false;
    if (existsSync(simPath)) {
        const entries = readdirSync(simPath, {withFileTypes: true});
        const substepDirRe = /^\d+-sub-\d+$/;

        for (const entry of entries) {
            // Check step directories (numeric like 1, 2, 3)
            if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                foundSteps = true;
                const stepPath = join(simPath, entry.name);
                const stepNum = parseInt(entry.name);

                try {
                    const stepFiles = readdirSync(stepPath);
                    for (const stepFile of stepFiles) {
                        if (!stepFile.endsWith('.json')) continue;
                        if (FORBIDDEN_STEP_JSON.has(stepFile)) {
                            result.errors.push({
                                path: `${entry.name}/${stepFile}`,
                                message: `Forbidden artifact in golden step: ${stepFile}. Use response.json + received.json; capture runs write ${SIMULATION_INVOKE_CAPTURE} (gitignored). See AGENTS.md / simulations/SCHEMA.md.`,
                                severity: 'error',
                                fixable: false
                            });
                            continue;
                        }
                        const filePath = join(stepPath, stepFile);
                        const fileResult = lintFile(filePath, stepFile, simPath, stepNum, fix);
                        result.files.push(fileResult);
                    }
                    if (stepContract) {
                        result.errors.push(...lintStepTransformContract(stepPath, entry.name));
                    }

                    // Check form parity between response.json and received.json
                    const responseJsonPath = join(stepPath, 'response.json');
                    const receivedJsonPath = join(stepPath, 'received.json');
                    result.errors.push(...lintFormParity(responseJsonPath, receivedJsonPath));
                } catch {
                    // Skip if cannot read
                }
            } else if (entry.isDirectory() && substepDirRe.test(entry.name)) {
                foundSteps = true;
                const subPath = join(simPath, entry.name);
                const parentStep = parseInt(entry.name.split('-')[0], 10);
                try {
                    for (const subFile of readdirSync(subPath)) {
                        if (!subFile.endsWith('.json')) continue;
                        if (FORBIDDEN_STEP_JSON.has(subFile)) {
                            result.errors.push({
                                path: `${entry.name}/${subFile}`,
                                message: `Forbidden artifact in interrupt substep: ${subFile}. Use response.json; capture runs write ${SIMULATION_INVOKE_CAPTURE}.`,
                                severity: 'error',
                                fixable: false
                            });
                            continue;
                        }
                        const filePath = join(subPath, subFile);
                        const fileResult = lintFile(filePath, subFile, simPath, parentStep, fix);
                        result.files.push(fileResult);
                    }
                    if (stepContract) {
                        result.errors.push(...lintStepTransformContract(subPath, entry.name));
                    }
                } catch {
                    // Skip if cannot read
                }
            }
        }
    }

    // If no step directories, check root level files
    if (!foundSteps) {
        const requiredErrors = lintRequiredFiles(simPath);
        result.errors.push(...requiredErrors);
        
        // Also check root level JSON files
        if (existsSync(simPath)) {
            const entries = readdirSync(simPath, {withFileTypes: true});
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.json')) {
                    const filePath = join(simPath, entry.name);
                    const stepMatch = entry.name.match(/^(\d+)\//);
                    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : null;
                    const fileResult = lintFile(filePath, entry.name, simPath, stepNumber, fix);
                    result.files.push(fileResult);
                }
            }
        }
        if (stepContract && existsSync(join(simPath, 'request.json'))) {
            result.errors.push(...lintStepTransformContract(simPath, simName));
        }
    } else {
        // Numbered steps: any folder with request.json must have the full step bundle
        const substepDirReNum = /^\d+-sub-\d+$/;
        for (const entry of readdirSync(simPath, {withFileTypes: true})) {
            if (!entry.isDirectory()) continue;
            if (substepDirReNum.test(entry.name)) continue;
            if (!/^\d+$/.test(entry.name)) continue;
            const stepPath = join(simPath, entry.name);
            if (!existsSync(join(stepPath, 'request.json'))) continue;
            for (const filename of REQUIRED_FILES) {
                const filePath = join(stepPath, filename);
                if (!existsSync(filePath)) {
                    result.errors.push({
                        path: `${entry.name}/${filename}`,
                        message: `Required file missing: ${entry.name}/${filename}`,
                        severity: 'error',
                        fixable: false
                    });
                }
            }
        }
    }

    const hasErrors = result.errors.some(e => e.severity === 'error');
    const hasFileErrors = result.files.some(f => !f.valid);

    result.valid = !hasErrors && !hasFileErrors;

    return result;
}
