
const { ConfigurationLoader } = require('../index');
const path = require('path');
const fs = require('fs').promises;

// Мок-объект для globalLogger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
};

describe('ConfigurationLoader', () => {
    let loader;

    beforeEach(() => {
        loader = new ConfigurationLoader(mockLogger);
        jest.clearAllMocks();
    });

    describe('loadChainConfig', () => {
        const configPath = path.join(__dirname, 'temp_test_config.json');
        const validConfig = {
            version: '1.0.0',
            'execution-pipelines': [
                { name: 'Chain A', priority: 1, enabled: true, path: './chain-a' },
                { name: 'Chain B', priority: 2, enabled: true, path: './chain-b' },
            ],
        };

        afterEach(async () => {
            if (await fs.stat(configPath).catch(() => null)) {
                await fs.unlink(configPath);
            }
        });

        test('should load a valid chain configuration', async () => {
            await fs.writeFile(configPath, JSON.stringify(validConfig));
            const config = await loader.loadChainConfig(configPath);
            expect(config).toEqual(validConfig);
            expect(mockLogger.info).toHaveBeenCalledWith(`Configuration loaded from: ${configPath}`);
        });

        test('should return null if configuration file does not exist', async () => {
            const config = await loader.loadChainConfig(configPath);
            expect(config).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to load configuration from`));
        });

        test('should return null if configuration file is invalid JSON', async () => {
            await fs.writeFile(configPath, 'invalid json');
            const config = await loader.loadChainConfig(configPath);
            expect(config).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Error parsing configuration from`));
        });
    });

    describe('loadChainRules', () => {
        const rulesPath = path.join(__dirname, 'temp_test_rules.json');
        const validRules = {
            'exit_codes': {
                0: 'SUCCESS',
                1: 'GENERAL_ERROR',
                4: 'SKIPPED',
            },
            'rules': [
                { 'chain_name': 'Chain A', 'on_error': 'stop' },
            ],
        };

        afterEach(async () => {
            if (await fs.stat(rulesPath).catch(() => null)) {
                await fs.unlink(rulesPath);
            }
        });

        test('should load valid chain rules', async () => {
            await fs.writeFile(rulesPath, JSON.stringify(validRules));
            const rules = await loader.loadChainRules(rulesPath);
            expect(rules).toEqual(validRules);
            expect(mockLogger.info).toHaveBeenCalledWith(`Chain rules loaded from: ${rulesPath}`);
        });

        test('should return null if rules file does not exist', async () => {
            const rules = await loader.loadChainRules(rulesPath);
            expect(rules).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to load chain rules from`));
        });

        test('should return null if rules file is invalid JSON', async () => {
            await fs.writeFile(rulesPath, 'invalid json');
            const rules = await loader.loadChainRules(rulesPath);
            expect(rules).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Error parsing chain rules from`));
        });
    });

    describe('validateConfig', () => {
        test('should validate a correct configuration', () => {
            const config = {
                version: '1.0.0',
                'execution-pipelines': [
                    { name: 'Chain 1', priority: 1, enabled: true, path: './path1' },
                ],
            };
            expect(loader.validateConfig(config)).toBe(true);
        });

        test('should invalidate configuration without version', () => {
            const config = { 'execution-pipelines': [] };
            expect(loader.validateConfig(config)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Configuration validation failed: Missing version field'));
        });

        test('should invalidate configuration without execution-pipelines', () => {
            const config = { version: '1.0.0' };
            expect(loader.validateConfig(config)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Configuration validation failed: Missing execution-pipelines field'));
        });

        test('should invalidate configuration with invalid chain structure', () => {
            const config = {
                version: '1.0.0',
                'execution-pipelines': [
                    { name: 'Chain 1', enabled: true, path: './path1' }, // Missing priority
                ],
            };
            expect(loader.validateConfig(config)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Configuration validation failed: Invalid chain structure'));
        });
    });

    describe('validateRules', () => {
        test('should validate correct rules', () => {
            const rules = {
                'exit_codes': { 0: 'SUCCESS' },
                'rules': [{ 'chain_name': 'test', 'on_error': 'continue' }],
            };
            expect(loader.validateRules(rules)).toBe(true);
        });

        test('should invalidate rules without exit_codes', () => {
            const rules = { 'rules': [] };
            expect(loader.validateRules(rules)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Chain rules validation failed: Missing exit_codes field'));
        });

        test('should invalidate rules without rules array', () => {
            const rules = { 'exit_codes': { 0: 'SUCCESS' } };
            expect(loader.validateRules(rules)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Chain rules validation failed: Missing rules array'));
        });

        test('should invalidate rules with invalid rule structure', () => {
            const rules = {
                'exit_codes': { 0: 'SUCCESS' },
                'rules': [
                    { 'chain_name': 'test' }, // Missing on_error
                ],
            };
            expect(loader.validateRules(rules)).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Chain rules validation failed: Invalid rule structure'));
        });
    });

    describe('sortChainsByPriority', () => {
        test('should sort chains by priority in ascending order', () => {
            const chains = [
                { name: 'Chain C', priority: 3 },
                { name: 'Chain A', priority: 1 },
                { name: 'Chain B', priority: 2 },
            ];
            const sortedChains = loader.sortChainsByPriority(chains);
            expect(sortedChains).toEqual([
                { name: 'Chain A', priority: 1 },
                { name: 'Chain B', priority: 2 },
                { name: 'Chain C', priority: 3 },
            ]);
        });

        test('should handle empty chains array', () => {
            const chains = [];
            const sortedChains = loader.sortChainsByPriority(chains);
            expect(sortedChains).toEqual([]);
        });
    });
});
