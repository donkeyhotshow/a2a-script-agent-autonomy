#!/usr/bin/env tsx

/**
 * Script to run simulations from a2a-server
 *
 * Usage:
 *   npx tsx scripts/run-simulation.ts <simulation-dir>
 *
 * Example:
 *   npx tsx scripts/run-simulation.ts ../../a2a-ai-hub/simulation/sync/agent/1
 *
 * Result:
 *   - Reads request.json
 *   - Calls invoke() directly
 *   - Saves response to invoke-capture.json (not golden)
 */

import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const simDir = process.argv[2];
if (!simDir) {
    console.error('Usage: npx tsx scripts/run-simulation.ts <path-to-step-dir>');
    console.error('Example: npx tsx scripts/run-simulation.ts ../../a2a-ai-hub/simulation/sync/agent/1');
    process.exit(1);
}

const requestPath = join(simDir, 'request.json');
const responsePath = join(simDir, 'invoke-capture.json');

console.log(`\n📁 Simulation: ${simDir}`);
console.log(`   Request: ${requestPath}`);

// Read request.json
let requestData: any;
try {
    const requestContent = readFileSync(requestPath, 'utf-8');
    requestData = JSON.parse(requestContent);
} catch (err: any) {
    console.error(`❌ Error reading request.json: ${err.message}`);
    process.exit(1);
}

// Various request formats
const message = requestData.task ||
    requestData.message ||
    requestData.context?.task ||
    requestData.context?.message ||
    'N/A';

// Context - base format
const context = requestData.context?.version
    ? requestData.context
    : {
        version: '1.0',
        session_id: 'stateless',
        ...requestData.context
    };

console.log(`   Request action: ${requestData.action}`);
console.log(`   Request task: ${message}`);

// Call server code directly
async function runSimulation() {
    try {
        const {invoke} = await import('../../../a2a-server/src/services/utils/invoke.service.js');
        const {requestService} = await import('../../../a2a-server/src/services/core/request/request.service.js');
        const {actionRegistry} = await import('../../../a2a-server/src/actions/action-registry.js');
        try {
            await actionRegistry.loadFromDirectory();
            console.log(`   [ActionRegistry] Loaded ${actionRegistry.count} actions`);
        } catch (e) {
            console.warn('   [ActionRegistry] load failed — router may use static choices only', e);
        }

        console.log('\n⏳ Invoking server...');

        // Call invoke - support various formats
        // Task should be top-level, not in message
        const invokeInput: any = {
            context: context,
        };

        // Add task to top level if present
        if (requestData.task) {
            invokeInput.task = requestData.task;
        } else if (requestData.message) {
            invokeInput.message = requestData.message;
        }

        // Add action type (task_request, approve_action, step_result)
        if (requestData.action) {
            invokeInput.action = requestData.action;
        }

        // Add selectedAction for approve_action
        if (requestData.selectedAction) {
            invokeInput.selectedAction = requestData.selectedAction;
        }

        if (requestData.result && typeof requestData.result === 'object') {
            if (requestData.stepId) {
                invokeInput.stepId = requestData.stepId;
                invokeInput.stepResult = requestData.result;
            } else {
                invokeInput.result = requestData.result;
            }
        }

        const {promiseId} = await invoke('simulation-client', invokeInput);

        console.log(`   Promise ID: ${promiseId}`);

        // Wait for result (polling)
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
            process.exit(1);
        }

        // Format dates
        const formatDate = (d: any) => d?.toISOString ? d.toISOString() : d;

        // Form response
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

        // Save with indentation
        writeFileSync(responsePath, JSON.stringify(response, null, 2));
        console.log(`\n✅ Response saved to: ${responsePath}`);
        console.log(`   Outcome: ${result.result?.outcome || 'N/A'}`);

    } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
        if (err.stack) {
            console.error(err.stack.split('\\n').slice(0, 5).join('\\n'));
        }
        process.exit(1);
    }
}

runSimulation();
