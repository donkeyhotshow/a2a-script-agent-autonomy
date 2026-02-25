const os = require('os');
const path = require('path');
const { FileSystemUtils } = require('C:/apps/libs/app-framework/core/file-utils/file-system/index.js');

class SystemInfoCollector {
    constructor(logger = console) {
        this.fileSystem = new FileSystemUtils(logger);
        this.logger = logger;
    }

    /**
     * Получает детальную информацию об окружении
     */
    getEnvironmentInfo() {
        return {
            // Системная информация
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            username: os.userInfo().username,
            
            // Node.js информация
            nodeVersion: process.version,
            nodeExecPath: process.execPath,
            
            // Процесс
            pid: process.pid,
            cwd: process.cwd(),
            
            // Переменные окружения
            env: {
                NODE_ENV: process.env.NODE_ENV || 'development',
                PATH: process.env.PATH ? process.env.PATH.split(path.delimiter).slice(0, 3).join(path.delimiter) + '...' : 'N/A',
                USERPROFILE: process.env.USERPROFILE || process.env.HOME || 'N/A',
                TEMP: process.env.TEMP || process.env.TMP || 'N/A'
            },
            
            // Время
            startTime: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * Получает информацию о системе
     */
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            username: os.userInfo().username,
            homedir: os.homedir(),
            tmpdir: os.tmpdir(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };
    }

    /**
     * Получает информацию о Node.js
     */
    getNodeInfo() {
        return {
            version: process.version,
            execPath: process.execPath,
            pid: process.pid,
            cwd: process.cwd(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            env: {
                NODE_ENV: process.env.NODE_ENV || 'development',
                PATH: process.env.PATH ? process.env.PATH.split(path.delimiter).slice(0, 3).join(path.delimiter) + '...' : 'N/A',
                USERPROFILE: process.env.USERPROFILE || process.env.HOME || 'N/A',
                TEMP: process.env.TEMP || process.env.TMP || 'N/A'
            }
        };
    }

    /**
     * Получает информацию о переменных окружения
     */
    getEnvironmentVariables() {
        return {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PATH: process.env.PATH ? process.env.PATH.split(path.delimiter).slice(0, 3).join(path.delimiter) + '...' : 'N/A',
            USERPROFILE: process.env.USERPROFILE || process.env.HOME || 'N/A',
            TEMP: process.env.TEMP || process.env.TMP || 'N/A',
            PWD: process.env.PWD || process.cwd(),
            SHELL: process.env.SHELL || 'N/A',
            TERM: process.env.TERM || 'N/A'
        };
    }
}

export { SystemInfoCollector };
