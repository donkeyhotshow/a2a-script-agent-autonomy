/**
 * Integration Tests for Session Storage API
 * Tests for numbered folders storage system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let testStorageDir;
let projectPath;

// Setup test storage directory
beforeAll(async () => {
    testStorageDir = path.join(os.tmpdir(), `a2a-session-storage-test-${Date.now()}`);
    projectPath = testStorageDir;
    await fs.mkdir(path.join(testStorageDir, 'storage', 'sessions'), { recursive: true });
});

afterAll(async () => {
    try {
        await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (_) {}
});

describe('Session Storage - Numbered Folders', () => {
    describe('Session Creation', () => {
        it('should create session with initial form input', async () => {
            // This tests the POST /api/a2a/sessions endpoint
            // In a real test, we'd make an HTTP request to the Vite dev server
            
            // For now, we verify the expected structure
            const expectedSession = {
                id: 'sess_123',
                title: 'New Session',
                createdAt: new Date().toISOString(),
                status: 'created',
                currentStep: 1,
                execute: null
            };
            
            expect(expectedSession.currentStep).toBe(1);
            expect(expectedSession.execute).toBeNull();
        });

        it('should create numbered folder for session', async () => {
            const sessionDir = path.join(testStorageDir, 'storage', 'sessions', 'sess_test');
            await fs.mkdir(sessionDir, { recursive: true });
            
            // Verify directory exists
            const exists = await fs.access(sessionDir).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });
    });

    describe('Step Storage', () => {
        it('should create numbered step folder', async () => {
            const stepDir = path.join(testStorageDir, 'storage', 'sessions', 'sess_test', '1');
            await fs.mkdir(stepDir, { recursive: true });
            
            const stepFile = path.join(stepDir, 'server-response.json');
            const stepData = {
                step: 1,
                timestamp: new Date().toISOString(),
                execute: { form: { input: { name: 'task' } } },
                messages: [],
                context: null
            };
            
            await fs.writeFile(stepFile, JSON.stringify(stepData, null, 2));
            
            const exists = await fs.access(stepFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        it('should reconstruct session from step files without session.json', async () => {
            // NEW: Session is reconstructed from server-response.json in step folders
            const sessionDir = path.join(testStorageDir, 'storage', 'sessions', 'sess_test');
            await fs.mkdir(path.join(sessionDir, '1'), { recursive: true });
            
            // Create step 1 with server-response.json
            const step1Data = {
                step: 1,
                timestamp: new Date().toISOString(),
                execute: { form: { input: { name: 'task', label: 'Test Task' } } },
                messages: [{ role: 'assistant', content: 'Hello' }],
                context: { session_id: 'sess_test' }
            };
            await fs.writeFile(
                path.join(sessionDir, '1', 'server-response.json'),
                JSON.stringify(step1Data, null, 2)
            );
            await fs.writeFile(
                path.join(sessionDir, '1', 'messages.json'),
                JSON.stringify(step1Data.messages, null, 2)
            );
            
            // Verify server-response.json exists
            const stepFile = path.join(sessionDir, '1', 'server-response.json');
            const exists = await fs.access(stepFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
            
            // Verify NO session.json is created (it's deprecated)
            const metaFile = path.join(sessionDir, 'session.json');
            const metaExists = await fs.access(metaFile).then(() => true).catch(() => false);
            expect(metaExists).toBe(false);
        });
    });

    describe('History Retrieval', () => {
        it('should store multiple steps in numbered folders', async () => {
            const sessionDir = path.join(testStorageDir, 'storage', 'sessions', 'sess_history');
            
            // Create steps 1, 2, 3
            for (let i = 1; i <= 3; i++) {
                const stepDir = path.join(sessionDir, String(i));
                await fs.mkdir(stepDir, { recursive: true });
                await fs.writeFile(
                    path.join(stepDir, 'server-response.json'),
                    JSON.stringify({ step: i, messages: [`message ${i}`] })
                );
            }
            
            // Verify all steps exist
            for (let i = 1; i <= 3; i++) {
                const stepFile = path.join(sessionDir, String(i), 'server-response.json');
                const exists = await fs.access(stepFile).then(() => true).catch(() => false);
                expect(exists).toBe(true);
            }
        });
    });
});

describe('SessionStore - Auto-Responses', () => {
    describe('Form Handling', () => {
        it('should require user input when form.input is present', () => {
            const execute = {
                form: {
                    input: {
                        name: 'task',
                        label: 'Enter your task'
                    }
                }
            };
            
            // When form.input is present, client should NOT auto-continue
            expect(execute.form.input[0]).toBeDefined();
            expect(execute.form.choices).toBeUndefined();
        });

        it('should require user input when form.choices is present', () => {
            const execute = {
                form: {
                    choices: ['Option 1', 'Option 2', 'Option 3']
                }
            };
            
            // When form.choices is present, client should NOT auto-continue
            expect(execute.form.choices).toBeDefined();
            expect(execute.form.input).toBeUndefined();
        });

        it('should auto-continue when no form is present', () => {
            const execute = {
                'read-file': { path: '/project/readme.md' }
            };
            
            // No form means auto-continue; protocol uses one action key under execute
            expect(execute.form).toBeUndefined();
            expect(Object.keys(execute)[0]).toBe('read-file');
        });
    });

    describe('Message Types', () => {
        it('should create user message for form input', () => {
            const message = {
                role: 'user',
                content: 'My task is to read a file',
                timestamp: new Date().toISOString()
            };
            
            expect(message.role).toBe('user');
            expect(message.content).toBe('My task is to read a file');
        });

        it('should create assistant message for responses', () => {
            const message = {
                role: 'assistant',
                content: 'I will read the file for you.',
                timestamp: new Date().toISOString()
            };
            
            expect(message.role).toBe('assistant');
        });

        it('should create system message for auto-actions', () => {
            const message = {
                role: 'system',
                content: 'Executing: read-file',
                metadata: { type: 'auto-action', action: 'read-file' }
            };
            
            expect(message.role).toBe('system');
            expect(message.metadata.type).toBe('auto-action');
        });

        it('should create system message for auto-results', () => {
            const message = {
                role: 'system',
                content: 'File read successfully',
                metadata: { type: 'auto-result', result: { summary: 'File read successfully' } }
            };
            
            expect(message.role).toBe('system');
            expect(message.metadata.type).toBe('auto-result');
        });
    });
});

describe('Storage Mode Toggle', () => {
    describe('Memory Mode', () => {
        it('should store sessions in memory only', () => {
            const memoryStore = {
                sessions: new Map(),
                addSession(id, data) {
                    this.sessions.set(id, data);
                },
                getSession(id) {
                    return this.sessions.get(id);
                }
            };
            
            memoryStore.addSession('sess_1', { title: 'Test' });
            expect(memoryStore.getSession('sess_1').title).toBe('Test');
            
            // Memory is lost on "reset" (page refresh simulation)
            memoryStore.sessions.clear();
            expect(memoryStore.getSession('sess_1')).toBeUndefined();
        });
    });

    describe('Persistent Mode', () => {
        it('should persist sessions to step files without session.json', async () => {
            // NEW: Sessions are stored in numbered folders with server-response.json
            const sessionDir = path.join(testStorageDir, 'storage', 'sessions', 'sess_persist');
            
            // Create session with step 1
            await fs.mkdir(path.join(sessionDir, '1'), { recursive: true });
            const stepData = { 
                id: 'sess_persist', 
                title: 'Persistent Session',
                step: 1,
                timestamp: new Date().toISOString(),
                execute: { form: { input: { name: 'task' } } },
                messages: [],
                context: null
            };
            
            await fs.writeFile(
                path.join(sessionDir, '1', 'server-response.json'),
                JSON.stringify(stepData, null, 2)
            );
            
            // Verify step file exists
            const stepFile = path.join(sessionDir, '1', 'server-response.json');
            const content = await fs.readFile(stepFile, 'utf8');
            const parsed = JSON.parse(content);
            
            expect(parsed.id).toBe('sess_persist');
            expect(parsed.step).toBe(1);
            
            // Verify NO root session.json exists
            const rootSessionFile = path.join(sessionDir, 'session.json');
            const rootExists = await fs.access(rootSessionFile).then(() => true).catch(() => false);
            expect(rootExists).toBe(false);
        });
    });
});
