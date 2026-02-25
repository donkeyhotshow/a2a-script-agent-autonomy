const path = require('path');
const { execSync } = require('child_process');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const { FileSystemUtils } = require('@libs/system/file-operations');

// --- Конфигурация по умолчанию для сервисов ---
const DEFAULT_SERVICE_CONFIGS = [
    {
        Name: "TestingTaskManager",
        DisplayName: "Testing Task Manager",
        ProjectPath: "C:/apps/root/testing/taskmanager",
        PackageJson: "package.json",
        MainFile: "daemon-cli.js",
        NodeVersion: "18.0.0",
        ProcessName: "node",
        ScriptArguments: "C:/apps/root/testing/taskmanager/daemon-cli.js",
        WorkingDirectory: "C:/apps/root/testing/taskmanager",
        ExpectedPort: 3013, // Предполагаемый порт для TestingTaskManager
        StatusPath: "/status"
    },
    {
        Name: "ProjectsManager",
        DisplayName: "Projects Manager",
        ProjectPath: "C:/apps/root/projects-manager",
        PackageJson: "package.json",
        MainFile: "app.js",
        ExpectedPort: 3012, // API демона на 3012
        NodeVersion: "16.0.0",
        ProcessName: "node",
        ScriptArguments: "app.js",
        WorkingDirectory: "C:/apps/root/projects-manager",
        StatusPath: "/status"
    }
];

let globalLogger = null;

function setGlobalLogger(loggerInstance) {
    globalLogger = loggerInstance;
}

/**
 * Функция для чтения порта из файла infrastructure.json
 */
async function getServicePortFromInfrastructure(projectPath) {
    const logger = globalLogger || new LoggingUtils();
    const fileSystem = FileSystemUtils(logger); // Corrected instantiation
    try {
        const infraPath = fileSystem.join(projectPath, 'data', 'infrastructure.json');
        if (await fileSystem.fileExists(infraPath)) {
            const infraData = await fileSystem.readFile(infraPath, 'utf8');
            const infraConfig = JSON.parse(infraData);
            if (infraConfig.infrastructure && infraConfig.infrastructure.master && infraConfig.infrastructure.master.port) {
                const port = infraConfig.infrastructure.master.port;
                logger.debug(`Порт ${port} успешно прочитан из ${infraPath}`);
                return port;
            }
        }
    } catch (error) {
        logger.warn(`Ошибка при чтении порта из infrastructure.json для пути ${projectPath}: ${error.message}`);
    }
    return null;
}

/**
 * Проверка доступности Node.js и npm
 */
function checkNodeNpmAvailability() {
    const logger = globalLogger || new LoggingUtils();
    const result = {
        success: true,
        errors: [],
        warnings: []
    };

    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        logger.info(`Node.js версия: ${nodeVersion}`);
    } catch (error) {
        result.errors.push(`Node.js не найден: ${error.message}`);
        result.success = false;
    }

    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        logger.info(`npm версия: ${npmVersion}`);
    } catch (error) {
        result.errors.push(`npm не найден: ${error.message}`);
        result.success = false;
    }

    return result;
}

// Экспортируем функции и константы
module.exports = {
    DEFAULT_SERVICE_CONFIGS,
    getServicePortFromInfrastructure,
    checkNodeNpmAvailability,
    setGlobalLogger,
    getRealServiceStatus: async (serviceConfig) => {
        // Заглушка - нужно перенести полную реализацию
        return {
            IsRunning: false,
            PID: null,
            PortStatus: 'unknown',
            NodeVersion: 'unknown',
            PackageJsonExists: false,
            MainFileExists: false,
            NodeModulesExist: false,
            Errors: [],
            Warnings: [],
            ProcessInfo: {}
        };
    },
    getDuplicateProcesses: (serviceConfig) => {
        // Заглушка - нужно перенести полную реализацию
        return [];
    },
    formatRealServiceReport: (reportData, overallStatus) => {
        let report = `# Отчет о состоянии сервисов\n\n`;
        report += `Статус: ${overallStatus}\n\n`;

        if (!reportData || reportData.length === 0) {
            report += 'Нет данных о сервисах.\n';
            return report;
        }

        reportData.forEach(service => {
            report += `### ${service.DisplayName || service.Name}\n`;
            report += `  - Статус: ${service.IsRunning ? 'Запущен' : 'Остановлен'}\n`;
            if (service.PID) report += `  - PID: ${service.PID}\n`;
            if (service.PortStatus) report += `  - Порт: ${service.PortStatus}\n`;
            if (service.NodeVersion) report += `  - Node.js: ${service.NodeVersion}\n`;
            if (service.PackageJsonExists !== undefined) report += `  - package.json: ${service.PackageJsonExists ? 'Есть' : 'Нет'}\n`;
            if (service.MainFileExists !== undefined) report += `  - Главный файл: ${service.MainFileExists ? 'Есть' : 'Нет'}\n`;
            if (service.NodeModulesExist !== undefined) report += `  - node_modules: ${service.NodeModulesExist ? 'Есть' : 'Нет'}\n`;

            if (service.Warnings && service.Warnings.length > 0) {
                report += `  - Предупреждения:\n`;
                service.Warnings.forEach(warning => report += `    - ${warning}\n`);
            }
            if (service.Errors && service.Errors.length > 0) {
                report += `  - Ошибки:\n`;
                service.Errors.forEach(error => report += `    - ${error}\n`);
            }
            report += `\n`;
        });

        return report;
    }
};
