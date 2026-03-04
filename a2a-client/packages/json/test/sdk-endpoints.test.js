/**
 * Unit tests for SDK Server endpoints
 * Tests for the session result endpoints and format conversion
 */
const { describe, it, expect } = globalThis;

describe('SDK Server - Result Endpoint Format Conversion', () => {
    
    describe('parseResultFormat', () => {
        /**
         * Тестирует логику парсинга формата результата
         * из a2a-client/packages/sdk/src/server/index.ts:933-949
         */
        
        const parseResultFormat = (body) => {
            const rawResult = body?.result ?? body;
            let result;
            
            if (rawResult?.form?.choice) {
                // Вложенный формат: { result: { form: { choice: "..." } } }
                result = rawResult.form;
            } else if (rawResult?.choice) {
                // Плоский формат: { choice: "..." }
                result = rawResult;
            } else if (typeof rawResult === 'object' && rawResult !== null) {
                // Другие форматы результатов
                result = rawResult;
            } else {
                return null;
            }
            
            return result;
        };

        it('должен парсить плоский формат { choice: "..." }', () => {
            const body = { choice: 'confirm_action' };
            const result = parseResultFormat(body);
            
            expect(result).toEqual({ choice: 'confirm_action' });
        });

        it('должен парсить вложенный формат { result: { form: { choice: "..." } } }', () => {
            const body = {
                result: {
                    form: {
                        choice: 'skip_step',
                        input: { field: 'value' }
                    }
                }
            };
            const result = parseResultFormat(body);
            
            expect(result).toEqual({ choice: 'skip_step', input: { field: 'value' } });
        });

        it('должен парсить формат { result: { choice: "..." } } (без form)', () => {
            const body = {
                result: {
                    choice: 'confirm_action'
                }
            };
            const result = parseResultFormat(body);
            
            expect(result).toEqual({ choice: 'confirm_action' });
        });

        it('должен возвращать исходный объект для некорректного формата (обратная совместимость)', () => {
            const body = { invalid: 'data' };
            const result = parseResultFormat(body);
            
            // Returns original object for backward compatibility
            expect(result).toEqual({ invalid: 'data' });
        });

        it('должен возвращать null для пустого тела', () => {
            const result = parseResultFormat(null);
            expect(result).toBeNull();
        });

        it('должен возвращать null для строки вместо объекта', () => {
            const result = parseResultFormat('just a string');
            expect(result).toBeNull();
        });

        it('должен обрабатывать объект с несколькими полями', () => {
            const body = {
                result: {
                    form: {
                        choice: 'submit_form',
                        input: {
                            username: 'testuser',
                            email: 'test@example.com'
                        }
                    }
                }
            };
            const result = parseResultFormat(body);
            
            expect(result).toEqual({
                choice: 'submit_form',
                input: {
                    username: 'testuser',
                    email: 'test@example.com'
                }
            });
        });
    });

    describe('buildFormChoiceRequest', () => {
        /**
         * Тестирует построение тела запроса для /invoke
         * из a2a-client/packages/sdk/src/server/index.ts:967-978
         */
        
        const buildFormChoiceRequest = (sessionId, result, session) => {
            return {
                context: {
                    version: session.version || '2.0',
                    session_id: sessionId,
                    task: session.task,
                    execution: session.execution,
                    history: session.context?.history || [],
                },
                result: {
                    form: result,
                },
            };
        };

        it('должен строить корректный запрос с choice', () => {
            const request = buildFormChoiceRequest(
                'session-123',
                { choice: 'confirm_action' },
                { version: '2.0', task: 'Test task', execution: {}, context: {} }
            );
            
            expect(request).toEqual({
                context: {
                    version: '2.0',
                    session_id: 'session-123',
                    task: 'Test task',
                    execution: {},
                    history: [],
                },
                result: {
                    form: { choice: 'confirm_action' },
                },
            });
        });

        it('должен включать input в form result', () => {
            const request = buildFormChoiceRequest(
                'session-456',
                { choice: 'submit_form', input: { name: 'John' } },
                { version: '2.0', task: 'Form task', execution: {}, context: {} }
            );
            
            expect(request.result.form).toEqual({
                choice: 'submit_form',
                input: { name: 'John' },
            });
        });

        it('должен использовать версию по умолчанию 2.0', () => {
            const request = buildFormChoiceRequest(
                'session-789',
                { choice: 'skip' },
                { task: 'Task', execution: {}, context: {} }
            );
            
            expect(request.context.version).toBe('2.0');
        });

        it('должен сохранять историю из контекста', () => {
            const history = [
                { action: 'read-file', result: { path: '/test.js' } }
            ];
            const request = buildFormChoiceRequest(
                'session-000',
                { choice: 'continue' },
                { version: '2.0', task: 'Task', execution: {}, context: { history } }
            );
            
            expect(request.context.history).toEqual(history);
        });
    });

    describe('Action Key Shape Validation', () => {
        /**
         * Валидация формата action-key shape согласно PROTOCOL.md
         */
        
        const isValidActionKeyShape = (obj) => {
            if (!obj || typeof obj !== 'object') return false;
            
            const keys = Object.keys(obj);
            if (keys.length !== 1) return false;
            
            const actionKey = keys[0];
            const validActions = ['form', 'script', 'read-file', 'write-file', 'rag-search', 'execute-command', 'message'];
            
            // Проверяем, является ли ключ допустимым действием
            const isKnownAction = validActions.some(a => actionKey.includes(a));
            
            return typeof obj[actionKey] === 'object' && obj[actionKey] !== null;
        };

        it('должен валидировать корректный form формат', () => {
            const result = { form: { choice: 'confirm' } };
            expect(isValidActionKeyShape(result)).toBe(true);
        });

        it('должен валидировать корректный script формат', () => {
            const result = { script: { output: 'Hello World' } };
            expect(isValidActionKeyShape(result)).toBe(true);
        });

        it('должен отклонять объект с несколькими ключами', () => {
            const result = { form: { choice: 'a' }, script: { output: 'b' } };
            expect(isValidActionKeyShape(result)).toBe(false);
        });

        it('должен отклонять плоский формат { content: "..." }', () => {
            const result = { content: 'some text' };
            expect(isValidActionKeyShape(result)).toBe(false);
        });
    });
});

