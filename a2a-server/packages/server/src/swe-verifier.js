import { execFile } from 'node:child_process';
import vm from 'node:vm';
import { isDevelopment } from '@a2a/config';
import path from 'path';
import { createArtifactWriteInput, globalArtifactStore } from './artifact-store.js';
const RESTRICTED_PATTERNS = [
    { regex: /rm\s+-rf\s+\//, msg: 'Root/Recursive deletion attempt' },
    { regex: /chmod\s+777/, msg: 'Insecure permission change' },
    { regex: /process\.exit/, msg: 'Process termination attempt' },
    { regex: /eval\(/, msg: 'Dynamic code execution (eval)' },
    { regex: /child_process/, msg: 'Subprocess creation attempt' },
];
export class SWEVerifier {
    COMPONENT_ID = 'SWEVerifier';
    constructor() {
        globalArtifactStore.registerWriter('VERIFICATION_RESULT', this.COMPONENT_ID);
    }
    async verify(filePath, content) {
        const ext = path.extname(filePath).toLowerCase();
        // 0. Guardrails (Static Analysis)
        for (const pattern of RESTRICTED_PATTERNS) {
            if (pattern.regex.test(content)) {
                const res = {
                    file_path: filePath,
                    stage: 'guardrails',
                    passed: false,
                    errors: [`Security violation: ${pattern.msg}`],
                    timestamp: new Date().toISOString()
                };
                await this.emitArtifact(res);
                return res;
            }
        }
        // 1. Zero-stage semantic check
        let zeroStagePassed = true;
        const errors = [];
        if (ext === '.json') {
            try {
                JSON.parse(content);
            }
            catch (e) {
                zeroStagePassed = false;
                errors.push(`JSON parsing error: ${e.message}`);
            }
        }
        else if (ext === '.js') {
            try {
                const context = vm.createContext(Object.create(null));
                const script = new vm.Script(content, { filename: filePath });
                script.runInContext(context, { timeout: 5000 });
            }
            catch (e) {
                // VM run failed - could be syntax or semantic error
                zeroStagePassed = false;
                errors.push(`VM semantic check failed: ${e.message}`);
            }
        }
        if (!zeroStagePassed) {
            const res = {
                file_path: filePath,
                stage: 'zero_stage',
                passed: false,
                errors,
                timestamp: new Date().toISOString()
            };
            await this.emitArtifact(res);
            return res;
        }
        // 2. Hero-stage sandbox execution
        const testCommand = process.env.TEST_COMMAND;
        if (testCommand && isDevelopment) {
            try {
                // Split command into argv array for safe execution
                const argv = testCommand.split(/\s+/).filter(Boolean);
                if (argv.length === 0) {
                    throw new Error('TEST_COMMAND is set but empty after parsing');
                }
                const file = argv[0];
                const args = argv.slice(1);
                const { stdout, stderr } = await new Promise((resolve, reject) => {
                    execFile(file, args, { timeout: 30000, encoding: 'utf8' }, (error, stdout, stderr) => {
                        if (error) {
                            reject({ error, stdout, stderr });
                        }
                        else {
                            resolve({ stdout, stderr });
                        }
                    });
                });
                const res = {
                    file_path: filePath,
                    stage: 'hero_stage',
                    passed: true,
                    output: stdout + '\n' + stderr,
                    timestamp: new Date().toISOString()
                };
                await this.emitArtifact(res);
                return res;
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                const res = {
                    file_path: filePath,
                    stage: 'hero_stage',
                    passed: false,
                    errors: [errorMessage],
                    timestamp: new Date().toISOString()
                };
                await this.emitArtifact(res);
                return res;
            }
        }
        // Implicit pass
        const res = {
            file_path: filePath,
            stage: 'hero_stage',
            passed: true,
            timestamp: new Date().toISOString()
        };
        await this.emitArtifact(res);
        return res;
    }
    async emitArtifact(res) {
        await globalArtifactStore.write(createArtifactWriteInput({
            artifact_id: `verify-${Date.now()}`,
            artifact_type: 'VERIFICATION_RESULT',
            session_id: 'unknown',
            turn_id: 'unknown',
            created_at: res.timestamp,
            schema_version: '1.0',
            data: res,
            summary: `SWEVerifier: ${res.file_path} [${res.stage}] -> ${res.passed ? 'PASS' : 'FAIL'}`,
            severity: res.passed ? 'info' : 'critical',
        }), this.COMPONENT_ID);
    }
}
//# sourceMappingURL=swe-verifier.js.map