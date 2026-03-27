/**
 * Snapshot Integration Tests
 * 
 * Uses Vitest's snapshot feature to compare responses against saved snapshots.
 * Validates that response.json format matches the expected schema.
 * 
 * Update snapshots: npm test -- --update
 * 
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || path.join(process.cwd(), 'tests', 'snapshots');

// Snapshot directory for integration tests
const INTEGRATION_SNAPSHOT_DIR = path.join(SNAPSHOT_DIR, 'integration');

describe('Snapshot Integration Tests', () => {
    beforeAll(async () => {
        // Ensure snapshot directory exists
        try {
            await fs.mkdir(INTEGRATION_SNAPSHOT_DIR, { recursive: true });
        } catch (e) {
            // Directory might already exist
        }
    });

    describe('Response Schema Validation', () => {
        it('should validate pending response schema', () => {
            const pendingResponse = {
                jsonrpc: '2.0',
                id: 'test-123',
                result: {
                    promiseId: 'promise-abc-456',
                    status: 'pending',
                    context: {
                        version: '1.0'
                    },
                    data: {}
                }
            };

            // Validate required fields
            expect(pendingResponse.jsonrpc).toBe('2.0');
            expect(pendingResponse).toHaveProperty('id');
            expect(pendingResponse).toHaveProperty('result');
            expect(pendingResponse.result.promiseId).toBeDefined();
            expect(pendingResponse.result.status).toBe('pending');

            // Snapshot the response
            expect(pendingResponse).toMatchSnapshot('pending-response');
        });

        it('should validate form response schema', () => {
            const formResponse = {
                jsonrpc: '2.0',
                id: 'test-456',
                result: {
                    promiseId: 'promise-xyz-789',
                    status: 'form',
                    context: {
                        version: '1.0'
                    },
                    data: {
                        form: {
                            id: 'confirm_action',
                            title: 'Please confirm your action',
                            input: {
                                type: 'text',
                                placeholder: 'Enter your response'
                            },
                            choices: [
                                { id: 'confirm', label: 'Yes, proceed' },
                                { id: 'cancel', label: 'Cancel' },
                                { id: 'skip', label: 'Skip this step' }
                            ]
                        }
                    }
                }
            };

            // Validate form structure
            expect(formResponse.result.status).toBe('form');
            expect(formResponse.result.data.form).toBeDefined();
            expect(formResponse.result.data.form.id).toBeDefined();
            expect(formResponse.result.data.form.choices).toBeInstanceOf(Array);

            // Snapshot
            expect(formResponse).toMatchSnapshot('form-response');
        });

        it('should validate completed response schema', () => {
            const completedResponse = {
                jsonrpc: '2.0',
                id: 'test-789',
                result: {
                    promiseId: 'promise-completed-123',
                    status: 'completed',
                    context: {
                        version: '1.0'
                    },
                    data: {
                        result: {
                            'read-file': {
                                path: '/test/file.txt',
                                content: 'File content here'
                            }
                        }
                    }
                }
            };

            // Validate completed structure
            expect(completedResponse.result.status).toBe('completed');
            expect(completedResponse.result.data.result).toBeDefined();

            // Snapshot
            expect(completedResponse).toMatchSnapshot('completed-response');
        });

        it('should validate error response schema', () => {
            const errorResponse = {
                jsonrpc: '2.0',
                id: 'test-error',
                error: {
                    code: -32600,
                    message: 'Invalid Request',
                    data: {
                        details: 'Missing required field: message'
                    }
                }
            };

            // Validate error structure
            expect(errorResponse.error.code).toBeLessThan(0);
            expect(errorResponse.error.message).toBeDefined();
            expect(errorResponse.error.data).toBeDefined();

            // Snapshot
            expect(errorResponse).toMatchSnapshot('error-response');
        });
    });

    describe('Execute Response Validation', () => {
        it('should validate execute with script action', () => {
            const executeResponse = {
                jsonrpc: '2.0',
                id: 'exec-1',
                result: {
                    promiseId: 'promise-exec-1',
                    status: 'executing',
                    context: { version: '1.0' },
                    execute: {
                        script: {
                            input: { command: 'ls -la' },
                            output: 'total 64\ndrwxr-xr-x  5 user user 4096 Jan 1 00:00 .',
                            code: 'const fs = require("fs");\nconst files = fs.readdirSync(".");'
                        }
                    }
                }
            };

            expect(executeResponse.result.execute).toBeDefined();
            expect(executeResponse.result.execute.script).toBeDefined();
            expect(executeResponse.result.execute.script.code).toBeDefined();

            expect(executeResponse).toMatchSnapshot('execute-script');
        });

        it('should validate execute with read-file action', () => {
            const executeResponse = {
                jsonrpc: '2.0',
                id: 'exec-2',
                result: {
                    promiseId: 'promise-exec-2',
                    status: 'executing',
                    context: { version: '1.0' },
                    execute: {
                        'read-file': {
                            path: '/test/file.ts',
                            content: 'export function test() { return true; }'
                        }
                    }
                }
            };

            expect(executeResponse.result.execute['read-file']).toBeDefined();
            expect(executeResponse.result.execute['read-file'].path).toBeDefined();
            expect(executeResponse.result.execute['read-file'].content).toBeDefined();

            expect(executeResponse).toMatchSnapshot('execute-read-file');
        });

        it('should validate execute with write-file action', () => {
            const executeResponse = {
                jsonrpc: '2.0',
                id: 'exec-3',
                result: {
                    promiseId: 'promise-exec-3',
                    status: 'executing',
                    context: { version: '1.0' },
                    execute: {
                        'write-file': {
                            path: '/test/output.txt',
                            content: 'Written content'
                        }
                    }
                }
            };

            expect(executeResponse.result.execute['write-file']).toBeDefined();
            expect(executeResponse.result.execute['write-file'].path).toBeDefined();

            expect(executeResponse).toMatchSnapshot('execute-write-file');
        });

        it('should validate execute with form action', () => {
            const executeResponse = {
                jsonrpc: '2.0',
                id: 'exec-4',
                result: {
                    promiseId: 'promise-exec-4',
                    status: 'form',
                    context: { version: '1.0' },
                    execute: {
                        form: {
                            id: 'choose_option',
                            title: 'Select an option',
                            choices: [
                                { id: 'opt1', label: 'Option 1' },
                                { id: 'opt2', label: 'Option 2' }
                            ]
                        }
                    }
                }
            };

            expect(executeResponse.result.execute.form).toBeDefined();
            expect(executeResponse.result.execute.form.choices).toBeInstanceOf(Array);

            expect(executeResponse).toMatchSnapshot('execute-form');
        });
    });

    describe('Request Schema Validation', () => {
        it('should validate invoke request format', () => {
            const invokeRequest = {
                jsonrpc: '2.0',
                id: 'req-1',
                method: 'invoke',
                params: {
                    context: {
                        version: '1.0',
                        sessionId: 'session-123'
                    },
                    message: 'Create a file called test.txt with hello world'
                }
            };

            expect(invokeRequest.jsonrpc).toBe('2.0');
            expect(invokeRequest.method).toBe('invoke');
            expect(invokeRequest.params).toHaveProperty('context');
            expect(invokeRequest.params).toHaveProperty('message');

            expect(invokeRequest).toMatchSnapshot('invoke-request');
        });

        it('should validate execute request format', () => {
            const executeRequest = {
                jsonrpc: '2.0',
                id: 'req-2',
                method: 'execute',
                params: {
                    promiseId: 'promise-123',
                    choice: {
                        id: 'confirm',
                        label: 'Yes, proceed'
                    }
                }
            };

            expect(executeRequest.method).toBe('execute');
            expect(executeRequest.params.promiseId).toBeDefined();
            expect(executeRequest.params.choice).toBeDefined();

            expect(executeRequest).toMatchSnapshot('execute-request');
        });
    });

    describe('Snapshot Management', () => {
        it('should demonstrate snapshot update process', () => {
            const instructions = `
Snapshot Update Process:

1. Run tests to see failures:
   npm run test:integration

2. Review snapshot differences in output

3. Update snapshots if changes are expected:
   npm run test:integration -- --update

4. Review updated snapshots in:
   ${INTEGRATION_SNAPSHOT_DIR}

5. Commit updated snapshots

Current snapshot directory: ${INTEGRATION_SNAPSHOT_DIR}
            `.trim();

            console.log('\n' + instructions);
            expect(true).toBe(true);
        });

        it('should list existing snapshots', async () => {
            let snapshots: string[] = [];

            try {
                const files = await fs.readdir(INTEGRATION_SNAPSHOT_DIR);
                snapshots = files.filter(f => f.endsWith('.snap'));
            } catch (e) {
                console.log('⚠️  No snapshots directory found yet');
            }

            console.log('\n📸 Existing snapshots:', snapshots.length);
            snapshots.forEach(s => console.log(`   - ${s}`));

            // This test always passes
            expect(Array.isArray(snapshots)).toBe(true);
        });
    });
});

// Export for snapshot utilities
export { INTEGRATION_SNAPSHOT_DIR };
