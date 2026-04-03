import { describe, it, expect } from 'vitest';
import { deriveSessionStage } from '../../packages/vite-plugin/routes/utils/session-stage-machine.js';

describe('session-stage-machine', () => {
    describe('deriveSessionStage', () => {
        describe('completed stage', () => {
            it('returns completed when status is "completed"', () => {
                const stage = deriveSessionStage({
                    execute: { message: 'Done' },
                    status: 'completed',
                });
                expect(stage).toBe('completed');
            });

            it('returns completed when status is "done"', () => {
                const stage = deriveSessionStage({
                    execute: { message: 'Done' },
                    status: 'done',
                });
                expect(stage).toBe('completed');
            });

            it('completed has highest precedence over other signals', () => {
                const stage = deriveSessionStage({
                    execute: { form: { choices: [{ id: 'a', label: 'A' }] } },
                    context: { execution: { action: 'router' } },
                    status: 'completed',
                });
                expect(stage).toBe('completed');
            });
        });

        describe('awaiting-async stage', () => {
            it('returns awaiting-async when asyncPending is true', () => {
                const stage = deriveSessionStage({
                    asyncPending: true,
                });
                expect(stage).toBe('awaiting-async');
            });

            it('awaiting-async has precedence over form/choices signals', () => {
                const stage = deriveSessionStage({
                    execute: { form: { choices: [{ id: 'a', label: 'A' }] } },
                    asyncPending: true,
                });
                expect(stage).toBe('awaiting-async');
            });

            it('awaiting-async has precedence over agent action', () => {
                const stage = deriveSessionStage({
                    execute: {},
                    context: { execution: { action: 'agent' } },
                    asyncPending: true,
                });
                expect(stage).toBe('awaiting-async');
            });

            it('awaiting-async has precedence over dialog action', () => {
                const stage = deriveSessionStage({
                    execute: { message: 'Hello' },
                    context: { execution: { action: 'dialog' } },
                    asyncPending: true,
                });
                expect(stage).toBe('awaiting-async');
            });
        });

        describe('routing stage', () => {
            it('returns routing when form has choices', () => {
                const stage = deriveSessionStage({
                    execute: {
                        form: {
                            title: 'Choose option',
                            choices: [
                                { id: 'dialog', label: 'AI Dialog' },
                                { id: 'agent', label: 'Agent' },
                            ],
                        },
                    },
                });
                expect(stage).toBe('routing');
            });

            it('returns routing when context.execution.action is "router"', () => {
                const stage = deriveSessionStage({
                    context: { execution: { action: 'router' } },
                });
                expect(stage).toBe('routing');
            });

            it('returns routing when context.execution.step is "routing"', () => {
                const stage = deriveSessionStage({
                    context: { execution: { step: 'routing' } },
                });
                expect(stage).toBe('routing');
            });

            it('returns routing even with empty form (action override)', () => {
                const stage = deriveSessionStage({
                    execute: {},
                    context: { execution: { action: 'router' } },
                });
                expect(stage).toBe('routing');
            });
        });

        describe('agent-tool-loop stage', () => {
            it('returns agent-tool-loop when context.execution.action is "agent"', () => {
                const stage = deriveSessionStage({
                    execute: {},
                    context: { execution: { action: 'agent' } },
                });
                expect(stage).toBe('agent-tool-loop');
            });

            it('returns agent-tool-loop with tool execution results', () => {
                const stage = deriveSessionStage({
                    execute: {
                        message: 'Reading file content',
                        attachments: { readFiles: [{ path: '/tmp/x' }] },
                    },
                    context: { execution: { action: 'agent' } },
                });
                expect(stage).toBe('agent-tool-loop');
            });
        });

        describe('dialog-input stage', () => {
            it('returns dialog-input when form has inputs (no choices)', () => {
                const stage = deriveSessionStage({
                    execute: {
                        form: {
                            input: [{ name: 'message', label: 'Message' }],
                        },
                    },
                });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input when context.execution.action is "dialog"', () => {
                const stage = deriveSessionStage({
                    context: { execution: { action: 'dialog' } },
                });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input when context.execution.step is "dialog"', () => {
                const stage = deriveSessionStage({
                    context: { execution: { step: 'dialog' } },
                });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input for message-only execute', () => {
                const stage = deriveSessionStage({
                    execute: { message: 'Hello, how can I help?' },
                });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input for form with textarea', () => {
                const stage = deriveSessionStage({
                    execute: {
                        form: {
                            textarea: { name: 'message', label: 'Message' },
                        },
                    },
                });
                expect(stage).toBe('dialog-input');
            });
        });

        describe('fallback behavior', () => {
            it('returns dialog-input for null/undefined execute', () => {
                const stage = deriveSessionStage({});
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input when execute is null', () => {
                const stage = deriveSessionStage({ execute: null });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input when context is null', () => {
                const stage = deriveSessionStage({ context: null });
                expect(stage).toBe('dialog-input');
            });

            it('returns dialog-input for minimal session state', () => {
                const stage = deriveSessionStage({
                    status: 'active',
                });
                expect(stage).toBe('dialog-input');
            });
        });

        describe('edge cases', () => {
            it('handles missing params object gracefully', () => {
                const stage = deriveSessionStage(null);
                expect(stage).toBe('dialog-input');
            });

            it('handles undefined execute field', () => {
                const stage = deriveSessionStage({ execute: undefined });
                expect(stage).toBe('dialog-input');
            });

            it('handles empty context.execution', () => {
                const stage = deriveSessionStage({ context: { execution: {} } });
                expect(stage).toBe('dialog-input');
            });

            it('handles non-object execute (defensive)', () => {
                const stage = deriveSessionStage({ execute: 'not-an-object' });
                expect(stage).toBe('dialog-input');
            });

            it('handles missing context.execution properties gracefully', () => {
                const stage = deriveSessionStage({
                    context: { execution: { action: null, step: null } },
                });
                expect(stage).toBe('dialog-input');
            });

            it('handles form without choices array', () => {
                const stage = deriveSessionStage({
                    execute: {
                        form: {
                            title: 'Form',
                            // No choices property
                        },
                    },
                });
                expect(stage).toBe('dialog-input');
            });

            it('handles form with empty choices array', () => {
                const stage = deriveSessionStage({
                    execute: {
                        form: {
                            choices: [],
                        },
                    },
                });
                expect(stage).toBe('dialog-input');
            });
        });

        describe('stage precedence', () => {
            it('completed > awaiting-async > routing > agent-tool-loop > dialog-input', () => {
                // Status completed takes precedence
                expect(deriveSessionStage({ status: 'completed', asyncPending: true })).toBe('completed');

                // Awaiting async takes precedence over routing
                expect(deriveSessionStage({ asyncPending: true, execute: { form: { choices: [{ id: 'a' }] } } })).toBe('awaiting-async');

                // Routing takes precedence over agent-tool-loop
                expect(deriveSessionStage({ context: { execution: { action: 'router' } }, execute: { form: { choices: [{ id: 'a' }] } } })).toBe('routing');
                expect(deriveSessionStage({ context: { execution: { action: 'agent' } }, execute: { form: { choices: [{ id: 'a' }] } } })).toBe('routing');

                // Agent without a dialog-style form → tool loop; agent + task form → dialog-input (see below)
                expect(deriveSessionStage({ context: { execution: { action: 'agent' } }, execute: { message: 'test' } })).toBe('agent-tool-loop');
            });

            it('action in context.execution overrides execute form', () => {
                // Router action forces routing even with dialog form
                expect(deriveSessionStage({
                    execute: { form: { input: [{ name: 'x' }] } },
                    context: { execution: { action: 'router' } },
                })).toBe('routing');

                // Agent + task-style form is still a dialog-input beat (not tool loop)
                expect(deriveSessionStage({
                    execute: { form: { input: [{ name: 'x' }] } },
                    context: { execution: { action: 'agent' } },
                })).toBe('dialog-input');

                // Dialog action forces dialog-input
                expect(deriveSessionStage({
                    execute: {},
                    context: { execution: { action: 'dialog' } },
                })).toBe('dialog-input');
            });

            it('step in context.execution can trigger routing/dialog', () => {
                expect(deriveSessionStage({ context: { execution: { step: 'routing' } } })).toBe('routing');
                expect(deriveSessionStage({ context: { execution: { step: 'dialog' } } })).toBe('dialog-input');
            });
        });

        describe('integration with session-projection-dto', () => {
            it('produces stage compatible with toPublicSession output', () => {
                // Full payload as would come from session-projection-dto
                const payload = {
                    execute: {
                        form: {
                            title: 'Choose',
                            choices: [{ id: 'a', label: 'A' }],
                        },
                    },
                    context: null,
                    asyncPending: false,
                    status: null,
                };

                const stage = deriveSessionStage(payload);
                expect(stage).toBe('routing');
            });

            it('handles async promise status from server-promise.json', () => {
                // Typical async scenario
                const stage = deriveSessionStage({
                    execute: { message: 'Processing...' },
                    context: { execution: { action: 'dialog', step: 'llm' } },
                    asyncPending: true,
                });
                expect(stage).toBe('awaiting-async');
            });

            it('handles completed session after async resolves', () => {
                const stage = deriveSessionStage({
                    execute: { message: 'All done!' },
                    context: { execution: { action: 'dialog' } },
                    asyncPending: false,
                    status: 'completed',
                });
                expect(stage).toBe('completed');
            });
        });
    });
});