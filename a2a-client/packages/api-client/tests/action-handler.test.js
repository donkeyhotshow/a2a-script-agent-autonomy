const {handleActionResponse, createExecuteCode} = require('../dist/index.js');

describe('action-handler', () => {
    describe('handleActionResponse', () => {
        it('returns handled: false when no action.currentStep.code', async () => {
            const r = await handleActionResponse({context: {}}, {});
            expect(r.handled).toBe(false);

            const r2 = await handleActionResponse({
                context: {session_id: 's1'},
                action: {currentStep: {id: 'step-1'}},
            }, {});
            expect(r2.handled).toBe(false);
        });

        it('returns handled: false when executeCode/sendContinue missing', async () => {
            const response = {
                context: {session_id: 's1'},
                action: {currentStep: {id: 'step-1', code: 'return 1;'}},
            };
            const r = await handleActionResponse(response, {});
            expect(r.handled).toBe(false);
            expect(r.error).toBe('executeCode and sendContinue required');
        });

        it('executes code and calls sendContinue', async () => {
            const response = {
                context: {session_id: 's1'},
                action: {currentStep: {id: 'step-1', code: 'return 42;'}},
            };
            let sendContinueCalled = false;
            const sendContinue = async (sessionId, stepId, result) => {
                sendContinueCalled = true;
                expect(sessionId).toBe('s1');
                expect(stepId).toBe('step-1');
                expect(result).toEqual({value: 42});
                return {action: null};
            };
            const r = await handleActionResponse(response, {
                executeCode: async () => ({value: 42}),
                sendContinue,
            });
            expect(r.handled).toBe(true);
            expect(r.stepResult).toEqual({value: 42});
            expect(sendContinueCalled).toBe(true);
            expect(r.nextResponse).toEqual({action: null});
        });

        it('returns error when executeCode throws', async () => {
            const response = {
                context: {session_id: 's1'},
                action: {currentStep: {id: 'step-1', code: 'throw'}},
            };
            const r = await handleActionResponse(response, {
                executeCode: async () => {
                    throw new Error('run failed');
                },
                sendContinue: async () => ({}),
            });
            expect(r.handled).toBe(true);
            expect(r.error).toBe('run failed');
        });
    });

    describe('createExecuteCode', () => {
        it('wraps executeScript and returns data', async () => {
            const executeScript = async () => ({success: true, data: {x: 1}});
            const executeCode = createExecuteCode(executeScript);
            const result = await executeCode('code', {previousOutput: {}, sessionId: 's1'});
            expect(result).toEqual({x: 1});
        });

        it('throws when executeScript returns success: false', async () => {
            const executeScript = async () => ({success: false, error: 'sandbox error'});
            const executeCode = createExecuteCode(executeScript);
            await expect(executeCode('code', {})).rejects.toThrow('sandbox error');
        });
    });
});
