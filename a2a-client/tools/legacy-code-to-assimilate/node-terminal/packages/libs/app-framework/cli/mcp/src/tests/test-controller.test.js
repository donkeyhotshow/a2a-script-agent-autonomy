const TestController = require('../test-controller');

describe('TestController', () => {
    let testController;
    let mockTest;

    beforeEach(() => {
        testController = new TestController();
        mockTest = {
            run: jest.fn()
        };
    });

    describe('constructor', () => {
        test('should initialize with empty tests map', () => {
            expect(testController.tests).toBeInstanceOf(Map);
            expect(testController.tests.size).toBe(0);
        });
    });

    describe('addTest', () => {
        test('should add new test', () => {
            testController.addTest('test1', mockTest);
            expect(testController.tests.get('test1')).toBe(mockTest);
        });

        test('should override existing test with same name', () => {
            const firstTest = { run: jest.fn() };
            const secondTest = { run: jest.fn() };

            testController.addTest('test1', firstTest);
            testController.addTest('test1', secondTest);

            expect(testController.tests.get('test1')).toBe(secondTest);
            expect(testController.tests.size).toBe(1);
        });
    });

    describe('runTest', () => {
        test('should run specific test by name', async () => {
            const expectedResult = { status: 'passed' };
            mockTest.run.mockResolvedValue(expectedResult);

            testController.addTest('test1', mockTest);
            const result = await testController.runTest('test1');

            expect(mockTest.run).toHaveBeenCalled();
            expect(result).toBe(expectedResult);
        });

        test('should throw error for non-existent test', async () => {
            await expect(testController.runTest('non-existent'))
                .rejects.toThrow('Test not found');
        });

        test('should propagate test execution errors', async () => {
            const testError = new Error('Test execution failed');
            mockTest.run.mockRejectedValue(testError);

            testController.addTest('test1', mockTest);

            await expect(testController.runTest('test1'))
                .rejects.toThrow(testError);
        });
    });

    describe('runAllTests', () => {
        test('should run all tests and collect results', async () => {
            const test1 = { run: jest.fn().mockResolvedValue({ status: 'passed' }) };
            const test2 = { run: jest.fn().mockResolvedValue({ status: 'failed' }) };

            testController.addTest('test1', test1);
            testController.addTest('test2', test2);

            const results = await testController.runAllTests();

            expect(results).toEqual([
                { name: 'test1', result: { status: 'passed' } },
                { name: 'test2', result: { status: 'failed' } }
            ]);
            expect(test1.run).toHaveBeenCalled();
            expect(test2.run).toHaveBeenCalled();
        });

        test('should return empty array when no tests exist', async () => {
            const results = await testController.runAllTests();
            expect(results).toEqual([]);
        });

        test('should continue running remaining tests after test failure', async () => {
            const test1 = { run: jest.fn().mockRejectedValue(new Error('Test 1 failed')) };
            const test2 = { run: jest.fn().mockResolvedValue({ status: 'passed' }) };

            testController.addTest('test1', test1);
            testController.addTest('test2', test2);

            await expect(testController.runAllTests())
                .rejects.toThrow('Test 1 failed');

            expect(test1.run).toHaveBeenCalled();
            // Второй тест не должен выполниться после ошибки в первом
            expect(test2.run).not.toHaveBeenCalled();
        });
    });
});
