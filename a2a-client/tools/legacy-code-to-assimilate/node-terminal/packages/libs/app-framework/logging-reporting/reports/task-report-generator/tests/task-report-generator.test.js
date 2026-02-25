const { TaskReportGenerator } = require('../index');
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

// Мок-объект для FileSystemUtils (поскольку TaskReportGenerator использует fs.promises напрямую, это может быть не нужно, но для надежности)
const mockFileSystemUtils = {
    join: path.join,
    writeFile: fs.writeFile,
    mkdir: fs.mkdir,
    readdir: fs.readdir,
    rm: fs.rm,
    fileExists: async (filePath) => {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    },
};

describe('TaskReportGenerator', () => {
    let generator;
    const testWorkDir = path.join(__dirname, 'temp_test_reports');
    const chainRules = {
        'exit_codes': {
            0: 'SUCCESS',
            1: 'GENERAL_ERROR',
            4: 'SKIPPED',
            5: 'CRITICAL_ERROR',
            6: 'VALIDATION_FAILED',
            7: 'DEPENDENCY_ERROR',
        },
        'rules': [
            { 'chain_name': 'Chain With Stop Rule', 'on_error': 'stop' },
            { 'chain_name': 'Chain With Continue Rule', 'on_error': 'continue' },
        ],
    };

    beforeEach(async () => {
        generator = new TaskReportGenerator(mockLogger);
        jest.clearAllMocks();
        // Создаем тестовую директорию перед каждым тестом
        await fs.mkdir(testWorkDir, { recursive: true });
    });

    afterEach(async () => {
        // Очищаем тестовую директорию после каждого теста
        if (await mockFileSystemUtils.fileExists(testWorkDir)) {
            await fs.rm(testWorkDir, { recursive: true, force: true });
        }
    });

    const getReportPath = (chainName) => path.join(testWorkDir, `${chainName}-TASK-REPORT.md`);

    test('should generate a success report for a successful chain', async () => {
        const chainName = 'Successful Chain';
        const exitCode = 0;
        const chainOutput = { stdout: 'Success output', stderr: '' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(true);
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`# Отчет о выполнении задачи: ${chainName}`);
        expect(reportContent).toContain(`## Статус выполнения: ✅ Успешно (Код выхода: 0)`);
        expect(reportContent).toContain(`**Вывод STDOUT:**\n\`\`\`\nSuccess output\n\`\`\``);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName}`));
    });

    test('should generate an error report for a chain with general error', async () => {
        const chainName = 'Error Chain';
        const exitCode = 1;
        const chainOutput = { stdout: 'Some output', stderr: 'General error occurred' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(true); // Default is continue
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`## Статус выполнения: ❌ Ошибка (Код выхода: 1 - GENERAL_ERROR)`);
        expect(reportContent).toContain(`**Вывод STDERR:**\n\`\`\`\nGeneral error occurred\n\`\`\``);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName} with error`));
    });

    test('should generate a skipped report for a skipped chain', async () => {
        const chainName = 'Skipped Chain';
        const exitCode = 4;
        const chainOutput = { stdout: 'N/A', stderr: 'N/A' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(true);
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`## Статус выполнения: ⏭️ Пропущено (Код выхода: 4 - SKIPPED)`);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName} (SKIPPED)`));
    });

    test('should stop execution if chain has on_error: stop rule and fails', async () => {
        const chainName = 'Chain With Stop Rule';
        const exitCode = 1;
        const chainOutput = { stdout: '', stderr: 'Stop rule error' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(false);
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`## Статус выполнения: ❌ Ошибка (Код выхода: 1 - GENERAL_ERROR)`);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName} with error`));
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Rule for '${chainName}' dictates to STOP on error.`));
    });

    test('should continue execution if chain has on_error: continue rule and fails', async () => {
        const chainName = 'Chain With Continue Rule';
        const exitCode = 1;
        const chainOutput = { stdout: '', stderr: 'Continue rule error' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(true);
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`## Статус выполнения: ❌ Ошибка (Код выхода: 1 - GENERAL_ERROR)`);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName} with error`));
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Rule for '${chainName}' dictates to CONTINUE on error.`));
    });

    test('should handle critical error and stop execution', async () => {
        const chainName = 'Critical Error Chain';
        const exitCode = 5;
        const chainOutput = { stdout: '', stderr: 'Critical error occurred' };
        const continueExecution = await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        expect(continueExecution).toBe(false);
        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`## Статус выполнения: 💥 КРИТИЧЕСКАЯ ОШИБКА (Код выхода: 5 - CRITICAL_ERROR)`);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Task report generated for ${chainName} with CRITICAL_ERROR`));
    });

    test('should create work directory if it does not exist before generating report', async () => {
        await fs.rm(testWorkDir, { recursive: true, force: true }); // Удаляем директорию для теста
        const chainName = 'New Dir Chain';
        const exitCode = 0;
        const chainOutput = { stdout: 'Output', stderr: '' };
        await generator.processChainResult(chainName, exitCode, chainOutput, chainRules, testWorkDir);

        const reportPath = getReportPath(chainName);
        const reportContent = await fs.readFile(reportPath, 'utf8');
        expect(reportContent).toContain(`# Отчет о выполнении задачи: ${chainName}`);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`Creating report directory: ${testWorkDir}`));
    });
});