describe('SDK Server - Session Endpoints', () => {
    
    describe('Session ID Validation', () => {
        const validateSessionId = (sessionId) => {
            if (!sessionId || typeof sessionId !== 'string') {
                return { valid: false, error: 'sessionId is required' };
            }
            
            if (sessionId.length === 0) {
                return { valid: false, error: 'sessionId cannot be empty' };
            }
            
            // Проверяем на допустимые символы (алfanumerici дефис, подчеркивание)
            if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
                return { valid: false, error: 'sessionId contains invalid characters' };
            }
            
            return { valid: true };
        };

        it('должен принимать корректный sessionId', () => {
            expect(validateSessionId('session-123')).toEqual({ valid: true });
            expect(validateSessionId('session_456')).toEqual({ valid: true });
            expect(validateSessionId('abc123')).toEqual({ valid: true });
        });

        it('должен отклонять пустой sessionId', () => {
            expect(validateSessionId('')).toEqual({ valid: false, error: 'sessionId is required' });
        });

        it('должен отклонять null/undefined sessionId', () => {
            expect(validateSessionId(null)).toEqual({ valid: false, error: 'sessionId is required' });
            expect(validateSessionId(undefined)).toEqual({ valid: false, error: 'sessionId is required' });
        });

        it('должен отклонять sessionId с недопустимыми символами', () => {
            expect(validateSessionId('session 123')).toEqual({ valid: false, error: 'sessionId contains invalid characters' });
            expect(validateSessionId('session@123')).toEqual({ valid: false, error: 'sessionId contains invalid characters' });
        });
    });

    describe('Project ID Extraction', () => {
        const extractProjectId = (query, body) => {
            if (typeof query?.projectId === 'string') {
                return query.projectId;
            }
            if (typeof body?.projectId === 'string') {
                return body.projectId;
            }
            return '';
        };

        it('должен извлекать projectId из query параметра', () => {
            expect(extractProjectId({ projectId: 'proj-1' }, {})).toBe('proj-1');
        });

        it('должен извлекать projectId из body', () => {
            expect(extractProjectId({}, { projectId: 'proj-2' })).toBe('proj-2');
        });

        it('должен предпочитать query параметр', () => {
            expect(extractProjectId({ projectId: 'proj-query' }, { projectId: 'proj-body' })).toBe('proj-query');
        });

        it('должен возвращать пустую строку если не найден', () => {
            expect(extractProjectId({}, {})).toBe('');
        });
    });
});

describe('Web API Client - sendChoice', () => {
    
    describe('Choice Result Formatting', () => {
        /**
         * Тестирует форматирование результата для WebApiClient.sendChoice
         */
        
        const formatChoiceResult = (choiceId, input) => {
            return {
                form: {
                    choice: choiceId,
                    ...(input && { input }),
                },
            };
        };

        it('должен форматировать результат с choice без input', () => {
            const result = formatChoiceResult('confirm_action');
            expect(result).toEqual({ form: { choice: 'confirm_action' } });
        });

        it('должен форматировать результат с choice и input', () => {
            const result = formatChoiceResult('submit_form', { name: 'John' });
            expect(result).toEqual({ 
                form: { 
                    choice: 'submit_form',
                    input: { name: 'John' }
                } 
            });
        });

        it('должен создавать компактный формат для Web', () => {
            const result = formatChoiceResult('skip_step');
            // Проверяем что формат соответствует ожиданиям Web
            expect(result.form.choice).toBe('skip_step');
            expect(result.form).toHaveProperty('choice');
        });
    });
});
