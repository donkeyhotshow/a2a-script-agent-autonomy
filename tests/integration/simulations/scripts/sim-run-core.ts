/** 
 * Shared simulation runner (no CLI argv side effects).
 * Used by sim-run.ts and tests/simulation-based.test.ts.
 */

import {readFileSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

/** Resolve display name for a sim dir (e.g. \"dialog/3\"). */
export function simDisplayName(baseDir: string, fullPath: string): string {
    return relative(baseDir, fullPath).split(/[/\\\\]/).join('/');
}

/**
 * Find all simulation dirs: legacy (simulations/<name>) and step-based (simulations/<name>/<step>).
 * Aligned with simulations/SCHEMA.md and sim-report.ts.
 */
export function findSimulationDirs(baseDir: string): string[] {
    const dirs: string[] = [];

    try {
        const entries = readdirSync(baseDir);

        for (const entry of entries) {
            const fullPath = join(baseDir, entry);
            const stat = statSync(fullPath);

            if (!stat.isDirectory()) continue;

            const legacyRequestPath = join(fullPath, 'request.json');
            if (existsSync(legacyRequestPath)) {
                dirs.push(fullPath);
                continue;
            }

            const stepEntries = readdirSync(fullPath);
            for (const step of stepEntries) {
                const stepPath = join(fullPath, step);
                const stepStat = statSync(stepPath);
                if (!stepStat.isDirectory()) continue;
                if (existsSync(join(stepPath, 'request.json'))) {
                    dirs.push(stepPath);
                }
            }
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error reading directory: ${msg}`);
    }

    return dirs.sort();
}

/** Run a single simulation; baseDir is used for display name (e.g. dialog/3). */
export async function runSingleSimulation(simDir: string, baseDir: string): Promise<boolean> {
    const requestPath = join(simDir, 'request.json');
    const responsePath = join(simDir, 'invoke-capture.json');
    const simName = simDisplayName(baseDir, simDir) || simDir.split(/[/\\\\]/).pop() || simDir;

    console.log(`\n📁 Simulation: ${simName}`);
    console.log(`   Path: ${simDir}`);

    let requestData: unknown;
    try {
        const requestContent = readFileSync(requestPath, 'utf-8');
        requestData = JSON.parse(requestContent) as Record<string, unknown>;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error reading request.json: ${msg}`);
        return false;
    }

    const rd = requestData as Record<string, any>;
    const message = rd.task ||
        rd.message ||
        rd.result?.message ||
        rd.context?.task ||
        rd.context?.message ||
        'N/A';

    const context = rd.context?.version
        ? rd.context
        : {
            version: '1.0',
            session_id: 'stateless',
            ...rd.context
        };

    console.log(`   Action: ${rd.action || 'N/A'}`);
    console.log(`   Task: ${message}`);

    try {
        const {invoke} = await import('../../../a2a-server/src/services/utils/invoke.service.js');
        const {requestService} = await import('../../../a2a-server/src/services/core/request/request.service.js');

        console.log('\n⏳ Invoking server...');

        const invokeInput: Record<string, unknown> = {
            context: context,
        };

        if (rd.result && typeof rd.result === 'object') {
            invokeInput.result = rd.result;
        }

        if (rd.task) {
            invokeInput.task = rd.task;
        } else if (rd.message) {
            invokeInput.message = rd.message;
        } else if (rd.result?.message) {
            invokeInput.message = rd.result.message;
        } else if (rd.result?.choice) {
            invokeInput.selectedAction = { actionId: rd.result.choice };
        }

        if (rd.action) {
            invokeInput.action = rd.action;
        }

        if (rd.selectedAction) {
            invokeInput.selectedAction = rd.selectedAction;
        }

        if (rd.stepId) {
            invokeInput.stepId = rd.stepId;
            invokeInput.stepResult = rd.result;
        }

        const {promiseId} = await invoke('simulation-client', invokeInput);

        console.log(`   Promise ID: ${promiseId}`);

        let result = null;
        const maxAttempts = 60;
        const delay = 500;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, delay));

            result = await requestService.getResult(promiseId);

            if (result && result.status === 'completed') {
                console.log(`   Status: ${result.status} (attempt ${i + 1})`);
                break;
            }

            if (i % 10 === 0) {
                console.log(`   Waiting... (attempt ${i + 1}/${maxAttempts})`);
            }
        }

        if (!result) {
            console.error('❌ No result after timeout');
            return false;
        }

        const formatDate = (d: any) => d?.toISOString ? d.toISOString() : d;

        const response = {
            success: result.status === 'completed',
            data: {
                id: result.id,
                promiseId: result.promiseId,
                clientId: result.clientId,
                status: result.status,
                priority: result.priority,
                context: result.context,
                message: result.message,
                codeBlocks: result.codeBlocks,
                result: result.result,
                error: result.error,
                createdAt: formatDate(result.createdAt),
                startedAt: formatDate(result.startedAt),
                completedAt: formatDate(result.completedAt),
            }
        };

        writeFileSync(responsePath, JSON.stringify(response, null, 2));
        console.log(`\n✅ Response saved to: invoke-capture.json`);
        console.log(`   Outcome: ${result.result?.['outcome'] || 'N/A'}`);

        return true;

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\n❌ Error: ${msg}`);
        return false;
    }
}
