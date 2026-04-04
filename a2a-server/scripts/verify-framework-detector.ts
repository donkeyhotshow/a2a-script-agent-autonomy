import { FrameworkDetectorService } from '../src/services/framework-detector.service.js';
import * as processorService from '../src/services/core/request-processor/request-processor.service.js';
import { requestService } from '../src/services/core/request/request.service.js';

// Mock requestService methods to simulate process
requestService.updateStatus = async (promiseId: string, status: string, result: any) => {
    console.log(`[Mock] updateStatus called with status: ${status}`);
    console.log(`[Mock] Detected frameworks in context:`, JSON.stringify(result.context?.frameworks, null, 2));
    return true;
};
requestService.getNextPending = async () => null;
requestService.claimPendingByPromiseId = async () => null;

async function run() {
    console.log('Testing FrameworkDetectorService directly...');
    
    const promiseId = 'test-script-123';
    const context = { session_id: 'test' };
    const codeBlocks = [
        {
            path: 'package.json',
            content: JSON.stringify({
                dependencies: {
                    vue: '^3.2.0',
                    react: '^18.2.0',
                    next: '14.0.0'
                },
                devDependencies: {
                    vitest: '^1.0.0'
                }
            })
        }
    ];

    const request = {
        promiseId,
        context,
        codeBlocks,
        message: 'Hello direct test'
    };

    try {
        await (processorService as any).executePendingRow(request);
        console.log('Test completed successfully.');
    } catch (e) {
        console.error('Error during test:', e);
    }
}

run();
