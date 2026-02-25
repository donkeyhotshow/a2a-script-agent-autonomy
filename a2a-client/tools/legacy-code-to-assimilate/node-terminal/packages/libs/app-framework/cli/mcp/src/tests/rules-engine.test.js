const RulesEngine = require('../rules-engine');

describe('RulesEngine', () => {
    let rulesEngine;
    let mockRule;

    beforeEach(() => {
        rulesEngine = new RulesEngine();
        mockRule = {
            evaluate: jest.fn()
        };
    });

    describe('constructor', () => {
        test('should initialize with empty rules map', () => {
            expect(rulesEngine.rules).toBeInstanceOf(Map);
            expect(rulesEngine.rules.size).toBe(0);
        });
    });

    describe('addRule', () => {
        test('should add new rule', () => {
            rulesEngine.addRule('test-rule', mockRule);
            expect(rulesEngine.rules.get('test-rule')).toBe(mockRule);
        });

        test('should override existing rule with same name', () => {
            const firstRule = { evaluate: jest.fn() };
            const secondRule = { evaluate: jest.fn() };

            rulesEngine.addRule('test-rule', firstRule);
            rulesEngine.addRule('test-rule', secondRule);

            expect(rulesEngine.rules.get('test-rule')).toBe(secondRule);
            expect(rulesEngine.rules.size).toBe(1);
        });
    });

    describe('evaluateRules', () => {
        test('should evaluate all rules with given context', async () => {
            const context = { data: 'test' };
            const rule1 = { evaluate: jest.fn().mockResolvedValue(true) };
            const rule2 = { evaluate: jest.fn().mockResolvedValue(false) };

            rulesEngine.addRule('rule1', rule1);
            rulesEngine.addRule('rule2', rule2);

            const results = await rulesEngine.evaluateRules(context);

            expect(rule1.evaluate).toHaveBeenCalledWith(context);
            expect(rule2.evaluate).toHaveBeenCalledWith(context);
            expect(results).toEqual([
                { name: 'rule1', result: true },
                { name: 'rule2', result: false }
            ]);
        });

        test('should return empty array when no rules exist', async () => {
            const context = { data: 'test' };
            const results = await rulesEngine.evaluateRules(context);
            expect(results).toEqual([]);
        });

        test('should propagate evaluation errors', async () => {
            const context = { data: 'test' };
            const testError = new Error('Evaluation error');
            mockRule.evaluate.mockRejectedValue(testError);

            rulesEngine.addRule('error-rule', mockRule);

            await expect(rulesEngine.evaluateRules(context))
                .rejects.toThrow(testError);
        });
    });
});
